const axios = require("axios");
const { getCache, setCache, deleteCache, isRedisConnected } = require("./redis");

const HIBP_API_KEY = process.env.HIBP_API_KEY;

/**
 * Get cache key for an email
 * @param {string} email - Email address
 * @returns {string} - Cache key
 */
function getCacheKey(email) {
  return `hibp:breaches:${email.toLowerCase()}`;
}

/**
 * Fetch breaches from HaveIBeenPwned API
 * @param {string} email - Email address to check
 * @returns {Promise<Array>} - Array of breach objects
 */
async function fetchHibpBreaches(email) {
  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;

  const response = await axios.get(url, {
    headers: {
      "hibp-api-key": HIBP_API_KEY,
      "user-agent": "BreachAlertApp",
    },
    validateStatus: (status) => status === 200 || status === 404,
  });

  if (response.status === 404) {
    return [];
  }

  return response.data.map((breach) => ({
    Name: breach.Name,
    Domain: breach.Domain,
    BreachDate: breach.BreachDate,
    DataClasses: breach.DataClasses || [],
  }));
}

/**
 * Check if email has been in any breach
 * Uses Redis caching with 24-hour TTL
 * @param {string} email - Email address to check
 * @returns {Promise<Array>} - Array of breach objects
 */
async function checkBreach(email) {
  const cacheKey = getCacheKey(email);

  // Check cache first
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${email}`);
    return cached;
  }

  let breaches = [];

  if (HIBP_API_KEY) {
    try {
      breaches = await fetchHibpBreaches(email);
    } catch (err) {
      console.error("HIBP lookup error:", err.message);
      breaches = [];
    }
  } else {
    // Mock data when no API key (development mode)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockBreaches = [
      {
        Name: "LinkedIn",
        Domain: "linkedin.com",
        BreachDate: "2012-05-05",
        DataClasses: ["Email addresses", "Passwords"],
      },
      {
        Name: "Facebook",
        Domain: "facebook.com",
        BreachDate: "2019-04-01",
        DataClasses: ["Email addresses", "Phone numbers"],
      },
      {
        Name: "Twitter",
        Domain: "twitter.com",
        BreachDate: "2021-01-01",
        DataClasses: ["Email addresses", "Usernames"],
      },
    ];

    // Only return mock breaches for test/hack emails
    if (email.includes("test") || email.includes("hack")) {
      breaches = mockBreaches;
    }
  }

  // Cache the results for 24 hours
  await setCache(cacheKey, breaches);

  return breaches;
}

/**
 * Clear cache for a specific email
 * @param {string} email - Email address
 */
async function clearCache(email) {
  const cacheKey = getCacheKey(email);
  await deleteCache(cacheKey);
}

/**
 * Get cache status
 */
function getCacheStatus() {
  return {
    redisConnected: isRedisConnected(),
    cachingEnabled: true,
  };
}

module.exports = {
  checkBreach,
  clearCache,
  getCacheStatus,
};
