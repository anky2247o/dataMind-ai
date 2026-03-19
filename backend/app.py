from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import io
import traceback
import base64
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend — MUST be before pyplot import
import matplotlib.pyplot as plt
import seaborn as sns

try:
    from scipy import stats as scipy_stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# ─── SEABORN THEME ────────────────────────────────────────────────────────────
sns.set_theme(style="darkgrid")
PALETTE = ["#00FFB2", "#7B61FF", "#FF6B6B", "#FFB800", "#00C8FF", "#FF61D8"]
BG_COLOR = "#111118"
TEXT_COLOR = "#E8E8F0"
GRID_COLOR = "#1E1E2E"


def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight",
                facecolor=BG_COLOR, edgecolor="none", dpi=150)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    plt.close(fig)
    return f"data:image/png;base64,{img_base64}"


def parse_csv(text):
    try:
        return pd.read_csv(io.StringIO(text))
    except Exception:
        try:
            return pd.read_csv(io.StringIO(text), sep="\t")
        except Exception:
            return None


def safe(val):
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, (np.ndarray,)):
        return val.tolist()
    if isinstance(val, pd.Timestamp):
        return str(val)
    return str(val)


# ─── CHART GENERATORS ─────────────────────────────────────────────────────────

def make_line_chart(df, x_col, y_cols):
    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    for i, col in enumerate(y_cols[:4]):
        ax.plot(df[x_col].astype(str), df[col],
                color=PALETTE[i % len(PALETTE)],
                linewidth=2.5, marker="o", markersize=5, label=col)
    ax.set_xlabel(x_col, color=TEXT_COLOR, fontsize=11)
    ax.set_ylabel("Value", color=TEXT_COLOR, fontsize=11)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.xaxis.set_tick_params(rotation=45)
    ax.grid(True, color=GRID_COLOR, linewidth=0.8)
    ax.spines[["top","right","left","bottom"]].set_color(GRID_COLOR)
    if len(y_cols) > 1:
        ax.legend(facecolor=BG_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_bar_chart(df, x_col, y_cols):
    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    x = np.arange(len(df[x_col]))
    width = 0.8 / len(y_cols[:4])
    for i, col in enumerate(y_cols[:4]):
        offset = (i - len(y_cols[:4]) / 2 + 0.5) * width
        bars = ax.bar(x + offset, df[col],
                      width=width * 0.9,
                      color=PALETTE[i % len(PALETTE)],
                      label=col, alpha=0.9)
    ax.set_xticks(x)
    ax.set_xticklabels(df[x_col].astype(str), rotation=45, ha="right",
                       color=TEXT_COLOR, fontsize=9)
    ax.set_xlabel(x_col, color=TEXT_COLOR, fontsize=11)
    ax.set_ylabel("Value", color=TEXT_COLOR, fontsize=11)
    ax.tick_params(colors=TEXT_COLOR)
    ax.grid(True, axis="y", color=GRID_COLOR, linewidth=0.8)
    ax.spines[["top","right","left","bottom"]].set_color(GRID_COLOR)
    if len(y_cols) > 1:
        ax.legend(facecolor=BG_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_area_chart(df, x_col, y_cols):
    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    x_vals = range(len(df))
    x_labels = df[x_col].astype(str).tolist()
    for i, col in enumerate(y_cols[:4]):
        color = PALETTE[i % len(PALETTE)]
        ax.fill_between(x_vals, df[col],
                        alpha=0.25, color=color)
        ax.plot(x_vals, df[col],
                color=color, linewidth=2.5, label=col)
    ax.set_xticks(x_vals[::max(1, len(x_vals)//10)])
    ax.set_xticklabels(
        [x_labels[i] for i in x_vals[::max(1, len(x_vals)//10)]],
        rotation=45, ha="right", color=TEXT_COLOR, fontsize=9)
    ax.set_xlabel(x_col, color=TEXT_COLOR, fontsize=11)
    ax.set_ylabel("Value", color=TEXT_COLOR, fontsize=11)
    ax.tick_params(colors=TEXT_COLOR)
    ax.grid(True, color=GRID_COLOR, linewidth=0.8)
    ax.spines[["top","right","left","bottom"]].set_color(GRID_COLOR)
    if len(y_cols) > 1:
        ax.legend(facecolor=BG_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_pie_chart(df, x_col, y_col):
    fig, ax = plt.subplots(figsize=(8, 8))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    data = df.groupby(x_col)[y_col].sum()
    wedges, texts, autotexts = ax.pie(
        data.values,
        labels=data.index,
        colors=PALETTE[:len(data)],
        autopct="%1.1f%%",
        startangle=140,
        pctdistance=0.85,
        wedgeprops={"linewidth": 2, "edgecolor": BG_COLOR}
    )
    for t in texts:
        t.set_color(TEXT_COLOR)
        t.set_fontsize(10)
    for at in autotexts:
        at.set_color(BG_COLOR)
        at.set_fontweight("bold")
        at.set_fontsize(9)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_scatter_chart(df, x_col, y_col, hue_col=None):
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    if hue_col and hue_col in df.columns:
        groups = df[hue_col].unique()
        for i, g in enumerate(groups[:6]):
            subset = df[df[hue_col] == g]
            ax.scatter(subset[x_col], subset[y_col],
                       color=PALETTE[i % len(PALETTE)],
                       s=80, alpha=0.85, label=str(g), edgecolors="none")
        ax.legend(facecolor=BG_COLOR, labelcolor=TEXT_COLOR, fontsize=9)
    else:
        ax.scatter(df[x_col], df[y_col],
                   color=PALETTE[0], s=80, alpha=0.85, edgecolors="none")
        # Add regression line
        try:
            z = np.polyfit(df[x_col].dropna(), df[y_col].dropna(), 1)
            p = np.poly1d(z)
            x_line = np.linspace(df[x_col].min(), df[x_col].max(), 100)
            ax.plot(x_line, p(x_line), color=PALETTE[1],
                    linewidth=1.5, linestyle="--", alpha=0.8)
        except Exception:
            pass
    ax.set_xlabel(x_col, color=TEXT_COLOR, fontsize=11)
    ax.set_ylabel(y_col, color=TEXT_COLOR, fontsize=11)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.grid(True, color=GRID_COLOR, linewidth=0.8)
    ax.spines[["top","right","left","bottom"]].set_color(GRID_COLOR)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_heatmap(df):
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(numeric_cols) < 2:
        return None
    corr = df[numeric_cols].corr()
    fig, ax = plt.subplots(figsize=(max(6, len(numeric_cols)), max(5, len(numeric_cols) - 1)))
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    sns.heatmap(corr, annot=True, fmt=".2f", ax=ax,
                cmap=sns.diverging_palette(145, 300, s=90, l=40, as_cmap=True),
                linewidths=0.5, linecolor=BG_COLOR,
                annot_kws={"size": 9, "color": TEXT_COLOR})
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    plt.tight_layout()
    return fig_to_base64(fig)


def make_distribution(df, col):
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.patch.set_facecolor(BG_COLOR)
    for ax in axes:
        ax.set_facecolor(BG_COLOR)

    # Histogram with KDE
    sns.histplot(df[col].dropna(), ax=axes[0],
                 color=PALETTE[0], kde=True,
                 edgecolor=BG_COLOR, alpha=0.8,
                 line_kws={"linewidth": 2.5})
    axes[0].set_title(f"Distribution of {col}",
                      color=TEXT_COLOR, fontsize=12, pad=10)
    axes[0].tick_params(colors=TEXT_COLOR, labelsize=9)
    axes[0].grid(True, color=GRID_COLOR, linewidth=0.8)
    axes[0].spines[["top","right","left","bottom"]].set_color(GRID_COLOR)

    # Box plot
    sns.boxplot(y=df[col].dropna(), ax=axes[1],
                color=PALETTE[1], flierprops={"marker": "o",
                "markerfacecolor": PALETTE[2], "markersize": 6})
    axes[1].set_title(f"Boxplot of {col}",
                      color=TEXT_COLOR, fontsize=12, pad=10)
    axes[1].tick_params(colors=TEXT_COLOR, labelsize=9)
    axes[1].grid(True, color=GRID_COLOR, linewidth=0.8)
    axes[1].spines[["top","right","left","bottom"]].set_color(GRID_COLOR)

    plt.tight_layout()
    return fig_to_base64(fig)


def generate_charts(df, stats, chart_type):
    """Generate all relevant charts for the dataset."""
    charts = {}
    numeric_cols = stats.get("numeric_columns", [])
    cat_cols = stats.get("categorical_columns", [])

    # Guess axes
    x_col = cat_cols[0] if cat_cols else (df.columns[0] if len(df.columns) > 0 else None)
    y_cols = numeric_cols[:4] if numeric_cols else []

    if not x_col or not y_cols:
        return charts

    # Main chart
    try:
        if chart_type == "line":
            charts["main"] = make_line_chart(df, x_col, y_cols)
        elif chart_type == "area":
            charts["main"] = make_area_chart(df, x_col, y_cols)
        elif chart_type == "pie":
            charts["main"] = make_pie_chart(df, x_col, y_cols[0])
        elif chart_type == "scatter" and len(y_cols) >= 2:
            charts["main"] = make_scatter_chart(df, y_cols[0], y_cols[1])
        else:
            charts["main"] = make_bar_chart(df, x_col, y_cols)
    except Exception as e:
        print(f"Main chart error: {e}")
        try:
            charts["main"] = make_bar_chart(df, x_col, y_cols)
        except Exception:
            pass

    # Correlation heatmap (if enough numeric columns)
    if len(numeric_cols) >= 3:
        try:
            charts["heatmap"] = make_heatmap(df)
        except Exception as e:
            print(f"Heatmap error: {e}")

    # Distribution of first numeric column
    if numeric_cols:
        try:
            charts["distribution"] = make_distribution(df, numeric_cols[0])
        except Exception as e:
            print(f"Distribution error: {e}")

    return charts


# ─── ANALYSIS ─────────────────────────────────────────────────────────────────

def analyze_df(df):
    result = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    result["shape"] = {"rows": int(df.shape[0]), "cols": int(df.shape[1])}
    result["numeric_columns"] = numeric_cols
    result["categorical_columns"] = cat_cols
    result["missing_values"] = {k: int(v) for k, v in df.isnull().sum().items()}

    if numeric_cols:
        try:
            desc = df[numeric_cols].describe()
            result["numeric_summary"] = {
                col: {k: safe(v) for k, v in desc[col].items()}
                for col in desc.columns
            }
        except Exception:
            result["numeric_summary"] = {}

    result["top_correlations"] = []
    if len(numeric_cols) >= 2:
        try:
            corr = df[numeric_cols].corr()
            seen = set()
            corrs = []
            for c1 in corr.columns:
                for c2 in corr.columns:
                    if c1 != c2 and (c2, c1) not in seen:
                        v = corr.loc[c1, c2]
                        if not np.isnan(v):
                            corrs.append({"col1": c1, "col2": c2,
                                          "correlation": round(float(v), 3)})
                        seen.add((c1, c2))
            corrs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
            result["top_correlations"] = corrs[:5]
        except Exception:
            result["top_correlations"] = []

    result["trends"] = []
    for col in numeric_cols:
        try:
            s = df[col].dropna()
            if len(s) > 3:
                first = s.iloc[:len(s)//2].mean()
                second = s.iloc[len(s)//2:].mean()
                if first != 0:
                    pct = ((second - first) / abs(first)) * 100
                    if abs(pct) > 5:
                        result["trends"].append({
                            "column": col,
                            "direction": "increasing ↑" if pct > 0 else "decreasing ↓",
                            "change_pct": round(float(pct), 1)
                        })
        except Exception:
            continue

    result["outliers"] = {}
    for col in numeric_cols:
        try:
            s = df[col].dropna()
            Q1, Q3 = s.quantile(0.25), s.quantile(0.75)
            IQR = Q3 - Q1
            count = int(((s < Q1 - 1.5 * IQR) | (s > Q3 + 1.5 * IQR)).sum())
            if count > 0:
                result["outliers"][col] = count
        except Exception:
            continue

    result["skewness"] = {}
    for col in numeric_cols:
        try:
            sk = float(df[col].skew())
            if not np.isnan(sk):
                result["skewness"][col] = round(sk, 3)
        except Exception:
            continue

    result["categorical_summary"] = {}
    for col in cat_cols[:3]:
        try:
            vc = df[col].value_counts().head(5)
            result["categorical_summary"][col] = {str(k): int(v) for k, v in vc.items()}
        except Exception:
            continue

    return result


def build_insights(stats):
    insights, predictions, anomalies = [], [], []

    shape = stats.get("shape", {})
    numeric_cols = stats.get("numeric_columns", [])
    cat_cols = stats.get("categorical_columns", [])
    trends = stats.get("trends", [])
    corrs = stats.get("top_correlations", [])
    outliers = stats.get("outliers", {})
    skewness = stats.get("skewness", {})
    cat_summary = stats.get("categorical_summary", {})
    missing = stats.get("missing_values", {})

    insights.append(
        f"Dataset has {shape.get('rows','?')} rows and {shape.get('cols','?')} columns "
        f"({len(numeric_cols)} numeric, {len(cat_cols)} categorical)."
    )

    total_missing = sum(missing.values())
    if total_missing > 0:
        cols = [c for c, v in missing.items() if v > 0]
        anomalies.append(f"{total_missing} missing values in: {', '.join(cols)}")

    if corrs:
        c = corrs[0]
        strength = "strong" if abs(c["correlation"]) > 0.7 else "moderate"
        direction = "positive" if c["correlation"] > 0 else "negative"
        insights.append(
            f"{strength.capitalize()} {direction} correlation ({c['correlation']}) "
            f"between '{c['col1']}' and '{c['col2']}'."
        )

    for t in trends[:2]:
        insights.append(
            f"'{t['column']}' is {t['direction']} ({abs(t['change_pct'])}% change)."
        )
        if t["change_pct"] > 0:
            predictions.append(f"'{t['column']}' trending upward — expect continued growth.")
        else:
            predictions.append(f"'{t['column']}' declining — investigate root causes.")

    for col, count in outliers.items():
        anomalies.append(f"{count} outlier(s) in '{col}' — may skew averages.")

    for col, sk in skewness.items():
        if abs(sk) > 1:
            d = "right (positive)" if sk > 0 else "left (negative)"
            insights.append(f"'{col}' is heavily skewed {d} (skewness={sk}).")

    for col, freq in cat_summary.items():
        if freq:
            top_val = list(freq.keys())[0]
            top_count = list(freq.values())[0]
            pct = round((top_count / shape.get("rows", 1)) * 100, 1)
            insights.append(f"In '{col}', '{top_val}' dominates at {pct}% of records.")

    if len(corrs) >= 2:
        c2 = corrs[1]
        predictions.append(
            f"Monitor '{c2['col1']}' and '{c2['col2']}' together (r={c2['correlation']})."
        )

    if len(predictions) < 2:
        predictions.append("Collect more data over time to reveal stronger trends.")

    return {
        "insights": insights[:6],
        "predictions": predictions[:4],
        "anomalies": anomalies[:3],
    }


def suggest_chart(stats):
    trends = stats.get("trends", [])
    corrs = stats.get("top_correlations", [])
    rows = stats.get("shape", {}).get("rows", 0)
    numeric_cols = stats.get("numeric_columns", [])
    if trends:
        return "area"
    if corrs and abs(corrs[0]["correlation"]) > 0.7 and rows > 20:
        return "scatter"
    if rows <= 8:
        return "pie"
    if len(numeric_cols) >= 2:
        return "bar"
    return "line"


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "lux_available": False,
        "scipy_available": SCIPY_AVAILABLE,
        "matplotlib": True,
        "seaborn": True,
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        csv_text = data.get("csv", "")
        if not csv_text:
            return jsonify({"error": "No CSV data provided"}), 400

        df = parse_csv(csv_text)
        if df is None or df.empty:
            return jsonify({"error": "Could not parse CSV"}), 400

        stats = analyze_df(df)
        readable = build_insights(stats)
        chart_type = suggest_chart(stats)
        charts = generate_charts(df, stats, chart_type)

        corrs = stats.get("top_correlations", [])
        trends = stats.get("trends", [])

        if corrs:
            rec = f"Focus on '{corrs[0]['col1']}' vs '{corrs[0]['col2']}' (r={corrs[0]['correlation']})."
        elif trends:
            rec = f"The {trends[0]['direction']} trend in '{trends[0]['column']}' needs attention."
        else:
            rec = "Gather more data over time to identify stronger patterns."

        pos = [t for t in trends if t["change_pct"] > 0]
        neg = [t for t in trends if t["change_pct"] < 0]
        if pos and not neg:
            sentiment = "positive"
        elif neg and not pos:
            sentiment = "negative"
        elif pos and neg:
            sentiment = "mixed"
        else:
            sentiment = "neutral"

        return jsonify({
            "title": f"Analysis: {', '.join(df.columns[:3].tolist())}",
            "summary": (
                f"Dataset with {stats['shape']['rows']} rows analyzed using "
                f"Pandas + Matplotlib + Seaborn. "
                f"{len(readable['insights'])} insights, "
                f"{len(corrs)} correlations, {len(trends)} trends found."
            ),
            "insights": readable["insights"],
            "predictions": readable["predictions"],
            "anomalies": readable["anomalies"],
            "recommendation": rec,
            "sentiment": sentiment,
            "chartType": chart_type,
            "charts": charts,
            "lux": {"available": False},
            "stats": {
                "shape": stats["shape"],
                "numeric_columns": stats["numeric_columns"],
                "categorical_columns": stats["categorical_columns"],
                "top_correlations": stats["top_correlations"],
                "trends": stats["trends"],
                "outliers": stats["outliers"],
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🚀 DataMind Python Backend")
    print(f"   Matplotlib + Seaborn: ✅ Active")
    print(f"   SciPy: {'✅ Available' if SCIPY_AVAILABLE else '❌ Not installed'}")
    print(f"   Running on http://localhost:5000\n")
    app.run(debug=True, port=5000)
