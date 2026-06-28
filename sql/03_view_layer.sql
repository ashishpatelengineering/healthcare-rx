-- ============================================================
-- LAYER 3: ANALYTICS_DB
-- Purpose : Business-ready views. No raw data exposed. Read-only.
--           Rebuild anytime — no data stored here.
-- ============================================================

USE DATABASE  ANALYTICS_DB;
USE WAREHOUSE HEALTHCARE_WH;
CREATE SCHEMA IF NOT EXISTS ANALYTICS_DB.HEALTHCARE;
USE SCHEMA    ANALYTICS_DB.HEALTHCARE;


-- ============================================================
-- VIEW 1 · Monthly Prescription Volume
-- Chart: Rx Written vs Filled — bar + line over time
-- ============================================================
CREATE OR REPLACE VIEW VW_MONTHLY_RX_VOLUME AS
SELECT
    d.month_label,
    d.year,
    d.month_num,
    d.quarter_label,
    COUNT(*)                                                    AS rx_written,
    SUM(f.is_fulfilled::INT)                                    AS rx_filled,
    SUM(CASE WHEN f.is_refill     THEN 1 ELSE 0 END)           AS rx_refill,
    SUM(CASE WHEN NOT f.is_refill THEN 1 ELSE 0 END)           AS rx_new,
    ROUND(AVG(f.is_fulfilled::INT)*100, 2)                     AS fill_rate_pct,
    ROUND(AVG(f.is_same_day_fulfilled::INT)*100, 2)            AS same_day_rate_pct,
    ROUND(AVG(f.is_subsequent_day_fulfilled::INT)*100, 2)      AS subsequent_day_rate_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_DATE d
    ON f.prescription_date = d.calendar_date
GROUP BY 1,2,3,4
ORDER BY 2,3;


-- ============================================================
-- VIEW 2 · Fulfillment Speed Breakdown
-- Chart: Fulfillment bucket share per channel — donut + bar
-- ============================================================
CREATE OR REPLACE VIEW VW_FULFILLMENT_SPEED AS
SELECT
    c.channel_name,
    f.fulfillment_bucket,
    COUNT(*) AS rx_count,
    ROUND(COUNT(*) * 100.0
        / SUM(COUNT(*)) OVER (PARTITION BY c.channel_name), 2) AS pct_of_channel
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_CHANNEL c
    ON f.channel_id = c.channel_id
GROUP BY 1,2
ORDER BY 1,
    CASE f.fulfillment_bucket
        WHEN 'Same Day Fulfilled'        THEN 1
        WHEN 'Subsequent Days Fulfilled' THEN 2
        WHEN 'Unfulfilled'               THEN 3
        ELSE 4
    END;


-- ============================================================
-- VIEW 3 · Fulfillment Bucket by Month (trend)
-- Chart: Bucket share over time
-- ============================================================
CREATE OR REPLACE VIEW VW_FULFILLMENT_SPEED_TREND AS
SELECT
    d.month_label,
    d.year,
    d.month_num,
    d.quarter_label,
    c.channel_name,
    f.fulfillment_bucket,
    COUNT(*) AS rx_count
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_DATE d
    ON f.prescription_date = d.calendar_date
JOIN INT_DB.HEALTHCARE.DIM_CHANNEL c
    ON f.channel_id = c.channel_id
GROUP BY 1,2,3,4,5,6
ORDER BY 2,3,5,6;


-- ============================================================
-- VIEW 4 · Hospital Performance Scorecard
-- Chart: Fill rate, same-day rate, revenue per hospital
-- ============================================================
CREATE OR REPLACE VIEW VW_HOSPITAL_SCORECARD AS
SELECT
    h.hospital_id,
    h.hospital_name,
    h.region,
    h.hospital_size,
    h.city,
    h.state,
    COUNT(*)                                                           AS total_rx,
    SUM(f.is_fulfilled::INT)                                           AS total_filled,
    ROUND(AVG(f.is_fulfilled::INT)*100, 2)                            AS fill_rate_pct,
    ROUND(AVG(f.is_same_day_fulfilled::INT)*100, 2)                   AS same_day_fill_rate_pct,
    ROUND(AVG(f.is_subsequent_day_fulfilled::INT)*100, 2)             AS subsequent_day_fill_rate_pct,
    ROUND(AVG(CASE WHEN f.is_fulfilled THEN f.days_to_fulfill END), 2) AS avg_days_to_fill,
    ROUND(SUM(f.revenue), 2)                                          AS total_revenue,
    ROUND(SUM(f.cost), 2)                                             AS total_cost,
    ROUND(SUM(f.margin), 2)                                           AS total_margin,
    ROUND(AVG(f.margin_pct), 2)                                       AS avg_margin_pct,
    SUM(CASE WHEN f.is_refill THEN 1 ELSE 0 END)                     AS total_refills,
    ROUND(
        SUM(CASE WHEN f.is_refill THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*),0)
    , 2)                                                               AS refill_rate_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_HOSPITAL h
    ON f.hospital_id = h.hospital_id
GROUP BY 1,2,3,4,5,6;


-- ============================================================
-- VIEW 5 · Hospital × Channel Performance
-- Chart: Revenue stacked bar, fulfillment heatmap
-- ============================================================
CREATE OR REPLACE VIEW VW_HOSPITAL_CHANNEL AS
SELECT
    h.hospital_name,
    h.region,
    h.hospital_size,
    h.state,
    c.channel_name,
    COUNT(*)                                                            AS total_rx,
    SUM(f.is_fulfilled::INT)                                            AS total_filled,
    ROUND(AVG(f.is_fulfilled::INT)*100, 2)                             AS fill_rate_pct,
    ROUND(AVG(CASE WHEN f.is_fulfilled THEN f.days_to_fulfill END), 2) AS avg_days_to_fill,
    ROUND(AVG(f.is_same_day_fulfilled::INT)*100, 2)                    AS same_day_rate_pct,
    ROUND(SUM(f.revenue), 2)                                           AS revenue,
    ROUND(SUM(f.margin), 2)                                            AS margin,
    ROUND(AVG(f.margin_pct), 2)                                        AS avg_margin_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_HOSPITAL h
    ON f.hospital_id = h.hospital_id
JOIN INT_DB.HEALTHCARE.DIM_CHANNEL c
    ON f.channel_id = c.channel_id
GROUP BY 1,2,3,4,5;


-- ============================================================
-- VIEW 6 · Monthly Revenue / Cost / Margin
-- Chart: P&L waterfall / grouped bar
-- ============================================================
CREATE OR REPLACE VIEW VW_MONTHLY_FINANCIALS AS
SELECT
    d.month_label,
    d.year,
    d.month_num,
    d.quarter_label,
    c.channel_name,
    ROUND(SUM(f.revenue), 2)      AS revenue,
    ROUND(SUM(f.cost), 2)         AS cost,
    ROUND(SUM(f.margin), 2)       AS margin,
    ROUND(AVG(f.margin_pct), 2)   AS avg_margin_pct,
    COUNT(*)                      AS rx_filled
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_DATE d
    ON f.prescription_date = d.calendar_date
JOIN INT_DB.HEALTHCARE.DIM_CHANNEL c
    ON f.channel_id = c.channel_id
WHERE f.is_fulfilled
GROUP BY 1,2,3,4,5
ORDER BY 2,3,5;


-- ============================================================
-- VIEW 7 · Drug Category Performance
-- Chart: Revenue, margin %, volume by category
-- ============================================================
CREATE OR REPLACE VIEW VW_DRUG_CATEGORY_PERFORMANCE AS
SELECT
    dr.drug_category,
    dr.drug_class,
    dr.drug_name,
    COUNT(*)                                     AS total_rx,
    SUM(f.is_fulfilled::INT)                     AS total_filled,
    ROUND(AVG(f.is_fulfilled::INT)*100, 2)       AS fill_rate_pct,
    ROUND(SUM(f.revenue), 2)                     AS revenue,
    ROUND(SUM(f.cost), 2)                        AS cost,
    ROUND(SUM(f.margin), 2)                      AS margin,
    ROUND(AVG(f.margin_pct), 2)                  AS avg_margin_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_DRUG dr
    ON f.drug_id = dr.drug_id
GROUP BY 1,2,3;


-- ============================================================
-- VIEW 8 · Prescription Status Pipeline
-- Chart: Status funnel / donut
-- ============================================================
CREATE OR REPLACE VIEW VW_STATUS_PIPELINE AS
SELECT
    f.status,
    c.channel_name,
    COUNT(*) AS rx_count,
    ROUND(COUNT(*)*100.0 / SUM(COUNT(*)) OVER(), 2)                             AS pct_of_total,
    ROUND(COUNT(*)*100.0 / SUM(COUNT(*)) OVER (PARTITION BY c.channel_name), 2) AS pct_within_channel
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_CHANNEL c
    ON f.channel_id = c.channel_id
GROUP BY 1,2;


-- ============================================================
-- VIEW 9 · New vs Refill Monthly Trend
-- Chart: Stacked area over time
-- ============================================================
CREATE OR REPLACE VIEW VW_NEW_VS_REFILL_TREND AS
SELECT
    d.month_label,
    d.year,
    d.month_num,
    d.quarter_label,
    CASE WHEN f.is_refill THEN 'Refill' ELSE 'New' END AS rx_type,
    COUNT(*) AS rx_count,
    SUM(f.is_fulfilled::INT)                            AS filled_count,
    ROUND(AVG(f.is_fulfilled::INT)*100,2)               AS fill_rate_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_DATE d
    ON f.prescription_date = d.calendar_date
GROUP BY 1,2,3,4,5
ORDER BY 2,3,4;


-- ============================================================
-- VIEW 10 · KPI Summary (full-dataset snapshot)
-- Note: intentionally un-filtered — used only for About page
--       context. All dashboard KPIs are derived from filtered
--       time-series views in the application layer.
-- ============================================================
CREATE OR REPLACE VIEW VW_KPI_SUMMARY AS
SELECT
    COUNT(*)                                                            AS total_prescriptions,
    SUM(is_fulfilled::INT)                                             AS total_filled,
    ROUND(AVG(is_fulfilled::INT)*100, 1)                              AS overall_fill_rate_pct,
    ROUND(AVG(is_same_day_fulfilled::INT)*100, 1)                     AS overall_same_day_rate_pct,
    ROUND(AVG(is_subsequent_day_fulfilled::INT)*100, 1)               AS overall_subsequent_day_rate_pct,
    ROUND(AVG(CASE WHEN is_fulfilled THEN days_to_fulfill END), 2)    AS avg_days_to_fill,
    ROUND(SUM(revenue)/1000000, 2)                                    AS total_revenue_m,
    ROUND(SUM(cost)/1000000, 2)                                       AS total_cost_m,
    ROUND(SUM(margin)/1000000, 2)                                     AS total_margin_m,
    ROUND(AVG(margin_pct), 1)                                         AS avg_margin_pct,
    SUM(CASE WHEN is_refill THEN 1 ELSE 0 END)                       AS total_refills,
    ROUND(
        SUM(CASE WHEN is_refill THEN 1 ELSE 0 END)*100.0/COUNT(*), 1
    )                                                                  AS refill_rate_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS;


-- ============================================================
-- VIEW 11 · Regional Rollup
-- Chart: Map / regional bar comparison
-- ============================================================
CREATE OR REPLACE VIEW VW_REGIONAL_PERFORMANCE AS
SELECT
    h.region,
    COUNT(DISTINCT h.hospital_id)                          AS hospital_count,
    COUNT(*)                                               AS total_rx,
    SUM(f.is_fulfilled::INT)                              AS total_filled,
    ROUND(AVG(f.is_fulfilled::INT)*100,2)                 AS fill_rate_pct,
    ROUND(AVG(f.is_same_day_fulfilled::INT)*100,2)        AS same_day_rate_pct,
    ROUND(AVG(f.is_subsequent_day_fulfilled::INT)*100,2)  AS subsequent_day_rate_pct,
    ROUND(AVG(1 - f.is_fulfilled::INT)*100,2)             AS unfulfilled_rate_pct,
    ROUND(SUM(f.revenue),2)                               AS revenue,
    ROUND(SUM(f.margin),2)                                AS margin,
    ROUND(AVG(f.margin_pct),2)                            AS avg_margin_pct
FROM INT_DB.HEALTHCARE.FCT_PRESCRIPTIONS f
JOIN INT_DB.HEALTHCARE.DIM_HOSPITAL h
    ON f.hospital_id = h.hospital_id
GROUP BY 1;


-- ============================================================
-- Validation queries — run after CREATE to sanity-check
-- ============================================================
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_MONTHLY_RX_VOLUME ORDER BY year, month_num;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_FULFILLMENT_SPEED ORDER BY channel_name;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_FULFILLMENT_SPEED_TREND ORDER BY year, month_num;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_HOSPITAL_SCORECARD ORDER BY total_revenue DESC;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_HOSPITAL_CHANNEL;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_MONTHLY_FINANCIALS ORDER BY year, month_num;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_DRUG_CATEGORY_PERFORMANCE ORDER BY revenue DESC;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_STATUS_PIPELINE;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_NEW_VS_REFILL_TREND ORDER BY year, month_num;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_KPI_SUMMARY;
-- SELECT * FROM ANALYTICS_DB.HEALTHCARE.VW_REGIONAL_PERFORMANCE ORDER BY revenue DESC;
