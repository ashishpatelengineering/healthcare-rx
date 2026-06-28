-- ============================================================
-- LAYER 1: RAW_DB
-- Purpose : Exact mirror of CSV files. No transforms, no logic.
--           Load once; reload on refresh.
-- ============================================================

-- ── Databases & schema ───────────────────────────────────────
CREATE DATABASE IF NOT EXISTS RAW_DB;
CREATE DATABASE IF NOT EXISTS INT_DB;
CREATE DATABASE IF NOT EXISTS ANALYTICS_DB;

CREATE SCHEMA IF NOT EXISTS RAW_DB.HEALTHCARE;

-- ── Warehouse (free trial size) ──────────────────────────────
CREATE WAREHOUSE IF NOT EXISTS HEALTHCARE_WH
    WAREHOUSE_SIZE = 'X-SMALL'
    AUTO_SUSPEND   = 60
    AUTO_RESUME    = TRUE
    COMMENT        = 'Healthcare ELT warehouse';

USE WAREHOUSE HEALTHCARE_WH;
USE DATABASE  RAW_DB;
USE SCHEMA    HEALTHCARE;


-- ── RAW: hospitals ───────────────────────────────────────────
CREATE OR REPLACE TABLE RAW_DB.HEALTHCARE.RAW_HOSPITALS (
    hospital_id     VARCHAR(10),
    hospital_name   VARCHAR(255),
    region          VARCHAR(50),
    hospital_size   VARCHAR(20),
    city            VARCHAR(100),
    state           CHAR(2),
    _loaded_at      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── RAW: drugs ───────────────────────────────────────────────
CREATE OR REPLACE TABLE RAW_DB.HEALTHCARE.RAW_DRUGS (
    drug_id         VARCHAR(10),
    drug_category   VARCHAR(100),
    drug_name       VARCHAR(255),
    drug_class      VARCHAR(100),
    base_cost_30d   NUMBER(10,2),
    base_price_30d  NUMBER(10,2),
    _loaded_at      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── RAW: channels ────────────────────────────────────────────
CREATE OR REPLACE TABLE RAW_DB.HEALTHCARE.RAW_CHANNELS (
    channel_id       VARCHAR(10),
    channel_name     VARCHAR(100),
    channel_type     VARCHAR(50),
    fulfillment_mode VARCHAR(50),
    notes            VARCHAR(1000),
    _loaded_at       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── RAW: prescriptions (fact) ────────────────────────────────
CREATE OR REPLACE TABLE RAW_DB.HEALTHCARE.RAW_PRESCRIPTIONS (
    rx_id             VARCHAR(12),
    prescription_date DATE,
    fulfilled_date    DATE,
    hospital_id       VARCHAR(10),
    drug_id           VARCHAR(10),
    channel_id        VARCHAR(10),
    status            VARCHAR(30),
    is_refill         SMALLINT,      -- 0 = new, 1 = refill
    quantity_days     SMALLINT,      -- 30 / 60 / 90
    days_to_fulfill   SMALLINT,
    cost              NUMBER(10,2),
    revenue           NUMBER(10,2),
    _loaded_at        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);


-- ============================================================
-- HOW TO LOAD FROM LOCAL CSV (manual, free-tier friendly)
-- ============================================================
--
-- OPTION A — Snowflake Web UI (SnowSight) — Recommended for trial
-- ---------------------------------------------------------------
-- 1. Open SnowSight → Data → Databases → RAW_DB → HEALTHCARE
-- 2. Click on a table → Load Data button → upload matching CSV
-- 3. File format = CSV, Skip header = Yes, Delimiter = comma
--    For RAW_PRESCRIPTIONS also set: Date format = YYYY-MM-DD, Null string = ""
-- 4. Repeat for each table / CSV part
--
-- OPTION B — PUT + COPY (via Snowflake CLI or SnowSQL)
-- ---------------------------------------------------------------
-- Dimension tables:
--   PUT file:///path/csv/hospitals.csv @%RAW_HOSPITALS;
--   COPY INTO RAW_HOSPITALS FROM @%RAW_HOSPITALS
--       FILE_FORMAT = (TYPE=CSV SKIP_HEADER=1 FIELD_OPTIONALLY_ENCLOSED_BY='"');
--
-- Prescriptions (repeat for parts 2–6):
--   PUT file:///path/prescriptions_part1.csv @%RAW_PRESCRIPTIONS;
--   COPY INTO RAW_PRESCRIPTIONS FROM @%RAW_PRESCRIPTIONS
--       FILE_FORMAT = (
--           TYPE                         = CSV
--           SKIP_HEADER                  = 1
--           FIELD_OPTIONALLY_ENCLOSED_BY = '"'
--           DATE_FORMAT                  = 'YYYY-MM-DD'
--           EMPTY_FIELD_AS_NULL          = TRUE
--           NULL_IF                      = ('')
--       );
--
-- ============================================================


UPDATE RAW_DB.HEALTHCARE.RAW_HOSPITALS SET _loaded_at = CURRENT_TIMESTAMP();
UPDATE RAW_DB.HEALTHCARE.RAW_DRUGS SET _loaded_at = CURRENT_TIMESTAMP();
UPDATE RAW_DB.HEALTHCARE.RAW_CHANNELS SET _loaded_at = CURRENT_TIMESTAMP();
UPDATE RAW_DB.HEALTHCARE.RAW_PRESCRIPTIONS SET _loaded_at = CURRENT_TIMESTAMP();

-- SELECT * FROM RAW_DB.HEALTHCARE.RAW_HOSPITALS;
-- SELECT * FROM RAW_DB.HEALTHCARE.RAW_DRUGS;
-- SELECT * FROM RAW_DB.HEALTHCARE.RAW_CHANNELS;
-- SELECT * FROM RAW_DB.HEALTHCARE.RAW_PRESCRIPTIONS;
