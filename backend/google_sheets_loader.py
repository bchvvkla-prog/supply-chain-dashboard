import gspread
import pandas as pd
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def load_supply_chain_data():
    creds = Credentials.from_service_account_file(
        "/etc/secrets/google_sheets_key.json",
        scopes=SCOPES,
    )

    client = gspread.authorize(creds)

    SHEET_ID = "1bRvdZjt0zQ6n--fCRneXLXlyrMqEIIWHYiz46aMTYlM"
    WORKSHEET_NAME = "Sheet1"  # change only if tab name differs

    sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)
    records = sheet.get_all_records()

    return pd.DataFrame(records)
