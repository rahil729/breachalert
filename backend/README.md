# BreachAlert API Documentation

## Overview
BreachAlert is a security monitoring service that tracks email addresses for data breaches using the Have I Been Pwned (HIBP) API. The system provides email and SMS alerts when a monitored email is found in a breach.

## Base URL
```
http://localhost:5000
```

## Environment Variables
```env
# Required for production
MONGO_URL=mongodb://127.0.0.1:27017/breachalert
JWT_SECRET=your_secure_secret_key
HIBP_API_KEY=your_hibp_api_key

# Email configuration (optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
BACKEND_URL=http://localhost:5000

# Redis caching (optional)
REDIS_URL=redis://localhost:6379

# SMS alerts (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe payment (optional)
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_FAMILY_PRICE_ID=price_xxxx
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: <jwt_token>
```

## Endpoints

### Public Endpoints

#### POST /signup
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{ "message": "User created" }
```

#### POST /login
Login and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

#### GET /
Health check endpoint.

**Response:**
```
BreachAlert API Running...
```

#### GET /confirm-email/:token
Confirm email for monitoring. User clicks link in verification email.

**Response:**
```
Email user@example.com is now verified for monitoring.
```

### Protected Endpoints (require JWT)

#### GET /monitored-emails
Get list of monitored emails for the authenticated user.

**Headers:**
```
Authorization: <jwt_token>
```

**Response:**
```json
{
  "monitoredEmails": [
    { "email": "test@example.com", "verified": true, "addedAt": "2024-01-15T10:00:00Z" }
  ]
}
```

#### POST /add-email
Add a new email to monitor.

**Headers:**
```
Authorization: <jwt_token>
```

**Request:**
```json
{
  "newEmail": "newemail@example.com"
}
```

**Response:**
```json
{ "message": "Verification email sent" }
```

#### GET /scan
Scan all monitored emails for breaches.

**Headers:**
```
Authorization: <jwt_token>
```

**Response:**
```json
{
  "results": [
    {
      "email": "test@example.com",
      "verified": true,
      "breaches": [
        {
          "Name": "LinkedIn",
          "Domain": "linkedin.com",
          "BreachDate": "2012-05-05",
          "DataClasses": ["Email addresses", "Passwords"]
        }
      ],
      "breachHistory": [
        {
          "breachName": "LinkedIn",
          "domain": "linkedin.com",
          "breachDate": "2012-05-05",
          "dataClasses": ["Email addresses", "Passwords"],
          "detectedAt": "2024-01-15T10:00:00Z"
        }
      ]
    }
  ]
}
```

#### POST /update-phone
Update phone number for SMS alerts.

**Headers:**
```
Authorization: <jwt_token>
```

**Request:**
```json
{
  "phone": "+1234567890",
  "enableSMS": true
}
```

**Response:**
```json
{ "message": "Phone updated", "smsEnabled": true }
```

#### GET /status
Get cache and API status.

**Response:**
```json
{
  "cache": "memory",
  "cacheExpiry": 24,
  "hibpConfigured": true
}
```

#### GET /plans
Get available subscription plans.

**Response:**
```json
{
  "plans": [
    { "id": "free", "name": "Free", "price": 0, "maxEmails": 1 },
    { "id": "family", "name": "Family", "price": 9.99, "maxEmails": 5 }
  ],
  "stripeConfigured": true
}
```

#### POST /create-checkout
Create Stripe checkout session for plan upgrade.

**Headers:**
```
Authorization: <jwt_token>
```

**Request:**
```json
{ "planId": "family" }
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

## Rate Limiting

The system uses Redis caching with a 24-hour TTL to minimize HIBP API calls. Without a HIBP API key, the system returns mock data for testing.

## Caching Strategy

- **In-Memory Cache**: Default fallback, 24-hour TTL
- **Redis Cache**: When REDIS_URL is configured, uses Redis for distributed caching
- **Cache Key**: Email address (lowercase)

## Data Retention

- **Breach Results**: Stored temporarily in cache only
- **Breach History**: Stored in user document for timeline visualization
- **User Data**: Stored in MongoDB, hashed passwords

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized (invalid or missing token) |
| 404 | Not Found |
| 500 | Internal Server Error |

## Example Usage

### cURL
```bash
# Signup
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}' | jq -r '.token')

# Add email
curl -X POST http://localhost:5000/add-email \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newEmail":"test@example.com"}'

# Scan
curl -X GET http://localhost:5000/scan \
  -H "Authorization: $TOKEN"
```

### JavaScript
```javascript
const API = axios.create({ baseURL: 'http://localhost:5000' });

// Login
const { data } = await API.post('/login', { email, password });
localStorage.setItem('token', data.token);

// Add email & scan
const token = localStorage.getItem('token');
await API.post('/add-email', { newEmail: email }, { headers: { Authorization: token } });
const scanResult = await API.get('/scan', { headers: { Authorization: token } });
```

## Security Best Practices

1. **JWT Secret**: Use a strong, random secret in production
2. **HTTPS**: Enable HTTPS in production
3. **Rate Limiting**: Configure rate limiting for API endpoints
4. **Email Verification**: Always verify email ownership before monitoring
5. **Data Minimization**: Only collect necessary data

## License
ISC
