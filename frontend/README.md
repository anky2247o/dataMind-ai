# 🧠 DataMind AI — Intelligent Data Analyst Engine

> Paste any CSV, text, or data → get instant AI-powered insights, beautiful charts, trend detection, and predictions. No data science degree needed.

![DataMind AI](https://img.shields.io/badge/DataMind-AI%20Analyst-00FFB2?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask)
![Claude](https://img.shields.io/badge/Claude-AI-7B61FF?style=for-the-badge)

---

## ✨ Features

- 📊 **Auto Charts** — Matplotlib + Seaborn charts (bar, line, area, pie, scatter, heatmap, distribution)
- 🔍 **Key Insights** — Automatically detects patterns, correlations, and anomalies
- 📈 **Trend Detection** — Identifies increasing/decreasing trends across all columns
- 🔮 **AI Predictions** — Claude-powered forecasts based on your data
- 🌡️ **Correlation Heatmap** — Visual correlation matrix for all numeric columns
- 📦 **Outlier Detection** — IQR-based outlier flagging
- 📁 **File Upload** — Upload any `.csv`, `.txt`, or `.tsv` file
- 🤖 **Claude AI Fallback** — Works on text data too, not just CSV

---

## 🖥️ Tech Stack

### Frontend

| Technology            | Purpose                   |
| --------------------- | ------------------------- |
| React 18 + Vite       | UI framework              |
| Tailwind (inline CSS) | Styling                   |
| DM Mono + Syne fonts  | Typography                |
| Claude API            | AI text analysis fallback |

### Backend

| Technology   | Purpose                    |
| ------------ | -------------------------- |
| Python 3.11+ | Runtime                    |
| Flask        | REST API server            |
| Flask-CORS   | Cross-origin requests      |
| Pandas       | Data analysis engine       |
| NumPy        | Numerical computations     |
| Matplotlib   | Chart generation           |
| Seaborn      | Statistical visualizations |
| SciPy        | Advanced statistics        |

---

## 📁 Project Structure

```
dataMind/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment variables template
│   └── venv/                  # Python virtual environment (git ignored)
│
├── frontend/
│   ├── src/
│   │   ├── DataMind_AI_v3.jsx # Main app component
│   │   ├── App.jsx            # Root component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Global styles (empty)
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ → https://nodejs.org
- Python 3.11+ → https://python.org
- Anthropic API key → https://console.anthropic.com

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/datamind-ai.git
cd datamind-ai
```

### 2. Set up Python backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux

# Start backend
python app.py
```

Backend runs at → http://localhost:5000

### 3. Set up React frontend

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Add your API key in src/DataMind_AI_v3.jsx
# Find: "YOUR_API_KEY_HERE"
# Replace with your actual key from console.anthropic.com

# Start frontend
npm run dev
```

Frontend runs at → http://localhost:5173 or http://localhost:5174

### 4. Open in browser

```
http://localhost:5173
```

---

## 🔑 Environment Variables

Create a `.env` file in the `backend/` folder:

```env
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
```

For the frontend, add your Anthropic API key directly in `src/DataMind_AI_v3.jsx`:

```js
"x-api-key": "sk-ant-YOUR-KEY-HERE",
```

> ⚠️ **Never commit your API key to git.** The `.gitignore` is set up to protect `.env` files.

---

## 📊 API Endpoints

### `GET /health`

Check if backend is running.

```json
{
  "status": "ok",
  "matplotlib": true,
  "seaborn": true,
  "scipy_available": true
}
```

### `POST /analyze`

Analyze CSV data.

**Request:**

```json
{
  "csv": "Month,Sales,Profit\nJan,5000,1200\nFeb,6200,1500"
}
```

**Response:**

```json
{
  "title": "Analysis: Month, Sales, Profit",
  "summary": "Dataset with 2 rows analyzed...",
  "insights": ["Dataset has 2 rows...", "Strong positive correlation..."],
  "predictions": ["Sales trending upward..."],
  "anomalies": [],
  "recommendation": "Focus on Sales vs Profit (r=0.99)",
  "sentiment": "positive",
  "chartType": "bar",
  "charts": {
    "main": "data:image/png;base64,...",
    "heatmap": "data:image/png;base64,...",
    "distribution": "data:image/png;base64,..."
  },
  "stats": {
    "shape": {"rows": 2, "cols": 3},
    "top_correlations": [...],
    "trends": [...],
    "outliers": {}
  }
}
```

---

## 🧪 Testing

### Test with sample data

Click the sample buttons in the UI:

- 📦 **Sales** — Monthly revenue/units/profit data
- 🌡️ **Climate** — City temperature/humidity/rainfall
- 📱 **App Metrics** — Weekly user growth data

### Test the API directly

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"csv": "Month,Sales\nJan,5000\nFeb,6200\nMar,7100"}'
```

---

## 🌐 Deployment

### Frontend → Vercel (Free)

```bash
cd frontend
npm install -g vercel
vercel
```

### Backend → Render (Free)

1. Push to GitHub
2. Go to render.com → New Web Service
3. Connect your repo, select `backend/` folder
4. Set start command: `pip install -r requirements.txt && python app.py`
5. Copy the public URL → update `BACKEND_URL` in your JSX file

---

## 💰 Monetization

This app is built to be sold. Options:

| Model             | Platform      | Price Suggestion |
| ----------------- | ------------- | ---------------- |
| One-time sale     | Gumroad       | $19–$49          |
| SaaS subscription | Stripe        | $9–$19/month     |
| Lifetime deal     | AppSumo       | $49–$99          |
| Freelance service | Upwork/Fiverr | $50–$200/report  |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and sell.

---

## 👤 Author

Built with ❤️ using Python, React, and Claude AI.

---

## 🙏 Acknowledgements

- [Anthropic Claude](https://anthropic.com) — AI insights engine
- [Matplotlib](https://matplotlib.org) — Chart generation
- [Seaborn](https://seaborn.pydata.org) — Statistical visualizations
- [Pandas](https://pandas.pydata.org) — Data analysis
- [Flask](https://flask.palletsprojects.com) — Backend API
