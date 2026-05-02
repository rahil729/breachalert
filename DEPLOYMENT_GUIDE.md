# Deployment Guide - Free Services

## Architecture
- **Frontend**: Vercel (free, auto-deploys from Git)
- **Backend API**: Render.com (free Node.js hosting)
- **Database**: MongoDB Atlas (free cluster)
- **Email**: Gmail (free, with app password)
- **SMS**: Twilio (paid, but can be disabled for free usage)

---

## Step 1: Push to GitHub

```bash
# Create a new repository on GitHub, then:
cd breachalert
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/breachalert.git
git push -u origin main
```

---

## Step 2: Setup MongoDB (Free Database)

1. Go to https://www.mongodb.com/atlas/database
2. Create a free account
3. Create a free cluster (M0)
4. Create a database user (username/password)
5. Network access: Allow All IPs (0.0.0.0/0)
6. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/breachalert?retryWrites=true&w=majority
   ```

---

## Step 3: Deploy Backend to Render (Free)

1. Go to https://dashboard.render.com
2. Create new Web Service
3. Connect your GitHub repository
4. Settings:
   - Name: breachalert-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: node backend/index.js
   - Free instance type

5. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/breachalert?retryWrites=true&w=majority
   JWT_SECRET=your_secure_random_secret
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://breachalert-api.onrender.com
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

---

## Step 4: Deploy Frontend to Vercel (Free)

1. Go to https://vercel.com
2. Import from GitHub
3. Select the repository
4. Settings:
   - Framework Preset: Create React App
   - Build Command: npm run build
   - Output Directory: frontend/build

5. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://breachalert-api.onrender.com
   ```

6. Update API base URL in frontend/src/api.js:
   ```javascript
   const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
   ```

---

## Step 5: Configure Gmail (Free Email Alerts)

1. Enable 2-Factor Authentication on Google
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password
4. Use that 16-character password as EMAIL_PASS

---

## Optional: Setup Stripe (For Paid Plans)

1. Go to https://dashboard.stripe.com
2. Create test account
3. Get API keys and add to backend environment variables

---

## Optional: Setup Twilio (For SMS Alerts)

1. Go to https://www.twilio.com
2. Get trial/paid account
3. Add credentials to environment variables

---

## Quick Deploy Commands

### Backend (Render)
```bash
# Install Render CLI
npm install -g render-cli

# Deploy
render-cli deploy create --name breachalert-api --service-type web --repo https://github.com/YOUR_USERNAME/breachalert.git
```

### Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

---

## Troubleshooting

### Backend Issues
- Check logs on Render dashboard
- Ensure MONGO_URL is correct
- Check CORS settings match frontend URL

### Frontend Issues
- Check Vercel deployment logs
- Ensure REACT_APP_API_URL points to correct backend
- CORS may need to be updated in backend/index.js
