from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from google_sheets_loader import load_supply_chain_data

app = FastAPI()

# -----------------------------
# ✅ CORS (PRODUCTION SAFE)
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://supply-chain-dashboard-umber.vercel.app",
        "https://portal.brevanext.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# ROOT HEALTH CHECK
# -----------------------------
@app.get("/")
def root():
    return {"message": "Supply Chain API running"}

# -----------------------------
# COMMON DATA CLEANER
# -----------------------------
def get_clean_df():
    df = load_supply_chain_data()
    df.columns = [c.strip() for c in df.columns]

    numeric_columns = [
        "Revenue generated",
        "Number of products sold",
        "Shipping costs",
        "Lead times",
        "Stock levels",
        "Order quantities",
    ]

    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(
        subset=[
            "Revenue generated",
            "Number of products sold",
            "Stock levels",
            "Order quantities",
        ]
    )

    return df

# -----------------------------
# KPI ENDPOINT
# -----------------------------
@app.get("/kpis")
def get_kpis():
    df = get_clean_df()

    if df.empty:
        return {
            "total_revenue": 0,
            "total_units_sold": 0,
            "avg_defect_rate": "N/A",
            "avg_shipping_cost": 0,
            "avg_lead_time": 0,
            "skin_care_revenue": 0,
            "hair_care_revenue": 0,
            "cosmetics_revenue": 0,
            "fragrance_revenue": 0,
            "other_revenue": 0,
        }

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
    df = get_clean_df()

    scatter_data = [
        {
            "product": row.get("Product type"),
            "sku": row.get("SKU"),
            "x": int(row["Stock levels"]),
            "y": int(row["Order quantities"]),
        }
        for _, row in df.iterrows()
    ]

    return {"scatter_data": scatter_data}

# -----------------------------
# LOGISTICS KPIs
# -----------------------------
@app.get("/logistics-kpis")
def get_logistics():
    df = get_clean_df()

    if df.empty or "Shipping carriers" not in df.columns:
        return {
            "carriers": [],
            "avg_shipping_cost": [],
            "avg_shipping_time": [],
        }

    grouped = (
        df.groupby("Shipping carriers")
        .agg(
            avg_shipping_cost=("Shipping costs", "mean"),
            avg_shipping_time=("Lead times", "mean"),
        )
        .reset_index()
    )

    return {
        "carriers": grouped["Shipping carriers"].tolist(),
        "avg_shipping_cost": grouped["avg_shipping_cost"].round(2).tolist(),
        "avg_shipping_time": grouped["avg_shipping_time"].round(1).tolist(),
    }

# -----------------------------
# AI INSIGHTS
# -----------------------------
@app.get("/ai-insights")
def get_ai_insights():
    df = get_clean_df()

    if df.empty:
        return {
            "insights": ["No sufficient data available"],
            "recommendation": "Please ensure data is filled correctly",
        }

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
        "recommendation": f"Prioritize supply planning for {top_product} to avoid lost sales",
    }

# -----------------------------
# AI COPILOT
# -----------------------------
class AIQueryRequest(BaseModel):
    question: str

@app.post("/ai-query")
def ai_query(payload: AIQueryRequest):
    df = get_clean_df()
    q = payload.question.lower()

    if df.empty:
        return {
            "confidence": 0.0,
            "insights": ["No valid data available"],
            "metrics": {},
            "recommendation": "Fix data in Google Sheet",
        }

    revenue_by_product = df.groupby("Product type")["Revenue generated"].sum()
    top_category = revenue_by_product.idxmax()
    top_revenue = revenue_by_product.max()

    if "revenue" in q or "sales" in q:
        return {
            "confidence": 0.95,
            "insights": [f"{top_category.capitalize()} leads in total revenue"],
            "metrics": {
                "Top Category": top_category,
                "Top Revenue": round(top_revenue, 2),
            },
            "recommendation": "Strengthen forecasting for high-revenue categories",
        }

    return {
        "confidence": 0.75,
        "insights": ["Ask about revenue, inventory, or logistics"],
        "metrics": {},
        "recommendation": "Use the AI Copilot for operational insights",
    }
