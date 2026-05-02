/**
 * Stripe Payment Integration
 * Handles subscription tiers and payment processing
 */

const stripe = require("stripe");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe only if key is provided
let stripeClient = null;
let isConfigured = false;

if (STRIPE_SECRET_KEY) {
  try {
    stripeClient = stripe(STRIPE_SECRET_KEY);
    isConfigured = true;
    console.log("Payment service: Stripe configured");
  } catch (err) {
    console.error("Stripe initialization error:", err.message);
  }
} else {
  console.log("Payment service: Not configured (missing STRIPE_SECRET_KEY)");
}

// Subscription plans
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxEmails: 1,
    features: ["1 email", "Manual scans", "Email alerts"],
  },
  family: {
    name: "Family",
    price: 9.99,
    maxEmails: 5,
    stripePriceId: process.env.STRIPE_FAMILY_PRICE_ID,
    features: ["5 emails", "Daily auto scans", "Email + SMS alerts", "Priority support"],
  },
};

/**
 * Check if Stripe is configured
 */
function isStripeConfigured() {
  return isConfigured;
}

/**
 * Get available plans
 */
function getPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    ...plan,
  }));
}

/**
 * Get plan by ID
 */
function getPlan(planId) {
  return PLANS[planId] || null;
}

/**
 * Create Stripe Checkout session
 */
async function createCheckoutSession(planId, customerId, successUrl, cancelUrl) {
  if (!isConfigured || !stripeClient) {
    return { success: false, error: "Stripe not configured" };
  }

  const plan = PLANS[planId];
  if (!plan || !plan.stripePriceId) {
    return { success: false, error: "Invalid plan" };
  }

  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { success: true, sessionId: session.id, url: session.url };
  } catch (err) {
    console.error("Checkout session error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Create customer
 */
async function createCustomer(email, name) {
  if (!isConfigured || !stripeClient) {
    return { success: false, error: "Stripe not configured" };
  }

  try {
    const customer = await stripeClient.customers.create({
      email,
      name,
    });

    return { success: true, customerId: customer.id };
  } catch (err) {
    console.error("Create customer error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get subscription
 */
async function getSubscription(subscriptionId) {
  if (!isConfigured || !stripeClient) {
    return null;
  }

  try {
    return await stripeClient.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    console.error("Get subscription error:", err.message);
    return null;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
  if (!isConfigured || !stripeClient) {
    return { success: false, error: "Stripe not configured" };
  }

  try {
    const subscription = await stripeClient.subscriptions.cancel(subscriptionId);
    return { success: true, subscription };
  } catch (err) {
    console.error("Cancel subscription error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if user can add more emails based on tier
 */
function canAddEmail(currentCount, tier) {
  const plan = PLANS[tier] || PLANS.free;
  return currentCount < plan.maxEmails;
}

module.exports = {
  isStripeConfigured,
  getPlans,
  getPlan,
  createCheckoutSession,
  createCustomer,
  getSubscription,
  cancelSubscription,
  canAddEmail,
  PLANS,
};
