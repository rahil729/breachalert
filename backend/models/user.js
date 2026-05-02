const mongoose = require("mongoose");

const monitoredEmailSchema = new mongoose.Schema({
  email: String,
  verified: { type: Boolean, default: false },
  verificationToken: String,
  lastBreachNames: [String],
  addedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  monitoredEmails: [monitoredEmailSchema],
});

module.exports = mongoose.model("User", userSchema);