import { useState, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BACKEND_URL = "https://datamind-ai.onrender.com"; // Python Flask backend
const USE_BACKEND = true; // Set false to use Claude API only

const C = {
  bg: "#0A0A0F", panel: "#111118", border: "#1E1E2E",
  accent: "#00FFB2", accent2: "#7B61FF", accent3: "#FF6B6B",
  text: "#E8E8F0", muted: "#6B6B80",
  chart: ["#00FFB2", "#7B61FF", "#FF6B6B", "#FFB800", "#00C8FF", "#FF61D8"],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseCSVish(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(/,|\t/).map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(/,|\t/).map(v => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => {
      const n = parseFloat(vals[i]);
      obj[h] = isNaN(n) ? vals[i] : n;
    });
    return obj;
  });
  return { headers, rows };
}

function guessAxes(headers) {
  const catHints = ["name", "month", "year", "date", "category", "label", "type", "region", "city", "product"];
  let xKey = headers[0];
  headers.forEach(h => {
    if (catHints.some(hint => h.toLowerCase().includes(hint))) xKey = h;
  });
  const yKeys = headers.filter(h => h !== xKey).slice(0, 3);
  return { xKey, yKeys };
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

// Call Python backend (Lux + Pandas)
async function analyzeWithPython(csvText, query) {
  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv: csvText, query }),
  });
  if (!response.ok) throw new Error("Backend error: " + response.status);
  return response.json();
}

// Fallback: Call Claude API
async function analyzeWithClaude(userInput) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are DataMind AI. Return ONLY raw JSON, no markdown:
{
  "title": "dataset title",
  "summary": "2-3 sentence summary",
  "insights": ["insight1","insight2","insight3","insight4"],
  "predictions": ["pred1","pred2","pred3"],
  "anomalies": ["anomaly1"],
  "recommendation": "one bold action",
  "chartType": "line|bar|area|pie|scatter",
  "sentiment": "positive|negative|neutral|mixed"
}`,
      messages: [{ role: "user", content: userInput }],
    }),
  });
  const data = await response.json();
  const raw = data.content?.map(b => b.text || "").join("") || "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─── CHART ────────────────────────────────────────────────────────────────────
function ChartPanel({ chartType, chartData, axes }) {
  const { xKey, yKeys } = axes;
  const h = 260;
  if (!chartData.length || !yKeys.length) return (
    <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 32, opacity: 0.2 }}>◈</div>
      <div style={{ fontSize: 13 }}>No tabular data — paste CSV to see chart</div>
    </div>
  );

  const tipStyle = { background: C.panel, border: `1px solid ${C.border}`, color: C.text };
  const common = { data: chartData, margin: { top: 10, right: 20, left: -10, bottom: 5 } };

  if (chartType === "pie") {
    const pieData = chartData.slice(0, 8).map(r => ({
      name: String(r[xKey] ?? "?"), value: Number(r[yKeys[0]] ?? 0)
    }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {pieData.map((_, i) => <Cell key={i} fill={C.chart[i % C.chart.length]} />)}
          </Pie>
          <Tooltip contentStyle={tipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ScatterChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey={xKey} stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <YAxis stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <Tooltip contentStyle={tipStyle} />
          <Scatter data={chartData} fill={C.accent} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart {...common}>
          <defs>{yKeys.map((k, i) => (
            <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.chart[i % C.chart.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={C.chart[i % C.chart.length]} stopOpacity={0} />
            </linearGradient>
          ))}</defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey={xKey} stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <YAxis stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <Tooltip contentStyle={tipStyle} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
          {yKeys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k}
              stroke={C.chart[i % C.chart.length]} fill={`url(#g${i})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey={xKey} stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <YAxis stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
          <Tooltip contentStyle={tipStyle} />
          <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
          {yKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={C.chart[i % C.chart.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart {...common}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey={xKey} stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
        <YAxis stroke={C.muted} tick={{ fontSize: 11, fill: C.muted }} />
        <Tooltip contentStyle={tipStyle} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
        {yKeys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k}
            stroke={C.chart[i % C.chart.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
const Tag = ({ color, children }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: 1, textTransform: "uppercase"
  }}>{children}</span>
);

function LuxPanel({ lux }) {
  if (!lux) return null;
  if (!lux.available) return (
    <div style={{
      background: "#FFB80011", border: "1px solid #FFB80033",
      borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#FFB800", marginTop: 16
    }}>
      ⚠ Lux not active — run <code style={{ background: C.bg, padding: "1px 6px", borderRadius: 3 }}>pip install lux-api</code> and restart the backend for Lux auto-recommendations.
      {lux.error && <div style={{ marginTop: 6, opacity: 0.7 }}>Error: {lux.error}</div>}
    </div>
  );

  const cats = lux.categories || {};
  if (Object.keys(cats).length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
        ◈ LUX AUTO-RECOMMENDATIONS
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {Object.entries(cats).map(([cat, recs]) => (
          <div key={cat} style={{
            background: C.bg, border: `1px solid ${C.accent2}33`,
            borderLeft: `3px solid ${C.accent2}`,
            borderRadius: 8, padding: "12px 16px"
          }}>
            <div style={{ fontSize: 11, color: C.accent2, letterSpacing: 1, marginBottom: 8 }}>
              {cat.toUpperCase()}
            </div>
            {recs.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                • Chart type: <span style={{ color: C.text }}>{r.mark}</span>
                {r.score > 0 && <span style={{ color: C.accent, marginLeft: 8 }}>score: {r.score.toFixed(2)}</span>}
                {r.intent?.map((intent, j) => (
                  <span key={j} style={{ color: C.muted, marginLeft: 8 }}>
                    [{intent.attribute || ""}{intent.channel ? ` → ${intent.channel}` : ""}]
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Shape */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          ["Rows", stats.shape?.rows],
          ["Columns", stats.shape?.cols],
          ["Numeric Cols", stats.numeric_columns?.length],
          ["Categorical Cols", stats.categorical_columns?.length],
        ].map(([label, val]) => (
          <div key={label} style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 16px", textAlign: "center", flex: 1, minWidth: 80
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, fontFamily: "'Syne',sans-serif" }}>
              {val ?? "—"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Top Correlations */}
      {stats.top_correlations?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>TOP CORRELATIONS</div>
          {stats.top_correlations.slice(0, 3).map((c, i) => {
            const strength = Math.abs(c.correlation);
            const color = strength > 0.7 ? C.accent : strength > 0.4 ? C.accent2 : C.muted;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: C.bg, borderRadius: 8, padding: "10px 14px",
                border: `1px solid ${C.border}`, marginBottom: 6
              }}>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <span style={{ color: C.text }}>{c.col1}</span>
                  <span style={{ color: C.muted, margin: "0 8px" }}>↔</span>
                  <span style={{ color: C.text }}>{c.col2}</span>
                </div>
                <div style={{ background: color + "22", color, padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                  r = {c.correlation}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trends */}
      {stats.trends?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>TRENDS</div>
          {stats.trends.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.bg, borderRadius: 8, padding: "10px 14px",
              border: `1px solid ${C.border}`, marginBottom: 6, fontSize: 12
            }}>
              <span style={{ color: C.text }}>{t.column}</span>
              <span style={{ color: t.change_pct > 0 ? C.accent : C.accent3 }}>
                {t.direction} {Math.abs(t.change_pct)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Outliers */}
      {Object.keys(stats.outliers || {}).length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>OUTLIERS</div>
          {Object.entries(stats.outliers).map(([col, count]) => (
            <div key={col} style={{
              background: C.accent3 + "11", border: `1px solid ${C.accent3}33`,
              borderRadius: 8, padding: "8px 14px", marginBottom: 6, fontSize: 12,
              display: "flex", justifyContent: "space-between"
            }}>
              <span style={{ color: C.text }}>{col}</span>
              <span style={{ color: C.accent3 }}>{count} outlier{count > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SAMPLES ──────────────────────────────────────────────────────────────────
const SAMPLES = [
  {
    label: "📦 Sales",
    text: "Month,Revenue,Units,Profit\nJan,45000,320,12000\nFeb,52000,380,15000\nMar,48000,340,13500\nApr,61000,420,18000\nMay,70000,510,22000\nJun,65000,480,20000\nJul,78000,570,25000\nAug,82000,600,28000\nSep,74000,540,24000\nOct,90000,650,31000\nNov,95000,700,34000\nDec,110000,800,40000"
  },
  {
    label: "🌡️ Climate",
    text: "City,Temp_C,Humidity,Rainfall_mm\nLondon,12,78,600\nParis,14,72,550\nBerlin,11,75,580\nMadrid,18,55,400\nRome,17,62,480\nAthens,20,58,350\nStockholm,8,80,650\nAmsterdam,13,76,620"
  },
  {
    label: "📱 App Metrics",
    text: "Week,Active_Users,New_Signups,Churn_Rate\n1,1200,150,2.1\n2,1350,180,1.9\n3,1500,210,1.7\n4,1680,240,1.5\n5,1900,290,1.4\n6,2100,310,1.2\n7,2350,360,1.1\n8,2600,400,1.0"
  }
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DataMindAI() {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState("unknown"); // "ok"|"down"|"unknown"
  const [chartData, setChartData] = useState([]);
  const [axes, setAxes] = useState({ xKey: "", yKeys: [] });
  const [activeTab, setActiveTab] = useState("insights");
  const fileRef = useRef();

  // Check if backend is alive
  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) { setBackendStatus("ok"); return true; }
    } catch { }
    setBackendStatus("down");
    return false;
  }, []);

  const handleAnalyze = useCallback(async (text) => {
    const src = text || input;
    if (!src.trim()) return;
    setLoading(true); setError(""); setAnalysis(null); setChartData([]);
    setActiveTab("insights");

    try {
      const parsed = parseCSVish(src);
      let result;

      if (USE_BACKEND && parsed) {
        const alive = await checkBackend();
        if (alive) {
          // Use Python Lux + Pandas backend
          result = await analyzeWithPython(src, "");
        } else {
          // Fallback to Claude
          result = await analyzeWithClaude(src);
        }
      } else {
        result = await analyzeWithClaude(src);
      }

      setAnalysis(result);

      if (parsed) {
        setChartData(parsed.rows.slice(0, 30));
        setAxes(guessAxes(parsed.headers));
      }
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  }, [input, checkBackend]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setInput(ev.target.result); handleAnalyze(ev.target.result); };
    reader.readAsText(file);
  };

  const sentimentColor = { positive: C.accent, negative: C.accent3, neutral: C.muted, mixed: C.accent2 };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'DM Mono', 'Courier New', monospace",
      paddingBottom: 60,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        textarea:focus { outline: none; }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        .pulse { animation: pulse 2s ease infinite; }
        .chip:hover { background: ${C.accent}33 !important; color: ${C.accent} !important; }
        .btn:hover { transform: translateY(-1px); opacity: 0.9; }
        .tab:hover { color: ${C.text} !important; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: C.panel, borderBottom: `1px solid ${C.border}`,
        padding: "18px 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}>◈</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>
              Data<span style={{ color: C.accent }}>Mind</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2 }}>AI ANALYST ENGINE</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {backendStatus === "ok" && <Tag color={C.accent}>🐍 Lux Backend Active</Tag>}
          {backendStatus === "down" && <Tag color={C.accent3}>⚠ Backend Offline → Claude Fallback</Tag>}
          <Tag color={C.accent2}>v2.0</Tag>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* INPUT */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
            ▸ INPUT — PASTE CSV, TEXT, OR DESCRIBE YOUR DATA
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={"Paste CSV data here...\n\nMonth,Sales,Profit\nJan,5000,1200\nFeb,6200,1500\n...\n\nOr paste any text/numbers for AI analysis"}
            style={{
              width: "100%", minHeight: 130, background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, padding: "12px 14px",
              resize: "vertical", lineHeight: 1.6, fontFamily: "'DM Mono',monospace",
            }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>Try:</span>
            {SAMPLES.map(s => (
              <button key={s.label} className="chip"
                onClick={() => { setInput(s.text); handleAnalyze(s.text); }}
                style={{
                  background: C.border, border: `1px solid ${C.border}`, color: C.muted,
                  borderRadius: 20, padding: "4px 12px", fontSize: 12,
                  transition: "all 0.2s", fontFamily: "'DM Mono',monospace",
                }}>{s.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn"
              onClick={() => handleAnalyze()}
              disabled={loading || !input.trim()}
              style={{
                background: loading ? C.border : C.accent, color: loading ? C.muted : "#000",
                border: "none", borderRadius: 8, padding: "10px 24px",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                opacity: !input.trim() ? 0.4 : 1, fontFamily: "'DM Mono',monospace",
              }}>
              {loading ? "◌ Analyzing..." : "▶ Analyze"}
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}
              style={{
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.muted, borderRadius: 8, padding: "10px 20px",
                fontSize: 13, transition: "all 0.2s", fontFamily: "'DM Mono',monospace",
              }}>↑ Upload CSV</button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }} onChange={handleFile} />
            {input && (
              <button onClick={() => { setInput(""); setAnalysis(null); setChartData([]); }}
                style={{
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.muted, borderRadius: 8, padding: "10px 16px",
                  fontSize: 13, fontFamily: "'DM Mono',monospace",
                }}>✕</button>
            )}
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 20, marginBottom: 24,
            display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`,
              animation: "spin 0.8s linear infinite", flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: 13, color: C.text }}>DataMind is analyzing...</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                {backendStatus === "ok" ? "🐍 Pandas + Lux + Claude" : "Claude AI analysis"}
              </div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{
            background: C.accent3 + "11", border: `1px solid ${C.accent3}44`,
            borderRadius: 12, padding: 16, marginBottom: 24, color: C.accent3, fontSize: 13
          }}>⚠ {error}</div>
        )}

        {/* RESULTS */}
        {analysis && !loading && (
          <div className="fade-in">
            {/* Title */}
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: "12px 12px 0 0", padding: "16px 24px",
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>
                  {analysis.title || "Analysis Results"}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, maxWidth: 600, lineHeight: 1.5 }}>
                  {analysis.summary}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                {analysis.sentiment && <Tag color={sentimentColor[analysis.sentiment] || C.muted}>{analysis.sentiment}</Tag>}
                <Tag color={C.accent2}>{analysis.chartType || "auto"}</Tag>
                {backendStatus === "ok" && <Tag color={C.accent}>Lux + Pandas</Tag>}
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              background: C.panel, borderLeft: `1px solid ${C.border}`,
              borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
              display: "flex", padding: "0 24px",
            }}>
              {[
                ["insights", "⬡ Insights"],
                ["chart", "◈ Chart"],
                ["predictions", "◎ Predictions"],
                ["stats", "∑ Stats"],
                ...(analysis.lux?.available ? [["lux", "✦ Lux"]] : [])
              ].map(([tab, label]) => (
                <button key={tab} className="tab"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: "none", border: "none",
                    borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                    color: activeTab === tab ? C.accent : C.muted,
                    padding: "12px 16px", fontSize: 12, letterSpacing: 1,
                    textTransform: "uppercase", fontFamily: "'DM Mono',monospace",
                    marginBottom: -1, transition: "color 0.2s",
                  }}>{label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24,
            }}>

              {activeTab === "insights" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>◈ KEY INSIGHTS</div>
                    {(analysis.insights || []).map((ins, i) => (
                      <div key={i} style={{
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.chart[i % C.chart.length]}`,
                        borderRadius: 8, padding: "12px 16px", fontSize: 13,
                        lineHeight: 1.6, display: "flex", gap: 12, marginBottom: 8,
                      }}>
                        <span style={{ color: C.chart[i % C.chart.length], fontWeight: 700, minWidth: 22 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {ins}
                      </div>
                    ))}
                  </div>
                  {(analysis.anomalies || []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 10 }}>⚠ ANOMALIES</div>
                      {analysis.anomalies.map((a, i) => (
                        <div key={i} style={{
                          background: C.accent3 + "11", border: `1px solid ${C.accent3}33`,
                          borderRadius: 8, padding: "10px 16px", fontSize: 12,
                          color: C.accent3, marginBottom: 6
                        }}>▲ {a}</div>
                      ))}
                    </div>
                  )}
                  {analysis.recommendation && (
                    <div style={{
                      background: C.accent + "11", border: `1px solid ${C.accent}44`,
                      borderRadius: 8, padding: "16px 20px"
                    }}>
                      <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, marginBottom: 8 }}>★ TOP RECOMMENDATION</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{analysis.recommendation}</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "chart" && (
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 16 }}>
                    ◈ VISUALIZATION — {(analysis.chartType || "auto").toUpperCase()}
                  </div>
                  <ChartPanel chartType={analysis.chartType || "line"} chartData={chartData} axes={axes} />
                </div>
              )}

              {activeTab === "predictions" && (
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>◎ PREDICTIONS</div>
                  {(analysis.predictions || []).map((p, i) => (
                    <div key={i} style={{
                      background: C.bg, border: `1px solid ${C.accent2}44`,
                      borderLeft: `3px solid ${C.accent2}`,
                      borderRadius: 8, padding: "14px 16px", fontSize: 13,
                      lineHeight: 1.6, display: "flex", gap: 12, marginBottom: 8,
                    }}>
                      <span style={{ color: C.accent2, fontSize: 16, minWidth: 20 }}>◎</span>
                      {p}
                    </div>
                  ))}
                  <div style={{
                    marginTop: 12, padding: "12px 16px",
                    background: C.accent2 + "11", border: `1px solid ${C.accent2}33`,
                    borderRadius: 8, fontSize: 11, color: C.muted, lineHeight: 1.6
                  }}>
                    ⚠ Predictions are statistical estimates. Validate with domain expertise before acting.
                  </div>
                </div>
              )}

              {activeTab === "stats" && <StatsPanel stats={analysis.stats} />}
              {activeTab === "lux" && <LuxPanel lux={analysis.lux} />}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!analysis && !loading && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} className="pulse">◈</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: C.text, opacity: 0.3 }}>
              Paste your data above
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              Powered by Pandas + Lux (Python) + Claude AI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
