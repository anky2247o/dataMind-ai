import { useState, useRef, useCallback } from "react";

const BACKEND_URL = "https://data-mind-ai.onrender.com";

const C = {
  bg: "#0A0A0F", panel: "#111118", border: "#1E1E2E",
  accent: "#00FFB2", accent2: "#7B61FF", accent3: "#FF6B6B",
  text: "#E8E8F0", muted: "#6B6B80",
  chart: ["#00FFB2", "#7B61FF", "#FF6B6B", "#FFB800", "#00C8FF", "#FF61D8"],
};

function parseCSVish(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(/,|\t/).map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(/,|\t/).map(v => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => { const n = parseFloat(vals[i]); obj[h] = isNaN(n) ? vals[i] : n; });
    return obj;
  });
  return { headers, rows };
}

async function analyzeWithPython(csvText) {
  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv: csvText }),
  });
  if (!response.ok) throw new Error("Backend error: " + response.status);
  return response.json();
}

async function analyzeWithClaude(userInput) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are DataMind AI. Return ONLY raw JSON, no markdown:
{"title":"...","summary":"...","insights":["..."],"predictions":["..."],"anomalies":["..."],"recommendation":"...","chartType":"bar","sentiment":"positive"}`,
      messages: [{ role: "user", content: userInput }],
    }),
  });
  const data = await response.json();
  const raw = data.content?.map(b => b.text || "").join("") || "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

const Tag = ({ color, children }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: 1, textTransform: "uppercase"
  }}>{children}</span>
);

function ChartImage({ src, title }) {
  if (!src) return (
    <div style={{
      height: 200, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: C.muted, gap: 10
    }}>
      <div style={{ fontSize: 40, opacity: 0.2 }}>◈</div>
      <div style={{ fontSize: 13 }}>No chart available</div>
      <div style={{ fontSize: 11 }}>Paste CSV data to generate charts</div>
    </div>
  );
  return (
    <div>
      {title && (
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 10 }}>
          {title}
        </div>
      )}
      <img
        src={src}
        alt={title || "Chart"}
        style={{
          width: "100%", borderRadius: 8,
          border: `1px solid ${C.border}`,
        }}
      />
    </div>
  );
}

function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          ["Rows", stats.shape?.rows],
          ["Columns", stats.shape?.cols],
          ["Numeric", stats.numeric_columns?.length],
          ["Categorical", stats.categorical_columns?.length],
        ].map(([label, val]) => (
          <div key={label} style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "12px 16px",
            textAlign: "center", flex: 1, minWidth: 80,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: "'Syne',sans-serif" }}>
              {val ?? "—"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

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
                border: `1px solid ${C.border}`, marginBottom: 6,
              }}>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <span style={{ color: C.text }}>{c.col1}</span>
                  <span style={{ color: C.muted, margin: "0 8px" }}>↔</span>
                  <span style={{ color: C.text }}>{c.col2}</span>
                </div>
                <div style={{
                  background: color + "22", color,
                  padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700
                }}>r = {c.correlation}</div>
              </div>
            );
          })}
        </div>
      )}

      {stats.trends?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>TRENDS</div>
          {stats.trends.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.bg, borderRadius: 8, padding: "10px 14px",
              border: `1px solid ${C.border}`, marginBottom: 6, fontSize: 12,
            }}>
              <span style={{ color: C.text }}>{t.column}</span>
              <span style={{ color: t.change_pct > 0 ? C.accent : C.accent3 }}>
                {t.direction} {Math.abs(t.change_pct)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(stats.outliers || {}).length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>OUTLIERS</div>
          {Object.entries(stats.outliers).map(([col, count]) => (
            <div key={col} style={{
              background: C.accent3 + "11", border: `1px solid ${C.accent3}33`,
              borderRadius: 8, padding: "8px 14px", marginBottom: 6,
              fontSize: 12, display: "flex", justifyContent: "space-between",
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

export default function DataMindAI() {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendOk, setBackendOk] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const fileRef = useRef();

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) { setBackendOk(true); return true; }
    } catch { }
    setBackendOk(false);
    return false;
  }, []);

  const handleAnalyze = useCallback(async (text) => {
    const src = text || input;
    if (!src.trim()) return;
    setLoading(true); setError(""); setAnalysis(null); setActiveTab("insights");

    try {
      const parsed = parseCSVish(src);
      let result;
      if (parsed) {
        const alive = await checkBackend();
        result = alive ? await analyzeWithPython(src) : await analyzeWithClaude(src);
      } else {
        result = await analyzeWithClaude(src);
      }
      setAnalysis(result);
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

  const sentimentColor = {
    positive: C.accent, negative: C.accent3, neutral: C.muted, mixed: C.accent2
  };

  const charts = analysis?.charts || {};
  const hasCharts = Object.keys(charts).length > 0;

  const chartTabs = [
    { key: "main", label: "◈ Main Chart" },
    { key: "heatmap", label: "⬡ Heatmap" },
    { key: "distribution", label: "∿ Distribution" },
  ].filter(t => charts[t.key]);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'DM Mono','Courier New',monospace", paddingBottom: 60,
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
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        .pulse { animation: pulse 2s ease infinite; }
        .chip:hover { background: ${C.accent}33 !important; color: ${C.accent} !important; }
        .btn-main:hover { opacity: 0.88; transform: translateY(-1px); }
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
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>◈</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>
              Data<span style={{ color: C.accent }}>Mind</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2 }}>AI ANALYST ENGINE</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {backendOk
            ? <Tag color={C.accent}>🐍 Matplotlib + Seaborn</Tag>
            : <Tag color={C.accent3}>Backend Offline</Tag>}
          <Tag color={C.accent2}>v3.0</Tag>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* INPUT */}
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
            ▸ INPUT — PASTE CSV, TEXT, OR UPLOAD A FILE
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={"Paste CSV data here...\n\nMonth,Sales,Profit\nJan,5000,1200\n...\n\nOr click a sample below ↓"}
            style={{
              width: "100%", minHeight: 130, background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, padding: "12px 14px",
              resize: "vertical", lineHeight: 1.6,
              fontFamily: "'DM Mono',monospace",
            }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>Try:</span>
            {SAMPLES.map(s => (
              <button key={s.label} className="chip"
                onClick={() => { setInput(s.text); handleAnalyze(s.text); }}
                style={{
                  background: C.border, border: `1px solid ${C.border}`,
                  color: C.muted, borderRadius: 20, padding: "4px 12px",
                  fontSize: 12, transition: "all 0.2s", fontFamily: "'DM Mono',monospace",
                }}>{s.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn-main"
              onClick={() => handleAnalyze()}
              disabled={loading || !input.trim()}
              style={{
                background: loading ? C.border : C.accent,
                color: loading ? C.muted : "#000",
                border: "none", borderRadius: 8, padding: "10px 24px",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                opacity: !input.trim() ? 0.4 : 1, fontFamily: "'DM Mono',monospace",
              }}>
              {loading ? "◌ Analyzing..." : "▶ Analyze"}
            </button>
            <button onClick={() => fileRef.current?.click()}
              style={{
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.muted, borderRadius: 8, padding: "10px 20px",
                fontSize: 13, fontFamily: "'DM Mono',monospace",
              }}>↑ Upload CSV</button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv"
              style={{ display: "none" }} onChange={handleFile} />
            {input && (
              <button onClick={() => { setInput(""); setAnalysis(null); }}
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
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`,
              animation: "spin 0.8s linear infinite", flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 13, color: C.text }}>DataMind is analyzing...</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                Pandas → Matplotlib + Seaborn → Generating charts...
              </div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{
            background: C.accent3 + "11", border: `1px solid ${C.accent3}44`,
            borderRadius: 12, padding: 16, marginBottom: 24,
            color: C.accent3, fontSize: 13,
          }}>⚠ {error}</div>
        )}

        {/* RESULTS */}
        {analysis && !loading && (
          <div className="fade-in">
            {/* Title bar */}
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: "12px 12px 0 0", padding: "16px 24px",
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>
                  {analysis.title || "Analysis Results"}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  {analysis.summary}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                {analysis.sentiment && (
                  <Tag color={sentimentColor[analysis.sentiment] || C.muted}>
                    {analysis.sentiment}
                  </Tag>
                )}
                {backendOk && <Tag color={C.accent}>Matplotlib</Tag>}
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              background: C.panel,
              borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              display: "flex", padding: "0 24px", overflowX: "auto",
            }}>
              {[
                ["insights", "⬡ Insights"],
                ...(hasCharts ? [["charts", "◈ Charts"]] : []),
                ["predictions", "◎ Predictions"],
                ["stats", "∑ Stats"],
              ].map(([tab, label]) => (
                <button key={tab} className="tab"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: "none", border: "none", whiteSpace: "nowrap",
                    borderBottom: activeTab === tab
                      ? `2px solid ${C.accent}` : "2px solid transparent",
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

              {/* INSIGHTS */}
              {activeTab === "insights" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
                      ◈ KEY INSIGHTS
                    </div>
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
                      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 10 }}>
                        ⚠ ANOMALIES
                      </div>
                      {analysis.anomalies.map((a, i) => (
                        <div key={i} style={{
                          background: C.accent3 + "11", border: `1px solid ${C.accent3}33`,
                          borderRadius: 8, padding: "10px 16px", fontSize: 12,
                          color: C.accent3, marginBottom: 6,
                        }}>▲ {a}</div>
                      ))}
                    </div>
                  )}

                  {analysis.recommendation && (
                    <div style={{
                      background: C.accent + "11", border: `1px solid ${C.accent}44`,
                      borderRadius: 8, padding: "16px 20px",
                    }}>
                      <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, marginBottom: 8 }}>
                        ★ TOP RECOMMENDATION
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{analysis.recommendation}</div>
                    </div>
                  )}
                </div>
              )}

              {/* CHARTS — Matplotlib/Seaborn images */}
              {activeTab === "charts" && (
                <div style={{ display: "grid", gap: 24 }}>
                  {/* Sub-tabs for chart types */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {chartTabs.map(t => (
                      <button key={t.key}
                        onClick={() => {}}
                        style={{
                          background: C.bg, border: `1px solid ${C.accent}44`,
                          color: C.accent, borderRadius: 6, padding: "6px 14px",
                          fontSize: 11, fontFamily: "'DM Mono',monospace",
                          letterSpacing: 1,
                        }}>{t.label}</button>
                    ))}
                  </div>

                  {charts.main && (
                    <ChartImage src={charts.main} title="◈ MAIN CHART — MATPLOTLIB + SEABORN" />
                  )}
                  {charts.heatmap && (
                    <ChartImage src={charts.heatmap} title="⬡ CORRELATION HEATMAP" />
                  )}
                  {charts.distribution && (
                    <ChartImage src={charts.distribution} title="∿ DISTRIBUTION + BOXPLOT" />
                  )}
                </div>
              )}

              {/* PREDICTIONS */}
              {activeTab === "predictions" && (
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 }}>
                    ◎ AI PREDICTIONS
                  </div>
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
                    borderRadius: 8, fontSize: 11, color: C.muted, lineHeight: 1.6,
                  }}>
                    ⚠ Predictions are statistical estimates. Validate with domain expertise.
                  </div>
                </div>
              )}

              {/* STATS */}
              {activeTab === "stats" && <StatsPanel stats={analysis.stats} />}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!analysis && !loading && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} className="pulse">◈</div>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800,
              color: C.text, opacity: 0.3,
            }}>Paste your data above</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              Powered by Pandas + Matplotlib + Seaborn + Claude AI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}