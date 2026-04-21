# 🚀 Deployment Guide

## Deploy to Vercel (Free)

This dashboard is ready to deploy to Vercel for **free**!

### Step 1: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New" → "Project"
4. Select this repository: `polymarket-dashboard`
5. Click "Import"

### Step 2: Add Environment Variable

Before deploying, you need to add your Falcon API key:

1. In the Vercel project setup, scroll to "Environment Variables"
2. Add a new variable:
   - **Name**: `FALCON_API_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full API key)
3. Click "Add"

### Step 3: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for the build to complete
3. Your dashboard will be live at: `https://your-project-name.vercel.app`

### Step 4: Test

Once deployed:
1. Visit your live URL
2. The dashboard should automatically load Polymarket markets
3. Data refreshes every 30 seconds

## Troubleshooting

### "Environment variable missing" error
- Make sure you added `FALCON_API_KEY` in Vercel settings
- Go to Project Settings → Environment Variables
- Redeploy after adding the variable

### "Failed to fetch" error
- Check that your Falcon API key is valid
- The key should start with `eyJ`
- Make sure there are no extra spaces in the key

### Build errors
- Vercel automatically installs dependencies
- Next.js should build without any additional configuration
- Check the build logs in Vercel dashboard

## Alternative: Local Development

To run locally:

```bash
# Clone the repo
git clone https://github.com/blackhistoryig/polymarket-dashboard.git
cd polymarket-dashboard

# Install dependencies
npm install

# Create .env.local file
echo "FALCON_API_KEY=your_api_key_here" > .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## What's Next?

Once deployed, you can:
- ✅ View live Polymarket markets
- ✅ Auto-refresh data every 30 seconds  
- ✅ Access from any device
- 🔜 Add more Falcon API endpoints (trades, leaderboards, etc.)
- 🔜 Customize the UI and add charts

---

**Your dashboard is now live and will automatically update with real Polymarket data from the Falcon API! 🎉**
