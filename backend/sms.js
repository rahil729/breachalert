/**
 * SMS Alert Service using Twilio
 * Sends SMS notifications for breach alerts
 */

const twilio = require("twilio");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are provided
let client = null;
let isConfigured = false;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    isConfigured = true;
    console.log("SMS service: Twilio configured");
  } catch (err) {
    console.error("Twilio initialization error:", err.message);
  }
} else {
  console.log("SMS service: Not configured (missing Twilio credentials)");
}

/**
 * Check if SMS is configured
 */
function isSMSConfigured() {
  return isConfigured;
}

/**
 * Send SMS alert
 * @param {string} toPhone - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise<object>} - Send result
 */
async function sendSMS(toPhone, message) {
  if (!isConfigured) {
    console.log(`SMS skipped (not configured): ${toPhone} - ${message}`);
    return { success: false, error: "SMS not configured" };
  }

  if (!toPhone) {
    return { success: false, error: "Phone number required" };
  }

  // Format phone number
  let formattedPhone = toPhone.replace(/[^\d+]/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+" + formattedPhone;
  }

  try {
    const result = await client.messages.create({
      body: message,
      to: formattedPhone,
      from: TWILIO_PHONE_NUMBER,
    });
    
    console.log(`SMS sent to ${formattedPhone}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error("SMS send error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send breach alert SMS
 * @param {string} toPhone - Recipient phone
 * @param {string} breachedEmail - Email that was breached
 * @param {Array} breaches - List of breaches
 */
async function sendBreachAlertSMS(toPhone, breachedEmail, breaches) {
  const breachNames = breaches.map((b) => b.Name).join(", ");
  const message = `⚠️ BreachAlert: ${breachedEmail} found in ${breaches.length} breach(es): ${breachNames}. Check email for details.`;
  
  return sendSMS(toPhone, message);
}

/**
 * Send verification SMS
 * @param {string} toPhone - Recipient phone
 * @param {string} code - Verification code
 */
async function sendVerificationSMS(toPhone, code) {
  const message = `BreachAlert: Your verification code is ${code}.`;
  return sendSMS(toPhone, message);
}

module.exports = {
  isSMSConfigured,
  sendSMS,
  sendBreachAlertSMS,
  sendVerificationSMS,
};
