require("dotenv").config();

const express = require("express");
const cors = require("cors");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const { connectRedis } = require("./redis");
const { checkBreach, getCacheStatus } = require("./hibp");
const { sendBreachAlertSMS, isSMSConfigured } = require("./sms");
const { isStripeConfigured, getPlans, createCheckoutSession, cancelSubscription, canAddEmail } = require("./payment");
const connectDB = require("./db");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/breachalert";
const JWT_SECRET = process.env.JWT_SECRET || "breachalert_secret";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

console.log("MONGO_URL =", MONGO_URL);

// ===== APP =====
const app = express();
// CORS - Restrict to frontend origins only (NOT open to all)
const corsOptions = {
  origin: ["http://localhost:3000", "https://breachalert-frontend.vercel.app"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// ===== CONNECT REDIS (optional) =====
connectRedis().then((connected) => {
  console.log(`Redis caching: ${connected ? "enabled" : "fallback to memory"}`);
});

// ===== DB CONNECT =====
connectDB();

// ===== USER MODEL =====
const breachEventSchema = new mongoose.Schema({
  breachName: String,
  domain: String,
  breachDate: String,
  dataClasses: [String],
  detectedAt: { type: Date, default: Date.now },
});

const monitoredEmailSchema = new mongoose.Schema({
  email: String,
  verified: { type: Boolean, default: false },
  verificationToken: String,
  lastBreachNames: [String],
  breachHistory: [breachEventSchema],
  addedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  phone: String,
  smsEnabled: { type: Boolean, default: false },
  tier: { type: String, default: "free" },
  monitoredEmails: [monitoredEmailSchema],
});

const User = mongoose.model("User", userSchema);

// ===== EMAIL SETUP =====
const transporter = EMAIL_USER && EMAIL_PASS ? nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
}) : {
  sendMail: async (mailOptions) => {
    console.log("Skipping email send because EMAIL_USER or EMAIL_PASS is not configured", mailOptions);
  },
};

function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function generateVerificationToken() {
  return crypto.randomBytes(20).toString("hex");
}

function breachAdvice(dataClasses) {
  const advice = new Set();

  if (dataClasses.includes("Passwords")) {
    advice.add("Change passwords immediately and use a password manager.");
  }
  if (dataClasses.some((c) => /credit|card|payment/i.test(c))) {
    advice.add("Freeze your credit and notify your card issuer.");
  }
  if (dataClasses.includes("Phone numbers")) {
    advice.add("Be cautious of SMS phishing and unexpected calls.");
  }
  if (dataClasses.includes("Email addresses")) {
    advice.add("Consider enabling multi-factor authentication everywhere.");
  }
  if (advice.size === 0) {
    advice.add("Review the breach details and change any affected credentials.");
  }

  return Array.from(advice).join(" ");
}

async function sendVerificationEmail(targetEmail, token) {
  const verifyUrl = `${BACKEND_URL}/confirm-email/${token}`;
  const text = `Please confirm monitoring for ${targetEmail} by clicking this link:\n\n${verifyUrl}\n\nIf you did not request this, ignore this message.`;

  try {
    await transporter.sendMail({
      from: EMAIL_USER || process.env.EMAIL_USER,
      to: targetEmail,
      subject: "Confirm your BreachAlert subscription",
      text,
    });
    console.log(`Verification email sent to ${targetEmail}`);
  } catch (err) {
    console.error("Verification email error:", err.message);
  }
}

async function sendAlertEmail(toEmail, breachedEmail, breaches) {
  const breachNames = breaches.map((b) => b.Name).join(", ");
  const dataClasses = [...new Set(breaches.flatMap((b) => b.DataClasses))];
  const advice = breachAdvice(dataClasses);
  const text = `Your monitored email ${breachedEmail} was found in a breach: ${breachNames}.\n\nData exposed: ${dataClasses.join(", ")}.\n\nRecommended action: ${advice}`;

  try {
    await transporter.sendMail({
      from: EMAIL_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: "⚠️ BreachAlert Alert: New breach detected",
      text,
    });
    console.log(`Alert email sent to ${toEmail}`);
  } catch (err) {
    console.error("Alert email error:", err.message);
  }
}

// ===== ROUTES =====

// Home
app.get("/", (req, res) => {
  res.send("BreachAlert API Running...");
});

// Status - Check cache and API status
app.get("/status", (req, res) => {
  res.json({
    ...getCacheStatus(),
  });
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.json({ message: "User exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed,
      monitoredEmails: [],
    });

    await user.save();

    res.json({ message: "User created" });

  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Add email
app.post("/add-email", auth, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = newEmail.toLowerCase();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    let monitored = user.monitoredEmails.find((item) => item.email === normalizedEmail);
    if (!monitored) {
      monitored = {
        email: normalizedEmail,
        verified: false,
        verificationToken: generateVerificationToken(),
        lastBreachNames: [],
      };
      user.monitoredEmails.push(monitored);
    } else if (monitored.verified) {
      return res.json({ message: "Email already monitored" });
    } else {
      monitored.verificationToken = generateVerificationToken();
    }
    await user.save();
    await sendVerificationEmail(normalizedEmail, monitored.verificationToken);
    res.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("Add email error:", err.message);
    res.status(500).json({ error: "Failed to add email" });
  }
});

app.get("/confirm-email/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ "monitoredEmails.verificationToken": token });
    if (!user) return res.status(400).send("Invalid or expired confirmation link.");
    const monitored = user.monitoredEmails.find((item) => item.verificationToken === token);
    if (!monitored) return res.status(400).send("Invalid or expired confirmation link.");
    monitored.verified = true;
    monitored.verificationToken = null;
    await user.save();
    res.send(`Email ${monitored.email} is now verified for monitoring.`);
  } catch (err) {
    console.error("Confirm email error:", err.message);
    res.status(500).send("Unable to confirm email.");
  }
});

app.get("/monitored-emails", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const monitoredEmails = user.monitoredEmails.map((item) => ({
      email: item.email,
      verified: item.verified,
      addedAt: item.addedAt,
    }));
    res.json({ monitoredEmails });
  } catch (err) {
    console.error("Monitored emails error:", err.message);
    res.status(500).json({ error: "Failed to load monitored emails" });
  }
});

// Scan
app.get("/scan", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const results = [];
    let changed = false;
    for (let item of user.monitoredEmails) {
      if (!item.verified) {
        results.push({ email: item.email, verified: false, breaches: [], breachHistory: item.breachHistory || [] });
        continue;
      }
      const breaches = await checkBreach(item.email);
      const breachNames = breaches.map((b) => b.Name).sort();
      const hasNew = breachNames.some((name) => !item.lastBreachNames?.includes(name));
      if (hasNew && breaches.length > 0) {
        await sendAlertEmail(user.email, item.email, breaches);
        // Send SMS if enabled
        if (user.smsEnabled && user.phone) {
          await sendBreachAlertSMS(user.phone, item.email, breaches);
        }
        item.lastBreachNames = breachNames;
        // Build breach history events
        const newEvents = breaches.map((b) => ({
          breachName: b.Name,
          domain: b.Domain,
          breachDate: b.BreachDate,
          dataClasses: b.DataClasses,
          detectedAt: new Date(),
        }));
        item.breachHistory = [...(item.breachHistory || []), ...newEvents];
        changed = true;
      }
      results.push({ email: item.email, verified: true, breaches, breachHistory: item.breachHistory || [] });
    }
    if (changed) {
      await user.save();
    }
    res.json({ results });
  } catch (err) {
    console.error("Scan error:", err.message);
    res.status(500).json({ error: "Scan failed" });
  }
});

// Update phone for SMS alerts
app.post("/update-phone", auth, async (req, res) => {
  try {
    const { phone, enableSMS } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    if (phone) {
      user.phone = phone;
    }
    if (typeof enableSMS === "boolean") {
      user.smsEnabled = enableSMS;
    }
    
    await user.save();
    res.json({ message: "Phone updated", smsEnabled: user.smsEnabled });
  } catch (err) {
    console.error("Update phone error:", err.message);
    res.status(500).json({ error: "Failed to update phone" });
  }
});

// Get available plans
app.get("/plans", (req, res) => {
  res.json({ plans: getPlans(), stripeConfigured: isStripeConfigured() });
});

// Create checkout session
app.post("/create-checkout", auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const successUrl = `${BACKEND_URL}/dashboard?upgrade=success`;
    const cancelUrl = `${BACKEND_URL}/dashboard?upgrade=cancelled`;
    
    const result = await createCheckoutSession(planId, null, successUrl, cancelUrl);
    
    if (result.success) {
      res.json({ url: result.url });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error("Checkout error:", err.message);
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

// Cancel subscription
app.post("/cancel-subscription", auth, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const result = await cancelSubscription(subscriptionId);
    
    if (result.success) {
      user.tier = "free";
      await user.save();
      res.json({ message: "Subscription cancelled" });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error("Cancel subscription error:", err.message);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Get users (DEBUG)
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Clear users (DEBUG)
app.get("/clear-users", async (req, res) => {
  try {
    await User.deleteMany({});
    res.send("All users deleted");
  } catch (err) {
    res.status(500).send("Error deleting users");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ===== CRON JOB =====
cron.schedule("0 3 * * *", async () => {
  try {
    const users = await User.find();

    for (let user of users) {
      let changed = false;
      for (let item of user.monitoredEmails) {
        if (!item.verified) continue;
        const breaches = await checkBreach(item.email);
        const breachNames = breaches.map((b) => b.Name).sort();
        const hasNew = breachNames.some((name) => !item.lastBreachNames?.includes(name));
        if (hasNew && breaches.length > 0) {
          await sendAlertEmail(user.email, item.email, breaches);
          item.lastBreachNames = breachNames;
          changed = true;
        }
      }
      if (changed) {
        await user.save();
      }
    }

  } catch (err) {
    console.error("Cron error:", err.message);
  }
});