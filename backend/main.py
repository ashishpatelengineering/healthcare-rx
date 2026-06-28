"""
Healthcare Rx — FastAPI Backend
Connects to Snowflake and exposes clean REST endpoints.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import snowflake.connector
import os
from decimal import Decimal
from datetime import date, datetime
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Healthcare Rx API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_conn = None

def get_conn():
    global _conn
    if _conn:
        try:
            _conn.cursor().execute("SELECT 1")
            return _conn
        except Exception:
            _conn = None
    _conn = snowflake.connector.connect(
        account   = os.getenv("SNOWFLAKE_ACCOUNT"),
        user      = os.getenv("SNOWFLAKE_USER"),
        password  = os.getenv("SNOWFLAKE_PASSWORD"),
        warehouse = os.getenv("SNOWFLAKE_WAREHOUSE", "HEALTHCARE_WH"),
        database  = os.getenv("SNOWFLAKE_DATABASE", "ANALYTICS_DB"),
        schema    = os.getenv("SNOWFLAKE_SCHEMA", "HEALTHCARE"),
        role      = os.getenv("SNOWFLAKE_ROLE", ""),
        login_timeout=10,
        network_timeout=30,
    )
    return _conn

def serialize(v):
    if v is None:            return None
    if isinstance(v, Decimal):  return float(v)
    if isinstance(v, (date, datetime)): return str(v)
    return v

def run_query(sql: str):
    try:
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(sql)
        cols = [d[0].lower() for d in cur.description]
        return [dict(zip(cols, [serialize(x) for x in row])) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/api/monthly-rx-volume")
def monthly_rx_volume():
    return run_query("SELECT * FROM VW_MONTHLY_RX_VOLUME ORDER BY year, month_num")

@app.get("/api/fulfillment-speed")
def fulfillment_speed():
    return run_query("SELECT * FROM VW_FULFILLMENT_SPEED ORDER BY channel_name")

@app.get("/api/fulfillment-speed-trend")
def fulfillment_speed_trend():
    return run_query("SELECT * FROM VW_FULFILLMENT_SPEED_TREND ORDER BY year, month_num")

@app.get("/api/new-vs-refill-trend")
def new_vs_refill_trend():
    return run_query("SELECT * FROM VW_NEW_VS_REFILL_TREND ORDER BY year, month_num")

@app.get("/api/monthly-financials")
def monthly_financials():
    return run_query("SELECT * FROM VW_MONTHLY_FINANCIALS ORDER BY year, month_num, channel_name")

@app.get("/api/hospital-scorecard")
def hospital_scorecard():
    return run_query("SELECT * FROM VW_HOSPITAL_SCORECARD ORDER BY total_revenue DESC")

@app.get("/api/hospital-channel")
def hospital_channel():
    return run_query("SELECT * FROM VW_HOSPITAL_CHANNEL")

@app.get("/api/drug-category-performance")
def drug_category_performance():
    return run_query("SELECT * FROM VW_DRUG_CATEGORY_PERFORMANCE ORDER BY revenue DESC")

@app.get("/api/regional-performance")
def regional_performance():
    return run_query("SELECT * FROM VW_REGIONAL_PERFORMANCE ORDER BY revenue DESC")

@app.get("/health")
def health():
    return {"status": "ok"}
