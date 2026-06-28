-- ============================================================
-- LAYER 2: INT_DB  (Intermediate / Integration)
-- Purpose : Clean, typed, deduplicated dims & fact.
--           Built from RAW_DB tables.
--           Run AFTER raw tables are loaded.
-- ============================================================

USE DATABASE  INT_DB;
USE WAREHOUSE HEALTHCARE_WH;
CREATE SCHEMA IF NOT EXISTS INT_DB.HEALTHCARE;
USE SCHEMA    INT_DB.HEALTHCARE;


-- ── DIM: Hospital ────────────────────────────────────────────
CREATE OR REPLACE TABLE INT_DB.HEALTHCARE.DIM_HOSPITAL AS
SELECT
    hospital_id,
    TRIM(hospital_name)                              AS hospital_name,
    INITCAP(TRIM(region))                            AS region,
    LOWER(TRIM(hospital_size))                       AS hospital_size,
    -- size tier for ordering
    CASE LOWER(TRIM(hospital_size))
        WHEN 'large'  THEN 3
        WHEN 'medium' THEN 2
        WHEN 'small'  THEN 1
        ELSE 0
    END                                              AS hospital_size_rank,
    TRIM(city)                                       AS city,
    UPPER(TRIM(state))                               AS state,
    CURRENT_TIMESTAMP()                              AS int_loaded_at
FROM RAW_DB.HEALTHCARE.RAW_HOSPITALS
QUALIFY ROW_NUMBER() OVER (PARTITION BY hospital_id ORDER BY _loaded_at DESC) = 1;


-- ── DIM: Drug ────────────────────────────────────────────────
CREATE OR REPLACE TABLE INT_DB.HEALTHCARE.DIM_DRUG AS
SELECT
    drug_id,
    TRIM(drug_category)                              AS drug_category,
    TRIM(drug_name)                                  AS drug_name,
    TRIM(drug_class)                                 AS drug_class,
    TRY_TO_NUMBER(base_cost_30d,  10, 2)             AS base_cost_30d,
    TRY_TO_NUMBER(base_price_30d, 10, 2)             AS base_price_30d,
    ROUND(
        (TRY_TO_NUMBER(base_price_30d,10,2) - TRY_TO_NUMBER(base_cost_30d,10,2))
        / NULLIF(TRY_TO_NUMBER(base_price_30d,10,2),0) * 100
    , 1)                                             AS standard_margin_pct,
    CURRENT_TIMESTAMP()                              AS int_loaded_at
FROM RAW_DB.HEALTHCARE.RAW_DRUGS
QUALIFY ROW_NUMBER() OVER (PARTITION BY drug_id ORDER BY _loaded_at DESC) = 1;


-- ── DIM: Channel ─────────────────────────────────────────────
CREATE OR REPLACE TABLE INT_DB.HEALTHCARE.DIM_CHANNEL AS
SELECT
    channel_id,
    TRIM(channel_name)     AS channel_name,
    TRIM(channel_type)     AS channel_type,
    TRIM(fulfillment_mode) AS fulfillment_mode,
    notes,
    CURRENT_TIMESTAMP()    AS int_loaded_at
FROM RAW_DB.HEALTHCARE.RAW_CHANNELS
QUALIFY ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY _loaded_at DESC) = 1;


-- ── DIM: Date ────────────────────────────────────────────────
-- Generate a full date spine for Jan 2023 – Dec 2024
CREATE OR REPLACE TABLE INT_DB.HEALTHCARE.DIM_DATE AS
WITH date_spine AS (
    SELECT DATEADD(DAY, SEQ4(), '2001-01-01'::DATE) AS calendar_date
    FROM TABLE(GENERATOR(ROWCOUNT => 400000))  -- 2 years
)
SELECT
    calendar_date,
    TO_CHAR(calendar_date, 'YYYYMMDD')::INT             AS date_key,
    YEAR(calendar_date)                                  AS year,
    QUARTER(calendar_date)                               AS quarter_num,
    'Q' || QUARTER(calendar_date) || ' ' || YEAR(calendar_date)
                                                         AS quarter_label,
    MONTH(calendar_date)                                 AS month_num,
    TO_CHAR(calendar_date, 'YYYY-MM')                    AS month_label,
    MONTHNAME(calendar_date)                             AS month_name,
    WEEKOFYEAR(calendar_date)                            AS week_of_year,
    DAYOFWEEK(calendar_date)                             AS day_of_week,      -- 0=Sun
    DAYNAME(calendar_date)                               AS day_name,
    CASE WHEN DAYOFWEEK(calendar_date) IN (0,6) THEN TRUE ELSE FALSE END
                                                         AS is_weekend,
    CASE WHEN MONTH(calendar_date) IN (12,1,2) THEN 'Winter'
         WHEN MONTH(calendar_date) IN (3,4,5)  THEN 'Spring'
         WHEN MONTH(calendar_date) IN (6,7,8)  THEN 'Summer'
         ELSE 'Fall'
    END                                                  AS season
FROM date_spine
WHERE calendar_date <= '2999-12-31';

-- ── FCT: Prescriptions ───────────────────────────────────────
CREATE OR REPLACE TABLE INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS AS
SELECT
    rx_id,
    prescription_date,
    fulfilled_date,
    hospital_id,
    drug_id,
    channel_id,
    INITCAP(TRIM(status)) AS status,
    is_refill::BOOLEAN AS is_refill,
    quantity_days,
    days_to_fulfill,
    cost,
    revenue,
    revenue - cost AS margin,
    CASE WHEN revenue > 0 THEN ROUND((revenue - cost) / revenue * 100, 2) END AS margin_pct,
    TRIM(status) = 'Filled' AS is_fulfilled,
    TRIM(status) = 'Filled' AND days_to_fulfill = 0 AS is_same_day_fulfilled,
    TRIM(status) = 'Filled' AND days_to_fulfill > 0 AS is_subsequent_day_fulfilled,
    TRIM(status) <> 'Filled' AS is_unfulfilled,
    CASE 
        WHEN TRIM(status) <> 'Filled' THEN 'Unfulfilled'
        WHEN days_to_fulfill = 0 THEN 'Same Day Fulfilled'
        ELSE 'Subsequent Days Fulfilled'
    END AS fulfillment_bucket,
    CURRENT_TIMESTAMP() AS int_loaded_at
FROM RAW_DB.HEALTHCARE.RAW_PRESCRIPTIONS
QUALIFY ROW_NUMBER() OVER (PARTITION BY rx_id ORDER BY _loaded_at DESC) = 1;



-- SELECT * FROM INT_DB.HEALTHCARE.DIM_HOSPITAL;
-- SELECT * FROM INT_DB.HEALTHCARE.DIM_DRUG;
-- SELECT * FROM INT_DB.HEALTHCARE.DIM_CHANNEL;
-- SELECT * FROM INT_DB.HEALTHCARE.DIM_DATE;
-- SELECT * FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS;




