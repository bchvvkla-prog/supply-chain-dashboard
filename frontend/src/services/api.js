// frontend/src/services/api.js

const BASE_URL = "http://127.0.0.1:8000";

// ---------------- KPIs ----------------
export async function fetchKPIs() {
  const res = await fetch(`${BASE_URL}/kpis`);
  if (!res.ok) throw new Error("Failed to fetch KPIs");
  return res.json();
}

// ---------------- Inventory ----------------
export async function fetchInventoryKPIs() {
  const res = await fetch(`${BASE_URL}/inventory-kpis`);
  if (!res.ok) throw new Error("Failed to fetch Inventory KPIs");
  return res.json();
}

// ---------------- Logistics ----------------
export async function fetchLogisticsKPIs() {
  const res = await fetch(`${BASE_URL}/logistics-kpis`);
  if (!res.ok) throw new Error("Failed to fetch Logistics KPIs");
  return res.json();
}

// ---------------- AI ----------------
export async function fetchAIInsights() {
  const res = await fetch(`${BASE_URL}/ai-insights`);
  if (!res.ok) throw new Error("Failed to fetch AI Insights");
  return res.json();
}
