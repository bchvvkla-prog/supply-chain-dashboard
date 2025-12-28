import os
import json
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def load_supply_chain_data():
    print("LOADING GOOGLE SHEET...")

    # -----------------------------
    # Load credentials from ENV
    # -----------------------------
    service_account_info = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")

    if not service_account_info:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON env var not set")

    creds = Credentials.from_service_account_info(
        json.loads(service_account_info),
        scopes=SCOPES,
    )

    client = gspread.authorize(creds)

    # -----------------------------
    # Google Sheet details
    # -----------------------------
    SHEET_ID = "1bRvdZjt0zQ6n--fCRneXLXlyrMqEIIWHYiz46aMTYlM"
    WORKSHEET_NAME = "Sheet1"

    sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)
    records = sheet.get_all_records()

    if not records:
        print("WARNING: Sheet returned zero rows")

    return pd.DataFrame(records)
