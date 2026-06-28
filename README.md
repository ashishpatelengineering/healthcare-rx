# Healthcare Rx — Analytics Platform

Enterprise prescription analytics built on React + FastAPI + Snowflake.
Deployed on Render (backend) and Vercel (frontend).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Step 1 — Snowflake Setup](#step-1--snowflake-setup)
3. [Step 2 — Project Structure](#step-2--project-structure)
4. [Step 3 — Run Locally](#step-3--run-locally)
5. [Step 4 — Push to GitHub with VS Code](#step-4--push-to-github-with-vs-code)
6. [Step 5 — Deploy Backend on Render](#step-5--deploy-backend-on-render)
7. [Step 6 — Deploy Frontend on Vercel](#step-6--deploy-frontend-on-vercel)
8. [Making Changes After Deployment](#making-changes-after-deployment)
9. [Snowflake Views Reference](#snowflake-views-reference)

---

## Architecture Overview

```
Your PC (VS Code)
      │
      ▼
GitHub (private repository — stores all code, SQL, data)
      │
      ├──▶  Render  (hosts FastAPI backend — connects to Snowflake)
      │
      └──▶  Vercel  (hosts React frontend — free forever)
```

**Tech Stack**

| Layer    | Technology                  |
|----------|-----------------------------|
| Frontend | React 18 + Vite + Plotly.js |
| Backend  | FastAPI + Python            |
| Database | Snowflake                   |
| Hosting  | Render (backend) + Vercel (frontend) |

---

## Step 1 — Snowflake Setup

### 1.1 Create a Snowflake Account

1. Go to **snowflake.com** → click **Start for Free**
2. Fill in your details and verify your email
3. Log in to your Snowflake account

### 1.2 Note Your Account Identifier

In Snowflake, click your name at the bottom left → **Account** → copy your **Account Identifier**.
It looks like: `abc12345.us-east-1`

You will need this for your credentials later.

### 1.3 Run the SQL Scripts

The `sql/` folder in this project contains three scripts that build the full data pipeline.
Run them **in order** in Snowflake — one at a time.

In Snowflake:
1. Click **Worksheets** in the left menu
2. Click **+** to open a new worksheet
3. Copy the contents of each SQL file, paste it in, and click **Run All**

**Order to run:**

```
sql/01_raw_layer.sql       ← Creates the raw tables and loads source data
sql/02_int_layer.sql       ← Cleans and standardises the data
sql/03_view_layer.sql      ← Creates the analytics views used by the app
```

### 1.4 Verify Views Were Created

After running all three scripts, run this in a Snowflake worksheet to confirm:

```sql
SHOW VIEWS IN SCHEMA ANALYTICS_DB.HEALTHCARE;
```

You should see these 9 views:

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

---

## Step 2 — Project Structure

Your project folder should look like this:

```
healthcare-rx/
├── backend/
│   ├── main.py                 ← FastAPI app — all Snowflake queries
│   ├── requirements.txt        ← Python dependencies
│   └── .env.example            ← Credentials template (safe to push)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── api.js
│       ├── constants.js
│       ├── utils.js
│       ├── context/
│       │   └── FilterContext.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── KPICard.jsx
│       │   ├── Chart.jsx
│       │   ├── DataTable.jsx
│       │   ├── PageHeader.jsx
│       │   └── States.jsx
│       └── pages/
│           ├── About.jsx
│           ├── ExecutiveOverview.jsx
│           ├── PrescriptionVolume.jsx
│           ├── FulfillmentPerformance.jsx
│           ├── HospitalScorecard.jsx
│           ├── FinancialPerformance.jsx
│           ├── DrugPerformance.jsx
│           └── RegionalPerformance.jsx
├── sql/
│   ├── 01_raw_layer.sql
│   ├── 02_int_layer.sql
│   └── 03_view_layer.sql
├── data/
│   ├── hospitals.csv
│   ├── drugs.csv
│   ├── channels.csv
│   └── prescriptions.csv
├── .gitignore
└── README.md
```

---

## Step 3 — Run Locally

You need two terminals open at the same time — one for the backend, one for the frontend.

### Prerequisites

- Python 3.11 or higher — download from **python.org**
- Node.js 18 or higher — download from **nodejs.org**
- Git — download from **git-scm.com/download/win**

### 3.1 Set Up Your Credentials

In the `backend/` folder, copy `.env.example` and rename the copy to `.env`.
Open `.env` in any text editor and fill in your Snowflake credentials:

```
SNOWFLAKE_ACCOUNT=XXXXXXX-XXXXXXX
SNOWFLAKE_USER=YOUR_USERNAME
SNOWFLAKE_PASSWORD=your_password_here
SNOWFLAKE_WAREHOUSE=HEALTHCARE_WH
SNOWFLAKE_DATABASE=ANALYTICS_DB
SNOWFLAKE_SCHEMA=HEALTHCARE
SNOWFLAKE_ROLE=ACCOUNTADMIN
```

> The SNOWFLAKE_ACCOUNT format is two parts separated by a dash e.g. MQQBDOA-RT34396. Do NOT include .snowflakecomputing.com

Save it. **Never push this file to GitHub** — it is already listed in `.gitignore`.

### 3.2 Terminal 1 — Start the Backend

Open Windows Terminal and run these one by one:

```bash
cd C:\Users\YourName\Desktop\healthcare-rx\backend
```
```bash
python -m venv venv
```
```bash
venv\Scripts\activate
```
```bash
pip install -r requirements.txt
```
```bash
uvicorn main:app --reload --port 8000
```

Leave this terminal open and running.

**Test it:** Open http://localhost:8000/health in your browser.
Should show `{"status":"ok"}`

### 3.3 Terminal 2 — Start the Frontend

Open a **second** Windows Terminal window and run:

```bash
cd C:\Users\YourName\Desktop\healthcare-rx\frontend
```
```bash
npm install
```
```bash
npm run dev
```

Leave this terminal open too.

**Open the app:** http://localhost:3000

> The frontend automatically talks to the backend via the proxy in `vite.config.js`.
> No extra configuration needed for local development.

### 3.4 Stopping the App

- Press `Ctrl+C` in both terminals to stop the servers
- Run `deactivate` in the backend terminal to exit the virtual environment

---

## Step 4 — Push to GitHub with VS Code

### 4.1 Install Required Tools

- **VS Code** — code.visualstudio.com
- **Git** — git-scm.com/download/win (install with all default options)
- Restart VS Code after installing Git

### 4.2 Create a GitHub Account

Go to **github.com** and sign up for a free account.

### 4.3 Create a Private Repository

1. On GitHub, click **+** (top right) → **New repository**
2. Name it `healthcare-rx`
3. Set it to **Private**
4. Tick **Add a README file**
5. Click **Create repository**

### 4.4 Create a .gitignore File

In your `healthcare-rx` folder, create a file called `.gitignore` (no extension) and paste:

```
.env
*.env
__pycache__/
venv/
node_modules/
dist/
.DS_Store
```

This ensures your real Snowflake credentials are never pushed to GitHub.

### 4.5 Open Project in VS Code

1. Open VS Code
2. Click **File** → **Open Folder**
3. Select your `healthcare-rx` folder

### 4.6 Configure Git Identity (first time only)

Click **Terminal** in the top menu → **New Terminal** and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

Use the same email you signed up with on GitHub.

### 4.7 Sign in to GitHub from VS Code

1. Click the **Accounts** icon at the bottom left (person icon)
2. Click **Sign in with GitHub**
3. Browser opens → log in → click **Authorize**
4. Return to VS Code — you are now signed in

### 4.8 Push Your Code

1. Click the **Source Control** icon on the left sidebar (branch icon)
2. Click **Initialize Repository**
3. All your files appear as changes in the left panel
4. Type `initial commit` in the message box at the top
5. Click **Commit** (tick icon) → click **Yes** to stage all changes
6. Click **Publish Branch**
7. Choose **Publish to GitHub Private Repository**
8. Name it `healthcare-rx` → click **OK**

VS Code pushes everything to GitHub. Go to github.com to verify all files are there.

---

## Step 5 — Deploy Backend on Render

Render hosts your FastAPI backend and connects it to Snowflake.

### 5.1 Create a Render Account

Go to **render.com** → click **Sign up with GitHub**

### 5.2 Create a New Web Service

1. Click **New** → **Web Service**
2. Click **Connect GitHub** → select **Only select repositories** → choose `healthcare-rx` → click **Install**
3. Click on `ashishpatelengineering/healthcare-rx`

### 5.3 Configure the Service

Fill in these settings:

```
Name:             healthcare-rx-backend
Region:           closest to you
Branch:           main
Root Directory:   backend
Runtime:          Python
Build Command:    pip install -r requirements.txt
Start Command:    uvicorn main:app --host 0.0.0.0 --port $PORT
Instance Type:    Free ($0/month)
```

### 5.4 Add Snowflake Credentials

Scroll down to **Environment Variables** and add each one:

```
SNOWFLAKE_ACCOUNT     → your value
SNOWFLAKE_USER        → your value
SNOWFLAKE_PASSWORD    → your value
SNOWFLAKE_WAREHOUSE   → your value
SNOWFLAKE_DATABASE    → your value
SNOWFLAKE_SCHEMA      → your value
SNOWFLAKE_ROLE        → your value
```

### 5.5 Deploy

Click **Create Web Service** and wait 2–3 minutes.

### 5.6 Verify It Is Live

Open this URL in your browser:
```
https://healthcare-rx-backend.onrender.com/health
```

Should show `{"status":"ok"}`

Also test a data endpoint:
```
https://healthcare-rx-backend.onrender.com/api/monthly-rx-volume
```

Should return JSON data from Snowflake.

> **Note:** On the free tier, Render spins down after 15 minutes of inactivity.
> The first visit after a period of no use takes 30–50 seconds to wake up.
> After that it runs at normal speed.

---

## Step 6 — Deploy Frontend on Vercel

Vercel hosts your React frontend. It is free forever on the Hobby plan.

### 6.1 Create a Vercel Account

Go to **vercel.com** → click **Sign up with GitHub**

### 6.2 Create a New Project

1. Click **Add New** → **Project**
2. Select your `healthcare-rx` repository
3. Click **Import**

### 6.3 Configure the Project

```
Root Directory:   frontend
Framework Preset: Vite
```

### 6.4 Add the Backend URL

Under **Environment Variables** add:

```
VITE_API_URL → https://healthcare-rx-backend.onrender.com
```

No trailing slash at the end.

### 6.5 Deploy

Click **Deploy** and wait about 1 minute.

Vercel gives you a live URL like:
```
https://healthcare-rx.vercel.app
```

Open it — your app is fully live. 🎉

---

## Making Changes After Deployment

Whenever you change any file:

### In VS Code

1. Click the **Source Control** icon on the left
2. Type a short description of what you changed
3. Click **Commit**
4. Click **Sync Changes**

That's it. Both Render and Vercel detect the push from GitHub and automatically redeploy. No manual steps needed.

---

## Snowflake Views Reference

All views are read-only. The app does not write or modify any data.

| View | Used By |
|------|---------|
| `VW_MONTHLY_RX_VOLUME` | Prescription Volume, Executive Overview |
| `VW_FULFILLMENT_SPEED` | Fulfillment Performance |
| `VW_FULFILLMENT_SPEED_TREND` | Fulfillment Performance, Executive Overview |
| `VW_NEW_VS_REFILL_TREND` | Prescription Volume |
| `VW_MONTHLY_FINANCIALS` | Financial Performance, Executive Overview |
| `VW_HOSPITAL_SCORECARD` | Hospital Scorecard, Executive Overview |
| `VW_HOSPITAL_CHANNEL` | Hospital Scorecard |
| `VW_DRUG_CATEGORY_PERFORMANCE` | Drug Performance |
| `VW_REGIONAL_PERFORMANCE` | Regional Performance |

---

## Credentials Reference

Keep your `.env` file safe and never share it. Here is what each value means:

| Variable | Where to Find It |
|----------|-----------------|
| `SNOWFLAKE_ACCOUNT` | Snowflake → click your name bottom left → Account → copy the identifier. Format looks like MQQBDOA-RT34396 (two parts separated by a dash) |
| `SNOWFLAKE_USER` | Your Snowflake login username |
| `SNOWFLAKE_PASSWORD` | Your Snowflake login password |
| `SNOWFLAKE_WAREHOUSE` | Snowflake → Admin → Warehouses |
| `SNOWFLAKE_DATABASE` | `ANALYTICS_DB` (created by the SQL scripts) |
| `SNOWFLAKE_SCHEMA` | `HEALTHCARE` (created by the SQL scripts) |
| `SNOWFLAKE_ROLE` | `ACCOUNTADMIN` or your assigned role |
