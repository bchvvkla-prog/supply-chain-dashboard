import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "supply_chain_data.csv"


def load_and_clean_data():
    df = pd.read_csv(DATA_PATH)

    df.columns = (
        df.columns
        .str.lower()
        .str.strip()
        .str.replace(" ", "_")
    )

    df["price"] = (
        df["price"]
        .str.replace("$", "", regex=False)
        .astype(float)
    )

    return df


def calculate_kpis(df):
    return {
        "total_revenue": round(df["revenue_generated"].sum(), 2),
        "total_units_sold": int(df["number_of_products_sold"].sum()),
        "average_lead_time": round(df["lead_time"].mean(), 2),
        "average_shipping_time": round(df["shipping_times"].mean(), 2),
        "average_defect_rate": round(df["defect_rates"].mean(), 4),
        "total_supply_chain_cost": round(
            df["manufacturing_costs"].sum() + df["shipping_costs"].sum(), 2
        )
    }


def calculate_inventory_kpis(df):
    low_stock_threshold = df["stock_levels"].quantile(0.25)

    return {
        "average_stock_level": round(df["stock_levels"].mean(), 2),
        "low_stock_sku_count": int(
            (df["stock_levels"] < low_stock_threshold).sum()
        ),
        "availability_rate_percent": round(
            df["availability"].value_counts(normalize=True).get("Yes", 0) * 100,
            2
        ),
        "avg_demand_per_product": round(
            df["number_of_products_sold"].mean(), 2
        )
    }

def calculate_logistics_kpis(df):
    logistics_kpis = {
        "average_shipping_time": round(df["shipping_times"].mean(), 2),
        "average_shipping_cost": round(df["shipping_costs"].mean(), 2),
    }

    # Shipping cost by transport mode
    cost_by_mode = (
        df.groupby("transportation_modes")["shipping_costs"]
        .mean()
        .round(2)
        .to_dict()
    )

    # Shipping time by transport mode
    time_by_mode = (
        df.groupby("transportation_modes")["shipping_times"]
        .mean()
        .round(2)
        .to_dict()
    )

    logistics_kpis["cost_by_transport_mode"] = cost_by_mode
    logistics_kpis["time_by_transport_mode"] = time_by_mode

    return logistics_kpis
