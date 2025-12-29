import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  fetchKPIs,
  fetchInventoryKPIs,
  fetchLogisticsKPIs,
  fetchAIInsights,
} from "../services/api";

/* =========================
   CHART REGISTER
========================= */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

/* =========================
   FUTURISTIC THEME (STYLE ONLY)
========================= */
const THEME = {
  bg: "radial-gradient(1200px 600px at top right, #0b1020, #020617)",
  border: "rgba(148,163,184,0.18)",
  title: "#E5E7EB",
  label: "#94A3B8",
  primary: "#5DF0FF",   // neon cyan
  secondary: "#9A5CF5", // neon violet
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#FACC15",
  glass: "rgba(15,23,42,0.65)",
  glowCyan: "0 0 24px rgba(93,240,255,0.45)",
  glowViolet: "0 0 24px rgba(154,92,245,0.45)",
};

/* =========================
   HELPERS
========================= */
const growthPct = (curr, prev) => {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
};

/* =========================
   KPI CARD (STYLE ONLY)
========================= */
function KpiCard({ title, value, prev, demo }) {
  const g = growthPct(value, prev);
  let arrow = "—";
  let color = THEME.label;

  if (g > 0) {
    arrow = "▲";
    color = THEME.success;
  } else if (g < 0) {
    arrow = "▼";
    color = THEME.danger;
  }

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
        padding: 12,
        background: THEME.glass,
        backdropFilter: "blur(14px)",
        boxShadow: demo ? THEME.glowCyan : "none",
        transition: "box-shadow 0.6s ease",
      }}
    >
      <div style={{ fontSize: 12, color: THEME.label }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value ?? "—"}</div>
      {g !== null && (
        <div style={{ fontSize: 12, fontWeight: 800, color }}>
          {arrow} {Math.abs(g).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

/* =========================
   PANEL (STYLE ONLY)
========================= */
function Panel({ title, children, demo }) {
  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 16,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        background: THEME.glass,
        backdropFilter: "blur(16px)",
        boxShadow: demo ? THEME.glowViolet : "none",
        transition: "box-shadow 0.6s ease",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState({});
  const [prevKpis, setPrevKpis] = useState({});
  const [inventory, setInventory] = useState({});
  const [logistics, setLogistics] = useState({});
  const [ai, setAI] = useState({});
  const [now, setNow] = useState(new Date());
  const [range, setRange] = useState(30);

  /* DEMO MODE (VISUAL ONLY) */
  const [demoMode, setDemoMode] = useState(false);

  const [question, setQuestion] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  /* LIVE CLOCK */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* FETCH DATA */
  useEffect(() => {
    async function load() {
      const curr = await fetchKPIs();
      setKpis(curr);

      const factor = range === 7 ? 0.95 : range === 15 ? 0.9 : 0.85;
      setPrevKpis({
        total_revenue: curr.total_revenue * factor,
        total_units_sold: curr.total_units_sold * factor,
        avg_shipping_cost: curr.avg_shipping_cost * (2 - factor),
        avg_lead_time: curr.avg_lead_time * (2 - factor),
      });
    }

    load();
    fetchInventoryKPIs().then(setInventory);
    fetchLogisticsKPIs().then(setLogistics);
    fetchAIInsights().then(setAI);
  }, [range]);

  const products = inventory?.scatter_data || [];
  const top = [...products].sort((a, b) => b.y - a.y)[0] || {};

  const revenueValues = [
    kpis.skin_care_revenue || 0,
    kpis.hair_care_revenue || 0,
    kpis.cosmetics_revenue || 0,
    kpis.fragrance_revenue || 0,
    kpis.other_revenue || 0,
  ];

  const revenueAtRisk = products
    .filter((p) => p.x < p.y)
    .reduce((sum, p) => sum + (p.y - p.x) * 50, 0);

  /* =========================
     PDF EXPORT (UNCHANGED)
========================= */
  function exportToPDF() {
    const pdf = new jsPDF("landscape", "pt", "a4");
    const input = document.getElementById("dashboard-pdf");

    html2canvas(input, {
      scale: 2,
      backgroundColor: "#020617",
    }).then((canvas) => {
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 40, w, h);
      pdf.save(`Supply_Chain_Dashboard_${range}_Days.pdf`);
    });
  }

  async function askCopilot() {
    if (!question.trim()) return;
    setLoadingAI(true);
    const res = await fetch("http://127.0.0.1:8000/ai-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setAiResult(await res.json());
    setLoadingAI(false);
  }

  return (
    <div
      id="dashboard-pdf"
      style={{
        height: "100vh",
        padding: 14,
        background: THEME.bg,
        color: THEME.title,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* HEADER (UNCHANGED STRUCTURE) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontWeight: 900, letterSpacing: 1 }}>
          SUPPLY CHAIN DASHBOARD
        </h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            style={{
              background: THEME.glass,
              color: THEME.title,
              border: `1px solid ${THEME.border}`,
              padding: "6px 10px",
              borderRadius: 10,
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={15}>Last 15 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>

          <button
            onClick={() => setDemoMode(!demoMode)}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: demoMode
                ? "linear-gradient(135deg,#22C55E,#5DF0FF)"
                : "linear-gradient(135deg,#5DF0FF,#9A5CF5)",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              boxShadow: THEME.glowCyan,
            }}
          >
            {demoMode ? "● Demo ON" : "▶ Demo Mode"}
          </button>

          <div style={{ fontSize: 12, color: THEME.label }}>
            {now.toLocaleDateString()} | {now.toLocaleTimeString()}
          </div>

          <button
            onClick={exportToPDF}
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#5DF0FF,#9A5CF5)",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              boxShadow: THEME.glowCyan,
            }}
          >
            ⬇ Export PDF
          </button>
        </div>
      </div>

      {/* KPI STRIP (UNCHANGED) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }}>
        <KpiCard title="Revenue" value={kpis.total_revenue} prev={prevKpis.total_revenue} demo={demoMode} />
        <KpiCard title="Units Sold" value={kpis.total_units_sold} prev={prevKpis.total_units_sold} demo={demoMode} />
        <KpiCard title="Ship Cost" value={kpis.avg_shipping_cost} prev={prevKpis.avg_shipping_cost} />
        <KpiCard title="Lead Time" value={kpis.avg_lead_time} prev={prevKpis.avg_lead_time} demo={demoMode} />
        <KpiCard title="Top SKU" value={top.sku} />
        <KpiCard title="Top Product" value={top.product} />
        <KpiCard title="Defect %" value={kpis.avg_defect_rate} />
      </div>

      {/* VISUAL GRID (UNCHANGED) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gridTemplateRows: "repeat(2,1fr)",
          gap: 12,
          flexGrow: 1,
        }}
      >
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
          <Panel title="Revenue at Risk (Lost Sales)" demo={demoMode}>
            <div style={{ fontSize: 26, fontWeight: 900, color: THEME.warning }}>
              ${revenueAtRisk.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: THEME.label }}>
              Potential revenue lost due to stock shortages
            </div>
          </Panel>

          <Panel title="SKUs at Risk" demo={demoMode}>
            {products.filter(p => p.x < p.y).slice(0, 4).map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{p.product} ({p.sku})</span>
                <span style={{ color: THEME.danger, fontWeight: 800 }}>
                  {p.y - p.x} units
                </span>
              </div>
            ))}
          </Panel>
        </div>

        <Panel title="Revenue Mix">
          <Pie
            data={{
              labels: ["Skin","Hair","Cosmetics","Fragrance","Others"],
              datasets: [{ data: revenueValues, backgroundColor: [THEME.primary,THEME.secondary,THEME.success,"#FACC15","#64748B"] }],
            }}
            options={{ maintainAspectRatio: false }}
          />
        </Panel>

        <Panel title="Inventory Health">
          {products.slice(0, 6).map((p, i) => {
            const gap = p.x - p.y;
            const status = gap < -20 ? "⬇️ Shortage" : gap > 20 ? "⬆️ Surplus" : "🟡 Balanced";
            const color = gap < -20 ? THEME.danger : gap > 20 ? THEME.success : THEME.warning;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{p.product} ({p.sku})</span>
                <span style={{ color, fontWeight: 800 }}>{status}</span>
              </div>
            );
          })}
        </Panel>

        <Panel title="Shipping Cost vs Time">
          <Bar
            data={{
              labels: logistics.carriers || [],
              datasets: [
                { label: "Cost", data: logistics.avg_shipping_cost || [], backgroundColor: THEME.primary },
                { label: "Time", data: logistics.avg_shipping_time || [], backgroundColor: THEME.secondary },
              ],
            }}
            options={{ maintainAspectRatio: false }}
          />
        </Panel>

        <Panel title="Stock vs Demand">
          <Bar
            data={{
              labels: products.slice(0, 5).map(p => `${p.product} (${p.sku})`),
              datasets: [
                { label: "Stock", data: products.slice(0, 5).map(p => p.x), backgroundColor: THEME.primary },
                { label: "Demand", data: products.slice(0, 5).map(p => p.y), backgroundColor: THEME.danger },
              ],
            }}
            options={{ indexAxis: "y", maintainAspectRatio: false }}
          />
        </Panel>

        <Panel title="AI Insights" demo={demoMode}>
          {(ai.insights || []).slice(0, 3).map((i, idx) => (
            <div key={idx} style={{ fontSize: 13 }}>• {i}</div>
          ))}
          <div style={{ marginTop: 6, fontWeight: 800, color: THEME.success }}>
            {ai.recommendation}
          </div>
        </Panel>
      </div>

      {/* COPILOT (UNCHANGED) */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Copilot…"
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: THEME.glass,
            color: THEME.title,
            border: `1px solid ${THEME.border}`,
          }}
        />
        <button
          onClick={askCopilot}
          style={{
            padding: "0 18px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#5DF0FF,#9A5CF5)",
            fontWeight: 900,
            border: "none",
            cursor: "pointer",
            boxShadow: THEME.glowCyan,
          }}
        >
          Ask
        </button>
      </div>

      {loadingAI && <div>Analyzing…</div>}
      {aiResult && <div>{aiResult.recommendation}</div>}
    </div>
  );
}
