# Healthcare Rx — Analytics Platform

Enterprise prescription analytics built on React + FastAPI + Snowflake.

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Your Snowflake credentials

---

### Step 1 — Backend

Open a terminal and run:

```bash
cd healthcare-rx/backend

python -m venv venv
source venv/bin/activate
# Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Open .env and fill in your Snowflake credentials
```

Then start the server:

```bash
uvicorn main:app --reload --port 8000
```

Verify it's working: http://localhost:8000/api/monthly-rx-volume should return JSON.

---

### Step 2 — Frontend

Open a **second terminal** and run:

```bash
cd healthcare-rx/frontend

npm install
npm run dev
```

Open http://localhost:3000 — your app is running.

> The frontend automatically proxies `/api` calls to `localhost:8000` via `vite.config.js`.
> No extra URL or CORS config needed locally.

---

### Stopping

- Press `Ctrl+C` in both terminals to stop the servers.
- Run `deactivate` in the backend terminal to exit the virtual environment.

---

## Snowflake Credentials (`.env`)

```
SNOWFLAKE_ACCOUNT=your_account_identifier
SNOWFLAKE_USER=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=HEALTHCARE_WH
SNOWFLAKE_DATABASE=ANALYTICS_DB
SNOWFLAKE_SCHEMA=HEALTHCARE
SNOWFLAKE_ROLE=ACCOUNTADMIN
```

---

## Deployment

Once you're happy with local testing, deploy in two steps:

**Backend → Railway**
1. Push `backend/` to GitHub
2. Connect repo at https://railway.app
3. Add your Snowflake credentials as environment variables in the Railway dashboard
4. Railway auto-detects FastAPI and deploys it — note your Railway URL

**Frontend → Vercel**
1. Push `frontend/` to GitHub
2. Connect repo at https://vercel.com
3. Set framework to **Vite**
4. Add one environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
5. Deploy — Vercel gives you a public URL

---

## Pages

| Page                   | Route          |
|------------------------|----------------|
| About                  | `/`            |
| Executive Overview     | `/executive`   |
| Prescription Volume    | `/volume`      |
| Fulfillment Performance| `/fulfillment` |
| Hospital Scorecard     | `/hospitals`   |
| Financial Performance  | `/financial`   |
| Drug Performance       | `/drugs`       |
| Regional Performance   | `/regional`    |

---

## Snowflake Views Used

```
VW_MONTHLY_RX_VOLUME
VW_FULFILLMENT_SPEED
VW_FULFILLMENT_SPEED_TREND
VW_NEW_VS_REFILL_TREND
VW_MONTHLY_FINANCIALS
VW_HOSPITAL_SCORECARD
VW_HOSPITAL_CHANNEL
VW_DRUG_CATEGORY_PERFORMANCE
VW_REGIONAL_PERFORMANCE
```

All views are read-only. No data is written by this application.
