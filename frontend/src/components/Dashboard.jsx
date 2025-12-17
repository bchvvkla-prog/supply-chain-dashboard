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
   THEME
========================= */
const THEME = {
  bg: "#020617",
  border: "#1E293B",
  title: "#F8FAFC",
  label: "#94A3B8",
  primary: "#38BDF8",
  secondary: "#A78BFA",
  success: "#22C55E",
  danger: "#EF4444",
};

/* =========================
   HELPERS
========================= */
const growthPct = (curr, prev) => {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
};

/* =========================
   KPI CARD
========================= */
function KpiCard({ title, value, prev }) {
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
    <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 10 }}>
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
   PANEL
========================= */
function Panel({ title, children }) {
  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: 10,
        display: "flex",
        flexDirection: "column",
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

  /* DATE FILTER */
  const [range, setRange] = useState(30);

  /* COPILOT */
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

      // simulate previous period
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

  /* =========================
     PDF EXPORT
  ========================= */
  function exportToPDF() {
    const pdf = new jsPDF("landscape", "pt", "a4");

    pdf.setFontSize(22);
    pdf.text(`Supply Chain Executive Report – Last ${range} Days`, 40, 50);

    pdf.setFontSize(14);
    let y = 100;
    [
      `Revenue: $${kpis.total_revenue?.toLocaleString()}`,
      `Units Sold: ${kpis.total_units_sold}`,
      `Top Product: ${top.product || "N/A"}`,
      `Avg Shipping Cost: $${kpis.avg_shipping_cost}`,
      `Avg Lead Time: ${kpis.avg_lead_time} days`,
      "",
      "Recommendation:",
      "Rebalance inventory toward high-demand products and optimize shipping lanes.",
    ].forEach((line) => {
      pdf.text(line, 40, y);
      y += 22;
    });

    const input = document.getElementById("dashboard-pdf");
    html2canvas(input, { scale: 2, backgroundColor: THEME.bg }).then((canvas) => {
      pdf.addPage("a4", "landscape");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 40, w, h);
      pdf.save(`Supply_Chain_${range}_Days_Report.pdf`);
    });
  }

  /* COPILOT */
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
        padding: 10,
        background: THEME.bg,
        color: THEME.title,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>SUPPLY CHAIN DASHBOARD</h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: THEME.bg,
              color: THEME.title,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={15}>Last 15 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>

          <div style={{ fontSize: 12, color: THEME.label }}>
            {now.toLocaleDateString()} | {now.toLocaleTimeString()}
          </div>

          <button
            onClick={exportToPDF}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#38BDF8,#A78BFA)",
              fontWeight: 900,
            }}
          >
            ⬇ Export PDF
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
        <KpiCard title="Revenue" value={kpis.total_revenue} prev={prevKpis.total_revenue} />
        <KpiCard title="Units Sold" value={kpis.total_units_sold} prev={prevKpis.total_units_sold} />
        <KpiCard title="Ship Cost" value={kpis.avg_shipping_cost} prev={prevKpis.avg_shipping_cost} />
        <KpiCard title="Lead Time" value={kpis.avg_lead_time} prev={prevKpis.avg_lead_time} />
        <KpiCard title="Top SKU" value={top.sku} />
        <KpiCard title="Top Product" value={top.product} />
        <KpiCard title="Defect %" value={kpis.avg_defect_rate} />
      </div>

      {/* VISUAL GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(2,1fr)", gap: 10, flexGrow: 1 }}>
        <Panel title="Revenue by Product">
          <Bar
            data={{ labels: ["Skin","Hair","Cosmetics","Fragrance","Others"], datasets: [{ data: revenueValues, backgroundColor: THEME.primary }] }}
            options={{ maintainAspectRatio: false }}
          />
        </Panel>

        <Panel title="Revenue Mix">
          <Pie
            data={{ labels: ["Skin","Hair","Cosmetics","Fragrance","Others"], datasets: [{ data: revenueValues, backgroundColor: [THEME.primary,THEME.secondary,THEME.success,"#F59E0B","#64748B"] }] }}
            options={{ maintainAspectRatio: false }}
          />
        </Panel>

        <Panel title="Inventory Health">
          {products.slice(0, 6).map((p, i) => {
            const gap = p.x - p.y;
            const status = gap < -20 ? "⬇️ Shortage" : gap > 20 ? "⬆️ Surplus" : "🟡 Balanced";
            const color = gap < -20 ? THEME.danger : gap > 20 ? THEME.success : "#F59E0B";
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

        <Panel title="AI Insights">
          {(ai.insights || []).slice(0, 3).map((i, idx) => (
            <div key={idx} style={{ fontSize: 13 }}>• {i}</div>
          ))}
          <div style={{ marginTop: 6, fontWeight: 800, color: THEME.success }}>
            {ai.recommendation}
          </div>
        </Panel>
      </div>

      {/* COPILOT */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askCopilot()}
          placeholder="Ask Copilot…"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${THEME.border}` }}
        />
        <button onClick={askCopilot} style={{ padding: "0 18px", borderRadius: 10, background: THEME.primary, fontWeight: 900 }}>
          Ask
        </button>
      </div>

      {loadingAI && <div>Analyzing…</div>}
      {aiResult && <div>{aiResult.recommendation}</div>}
    </div>
  );
}
