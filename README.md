# 📊 Polymarket Live Dashboard

A beautiful, real-time dashboard for tracking Polymarket prediction markets. Built with HTML, CSS, and vanilla JavaScript - no frameworks required!

## 🌟 Features

- **Real-time Data**: Auto-refreshes every 30 seconds
- **Clean UI**: Modern gradient design with smooth animations
- **Market Stats**: Track total markets, volume, and active traders
- **Hot Markets**: View the most active prediction markets
- **Responsive**: Works on desktop, tablet, and mobile
- **Zero Dependencies**: Pure vanilla JavaScript

## 🚀 Live Demo

**Visit the dashboard**: [https://blackhistoryig.github.io/polymarket-dashboard/](https://blackhistoryig.github.io/polymarket-dashboard/)

## 📋 About CORS Limitations

Due to Cross-Origin Resource Sharing (CORS) policies, the Polymarket API cannot be accessed directly from GitHub Pages. This is a security feature of web browsers.

### Solutions:

1. **Local Development**: Clone this repo and run it with a local server:
   ```bash
   # Clone the repository
   git clone https://github.com/blackhistoryig/polymarket-dashboard.git
   cd polymarket-dashboard
   
   # Run with Python
   python -m http.server 8000
   # OR with Node.js
   npx http-server
   
   # Open http://localhost:8000
   ```

2. **CORS Proxy**: Use a CORS proxy service (for development only)
3. **Backend API**: Create a backend service that fetches data and serves it to your frontend

## 🛠️ Technical Details

### API Endpoints Used
- Polymarket CLOB API: `https://clob.polymarket.com/markets`
- Alternative: `https://gamma-api.polymarket.com/markets`

### Technologies
- HTML5
- CSS3 (Flexbox, Grid, Gradients, Animations)
- JavaScript (ES6+, Fetch API, Async/Await)

## 📦 Project Structure

```
polymarket-dashboard/
├── index.html          # Main dashboard file
└── README.md          # This file
```

## 🎨 Customization

The dashboard is easy to customize:

1. **Colors**: Edit the CSS gradient in the `body` style
2. **Refresh Rate**: Change the `setInterval` value (default: 30000ms)
3. **Market Limit**: Modify the `limit` parameter in the API URL

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

This project is open source and available under the MIT License.

## 🔗 Resources

- [Polymarket Official Site](https://polymarket.com/)
- [Polymarket API Documentation](https://docs.polymarket.com/)
- [CLOB API](https://docs.polymarket.com/#clob-api)

## ⭐ Show Your Support

If you find this project useful, please consider giving it a star!

## 🚀 Quick Deploy to Vercel (FREE)

The easiest way to deploy this dashboard is using Vercel's free hosting:

### Step 1: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New"** → **"Project"**
3. Import this GitHub repository: `blackhistoryig/polymarket-dashboard`
4. Vercel will auto-detect it as a Next.js app

### Step 2: Configure Environment Variables

Before deploying, add your API key:

1. In the Vercel project settings, go to **"Environment Variables"**
2. Add: `FALCON_API_KEY` = `your-api-key-here`
3. Click **"Deploy"**

### Step 3: Done! 🎉

Your dashboard will be live at: `https://your-project.vercel.app`

---

**Note**: The backend API proxy (`/api/markets.js`) automatically handles CORS and keeps your API key secure on the server side.

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Built with ❤️ for the Polymarket community**
