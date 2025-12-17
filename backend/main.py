from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# LOAD DATA
# -----------------------------
df = pd.read_csv("data/supply_chain_data.csv")
df.columns = [c.strip() for c in df.columns]  # clean headers

# -----------------------------
# KPI ENDPOINT
# -----------------------------
@app.get("/kpis")
def get_kpis():
    revenue_by_product = (
        df.groupby("Product type")["Revenue generated"]
        .sum()
        .to_dict()
    )

    return {
        "total_revenue": round(df["Revenue generated"].sum(), 2),
        "total_units_sold": int(df["Number of products sold"].sum()),
        "avg_defect_rate": "N/A",
        "avg_shipping_cost": round(df["Shipping costs"].mean(), 2),
        "avg_lead_time": round(df["Lead times"].mean(), 1),

        "skin_care_revenue": revenue_by_product.get("skincare", 0),
        "hair_care_revenue": revenue_by_product.get("haircare", 0),
        "cosmetics_revenue": revenue_by_product.get("cosmetics", 0),
        "fragrance_revenue": revenue_by_product.get("fragrance", 0),
        "other_revenue": revenue_by_product.get("others", 0),
    }

# -----------------------------
# INVENTORY KPIs
# -----------------------------
@app.get("/inventory-kpis")
def get_inventory():
    df_clean = df.copy()

    df_clean["Stock levels"] = pd.to_numeric(df_clean["Stock levels"], errors="coerce")
    df_clean["Order quantities"] = pd.to_numeric(df_clean["Order quantities"], errors="coerce")
    df_clean = df_clean.dropna(subset=["Stock levels", "Order quantities"])

    scatter_data = [
        {
            "product": row["Product type"],
            "sku": row["SKU"],
            "x": int(row["Stock levels"]),      # Stock
            "y": int(row["Order quantities"]),  # Demand
        }
        for _, row in df_clean.iterrows()
    ]

    return {"scatter_data": scatter_data}

# -----------------------------
# LOGISTICS KPIs
# -----------------------------
@app.get("/logistics-kpis")
def get_logistics():
    grouped = (
        df.groupby("Shipping carriers")
        .agg(
            avg_shipping_cost=("Shipping costs", "mean"),
            avg_shipping_time=("Shipping times", "mean")
        )
        .reset_index()
    )

    return {
        "carriers": grouped["Shipping carriers"].tolist(),
        "avg_shipping_cost": grouped["avg_shipping_cost"].round(2).tolist(),
        "avg_shipping_time": grouped["avg_shipping_time"].round(1).tolist(),
    }

# -----------------------------
# AI INSIGHTS (STATIC SUMMARY)
# -----------------------------
@app.get("/ai-insights")
def get_ai_insights():
    top_product = (
        df.groupby("Product type")["Revenue generated"]
        .sum()
        .idxmax()
    )

    return {
        "insights": [
            f"{top_product.capitalize()} generates the highest revenue",
            "Demand variability is high across SKUs",
            "Inventory imbalance exists in multiple products",
        ],
        "recommendation":
            f"Prioritize supply planning for {top_product} to avoid lost sales"
    }

# =====================================================
# 🤖 AI COPILOT (DATA-AWARE, GENERIC)
# =====================================================

class AIQueryRequest(BaseModel):
    question: str


def analyze_question(question: str):
    q = question.lower()

    revenue_by_product = df.groupby("Product type")["Revenue generated"].sum()
    stock_avg = df["Stock levels"].mean()
    demand_avg = df["Order quantities"].mean()

    top_category = revenue_by_product.idxmax()
    top_revenue = revenue_by_product.max()

    # ---------- REVENUE ----------
    if "revenue" in q or "sales" in q:
        return {
            "confidence": 0.95,
            "insights": [
                f"{top_category.capitalize()} leads in total revenue",
                "Revenue concentration differs by product category",
            ],
            "metrics": {
                "Top Category": top_category,
                "Top Revenue": round(top_revenue, 2),
            },
            "recommendation":
                "Strengthen forecasting and promotion for high-revenue categories"
        }

    # ---------- WHY / EXPLANATION ----------
    if "why" in q:
        return {
            "confidence": 0.92,
            "insights": [
                "High demand concentration drives category leadership",
                "Inventory availability directly impacts revenue realization",
                "Operational efficiency supports repeat sales",
            ],
            "metrics": {
                "Avg Stock": int(stock_avg),
                "Avg Demand": int(demand_avg),
            },
            "recommendation":
                "Align inventory planning with demand patterns to sustain growth"
        }

    # ---------- INVENTORY ----------
    if "inventory" in q or "stock" in q:
        status = "Healthy" if stock_avg >= demand_avg else "At Risk"
        return {
            "confidence": 0.93,
            "insights": [
                f"Overall inventory health is {status}",
                "Several SKUs show demand exceeding stock",
            ],
            "metrics": {
                "Avg Stock": int(stock_avg),
                "Avg Demand": int(demand_avg),
            },
            "recommendation":
                "Rebalance stock from surplus SKUs to high-demand products"
        }

    # ---------- LOGISTICS ----------
    if "shipping" in q or "logistics" in q:
        return {
            "confidence": 0.90,
            "insights": [
                "Shipping cost varies significantly across carriers",
                "Faster shipping often increases cost",
            ],
            "metrics": {
                "Avg Shipping Cost": round(df["Shipping costs"].mean(), 2),
                "Avg Shipping Time": round(df["Shipping times"].mean(), 1),
            },
            "recommendation":
                "Optimize carrier mix to balance cost and delivery speed"
        }

    # ---------- DEFAULT ----------
    return {
        "confidence": 0.75,
        "insights": [
            "This dashboard tracks revenue, inventory, and logistics performance",
            "Key risks include demand volatility and inventory imbalance",
        ],
        "metrics": {},
        "recommendation":
            "Ask about revenue, inventory health, logistics, or performance drivers"
    }


@app.post("/ai-query")
def ai_query(payload: AIQueryRequest):
    return analyze_question(payload.question)
