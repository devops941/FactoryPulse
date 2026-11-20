# FactoryPulse – Industrial Machine Downtime Intelligence & Production Loss Estimator

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-0F766E?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-Python%20FastAPI%20%7C%20Motor-0F766E?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-16A34A?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20Light%20SaaS-0284C7?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

> **FactoryPulse** is an enterprise-grade Industrial Analytics SaaS platform engineered for manufacturing plants, operations directors, and reliability engineers. It transforms raw machine stoppage telemetry into actionable intelligence, quantifying production bottlenecks, MTBF/MTTR metrics, predictive failure risks, and monetary production loss in real currency (**USD $** & **INR ₹**).

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Key Problem Solving Capabilities](#2-key-problem-solving-capabilities)
3. [Technical Stack](#3-technical-stack)
4. [System Architecture & Data Workflow](#4-system-architecture--data-workflow)
5. [Complete Module Breakdown](#5-complete-module-breakdown)
   - [Overview Command Dashboard](#a-overview-command-dashboard)
   - [Shop Floor Digital Twin](#b-shop-floor-digital-twin)
   - [Predictive Maintenance & Reliability AI](#c-predictive-maintenance--reliability-ai)
   - [Financial Loss & OEE Calculator](#d-financial-loss--oee-calculator)
   - [Downtime Incident Logs](#e-downtime-incident-logs)
   - [Machine Analytics & Fleet Registry](#f-machine-analytics--fleet-registry)
   - [Work Shift Performance Analytics](#g-work-shift-performance-analytics)
   - [Downtime Data Import Center](#h-downtime-data-import-center)
   - [Reporting Center](#i-reporting-center)
   - [Facility & Master Configuration](#j-facility--master-configuration)
6. [How to Run the Project](#6-how-to-run-the-project)
   - [Default Admin Credentials](#default-admin-credentials)
   - [Prerequisites](#prerequisites)
   - [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [One-Click Windows Launcher](#one-click-windows-launcher)
7. [CSV Batch Import Verification Guide](#7-csv-batch-import-verification-guide)
8. [Industrial Formulas & Mathematical Foundations](#8-industrial-formulas--mathematical-foundations)

---

## 1. Executive Summary & Problem Statement

### The Industrial Challenge
In discrete and continuous manufacturing (automotive, machining, electronics, plastics), unplanned equipment downtime leads to **5%–20% loss of total plant capacity**. Factories routinely struggle with:
1. **Paper/Spreadsheet Logging:** Stoppages logged on whiteboards or disconnected Excel files with incomplete timestamps and missing root cause taxonomies.
2. **Hidden Financial Losses:** Downtime is measured only in minutes; management cannot see direct monetary loss (scrap costs, wasted labor wages, overhead idle electricity).
3. **Reactive Fire-fighting:** Maintenance teams only respond *after* catastrophic breakdowns occur rather than proactively scheduling servicing based on reliability indices.
4. **Lack of Root Cause Focus:** Failure to identify the **critical 20% of root causes that generate 80% of total factory loss** (Pareto 80/20 Law).

### The Solution: FactoryPulse
FactoryPulse delivers a single unified operational command center with a **Modern Enterprise Light Theme** (`#0F766E` Deep Teal, `#172033` Slate, `#F5F7FA` Canvas). It continuously ingests stoppage events (manual, automated streams, or bulk CSV batch imports), performs automated analytical aggregation using Pandas, and surfaces real-time KPIs, 2D shop floor telemetry, reliability forecasts, and ROI payback models.

---

## 2. Key Problem Solving Capabilities

- **Zero-Latency Availability Tracking:** Instantly computes plant fleet availability ($100\% - \text{Downtime Rate}$) against international benchmarks (>90%).
- **Pareto 80/20 Root Cause Isolation:** Automatically isolates which stoppage reasons (e.g. `Electrical Power Trip`, `Cutting Tool Replacement`) generate the majority of stoppage duration.
- **Dynamic Equipment Health Indexing (0–100%):** Weighted algorithms synthesize MTBF and repair responsiveness to grade assets (Grade A, B, C) and identify High-Risk machines.
- **Preventive Closed-Loop Dispatching:** Generates technician work orders directly from predictive risk alerts to resolve component wear before total failure.
- **Dual-Currency Financial Quantification:** Converts lost production units into direct revenue impact in both **USD ($)** and **INR (₹)**, complete with interactive ROI improvement sliders.
- **Resilient CSV Ingestion Pipeline:** Smart import engine that auto-provisions missing equipment and auto-assigns shifts based on incident timestamps.

---

## 3. Technical Stack

### Frontend Architecture
- **Core Framework:** React 18 (TypeScript, Strict Mode)
- **Build Tool:** Vite 6 (Lightning-fast HMR and optimized production bundling)
- **State & Server Cache:** TanStack Query v5 (React Query) with fine-tuned stale-time caching and automated mutation invalidations
- **Styling & Design System:** TailwindCSS with custom Enterprise Light Palette:
  - `Primary:` `#0F766E` (Deep Industrial Teal)
  - `Hover:` `#115E59`
  - `Secondary:` `#334155` (Slate Navy)
  - `Background:` `#F5F7FA` (Cool Industrial Off-White)
  - `Cards:` `#FFFFFF` with subtle `#E2E8F0` borders
  - `Semantics:` `#16A34A` (Success), `#F59E0B` (Warning), `#DC2626` (Critical), `#0284C7` (Info)
- **Data Visualizations:** Recharts (Area Trend charts, Dual-axis Pareto charts, Horizontal Ranking bars, Shift Comparison charts)
- **Forms & Validation:** React Hook Form + Zod Schema Validation
- **Icons & Telemetry UI:** Lucide React icons

### Backend Architecture
- **API Framework:** Python FastAPI (Asynchronous ASGI, OpenAPI / Swagger documentation)
- **Analytics & Calculations:** Pandas & NumPy (Duration recalculations, time-series binning, Pareto cumulative distributions, MTBF/MTTR aggregations)
- **Database Engine:** Motor (Official async Python driver for MongoDB)
- **Authentication & Security:** JWT (JSON Web Tokens) Bearer authentication, Password hashing via Bcrypt, Role-Based Access Control (RBAC)
- **Data Validation:** Pydantic v2 schemas for strict request/response data contracts

### Database (MongoDB Atlas)
- **Cloud Clusters:** MongoDB Atlas / Local MongoDB
- **Collections:**
  - `users` — Administrator and operator credentials with hashed passwords
  - `plants` — Multi-facility manufacturing plant sites and timezones
  - `lines` — Production line configurations under each plant
  - `machines` — Equipment registries with capacity ratings and status
  - `shifts` — Operating shift timings (Morning, Afternoon, Night)
  - `reasons` — Standardized root cause taxonomy (Mechanical, Electrical, Operational, Tooling, Maintenance)
  - `downtime_events` — Historical stoppage audit records
  - `work_orders` — Preventive maintenance dispatch tickets
  - `import_batches` & `import_staging` — CSV/Excel ingestion metadata and row validation

---

## 4. System Architecture & Data Workflow

```mermaid
flowchart TD
    subgraph Data Ingestion
        M["Manual Stoppage Entry<br/>(AddEventModal)"]
        C["Bulk CSV / Excel Batch<br/>(Import Center)"]
        T["IoT / Telemetry Stream<br/>(REST API)"]
    end

    subgraph Backend Pipeline (FastAPI)
        V["Pydantic Validation & Parser<br/>(import_parser.py)"]
        S["Shift & Machine Auto-Resolver<br/>(import_service.py)"]
        DB[("MongoDB Atlas Database<br/>FactoryPulse Cluster")]
        E["Pandas Analytics Engine<br/>(analytics_service.py)"]
        R["Reliability & AI Engine<br/>(reliability.py)"]
        F["Financial Engine<br/>(financial.py)"]
    end

    subgraph Frontend Application (React 18 + Vite)
        O["Overview Dashboard<br/>5 KPIs, Trend, Pareto"]
        D["Shop Floor Digital Twin<br/>2D Spatial Layout & Nodes"]
        AI["Predictive AI Maintenance<br/>MTBF / MTTR & Risk Radar"]
        FIN["Financial Loss Calculator<br/>USD & INR Loss + ROI Simulation"]
        LOGS["Downtime Incident Audit Logs"]
        REP["Reports & Exports"]
    end

    M --> V
    C --> V
    T --> V
    V --> S --> DB
    DB --> E
    DB --> R
    DB --> F
    E --> O
    E --> D
    R --> AI
    F --> FIN
    DB --> LOGS
    E --> REP
```

---

## 5. Complete Module Breakdown

### A. Overview Command Dashboard (`/`)
- **Real-Time Global Filter Bar:** Filter analytics by Plant Facility, Date Range (from–to), Specific Machine, or Work Shift, complete with 1-click Quick Range presets (*Last 7 Days*, *Last 30 Days*, *This Month*).
- **The 5 Core Industrial KPI Cards:**
  1. *Total Downtime:* Formatted as `Xh Ym` with total incident counter.
  2. *Downtime Rate:* Formatted as percentage with target benchmark indicator (`Target: < 5%`).
  3. *Fleet Availability:* Equipment availability percentage (`Standard threshold: 92%`).
  4. *Incident Count:* Total frequency of machine stoppage events.
  5. *Estimated Production Loss:* Physical finished units lost, calculated dynamically from machine rated capacity.
- **Downtime Trend Chart:** Smooth area-wave visualization tracking daily downtime spikes and identifying recurrence patterns.
- **Loss by Reason (Pareto 80/20):** Dual-axis Pareto chart showing reason minutes and cumulative impact curve to enforce the 80/20 rule.
- **Top Machines Ranking:** Horizontal bar chart highlighting critical equipment bottlenecks.
- **Shift Comparison:** Comparative breakdown analyzing downtime variance between shifts.
- **Advanced Intelligence Hub:** 1-click quick-action cards to navigate to Predictive AI, Financial Loss, Digital Twin, and Audit Logs.

### B. Shop Floor Digital Twin (`/shop-floor`)
- **2D Spatial Layout:** Visual floor map organized by production line (e.g. *Line A*).
- **Live Equipment Status Nodes:** Real-time visual cards with pulsing telemetry indicators:
  - 🟢 **Running (Operational):** Active production.
  - 🟡 **Maintenance (Servicing):** Scheduled inspection or lube.
  - 🔴 **Stopped (Down):** Critical breakdown stoppage.
- **Slide-Out Telemetry Drawer:** Clicking any machine node opens a detailed inspection drawer displaying rated output capacity, historical event count, accumulated lost minutes, and last recorded stoppage notes.
- **Direct Equipment Registration:** Includes `+ Register Equipment` modal and `Sync` telemetry button.

### C. Predictive Maintenance & Reliability AI (`/predictive-maintenance`)
- **Fleet Reliability KPIs:** Fleet Health Index (average %), Fleet MTBF (hours), Fleet MTTR (minutes), and At-Risk Assets counter.
- **Machine Asset Health & Failure Risk Radar:** Dynamic risk table ranking assets from highest failure risk to lowest:
  - *Health Index (0–100%):* Color-coded progress bar and grade rating (Grade A, B, C).
  - *Risk Level:* High Risk, Moderate Risk, Low Risk badges.
  - *MTBF (Reliability):* Mean time between unexpected failures.
  - *MTTR (Speed):* Mean time to repair and restore service.
  - *AI Failure Assessment:* Predictive natural-language insights (e.g. *"High failure probability (>75%) in next 48 hours. Preventive servicing required."*).
- **Closed-Loop Work Order Dispatcher:** Direct `Dispatch` button to open the `CreateWorkOrderModal`, assigning technician tickets, priorities (`CRITICAL`, `HIGH`, `MEDIUM`), scheduled dates, and instructions.
- **Scheduled Maintenance Work Orders Table:** Live tracking of all active preventive maintenance tickets.

### D. Financial Loss & OEE Calculator (`/loss-calculator`)
- **Dual-Currency Monetary Quantification:** Calculates exact financial loss in **USD ($)** and **INR (₹)** based on production scrap, idle operator labor wages, and wasted power overhead.
- **3-Pillar OEE Analysis:**
  - *Availability:* $\frac{\text{Operating Time}}{\text{Planned Time}} \times 100$
  - *Performance:* Operational speed efficiency based on rated output.
  - *Quality:* Good unit yield rate.
- **Loss by Reason Financial Pareto:** Visualizes which root cause costs the factory the highest monetary loss.
- **Interactive ROI Recovery Simulator:** Interactive slider allowing plant directors to simulate downtime reduction (e.g. *"What if we reduce downtime by 15%?"*) and view instant annual cost savings and payback ROI.

### E. Downtime Incident Logs (`/downtime-logs`)
- Complete historical audit trail with full sorting, pagination, and multi-criteria filters.
- Displays Machine Name, Code, Stoppage Start/End Timestamps, Duration, Reason Label, Shift, Source (`manual` or `csv_import`), and Status.
- Includes **1-Click CSV Export** for plant audit compliance.

### F. Machine Analytics & Fleet Registry (`/machines`)
- Comprehensive registry of all equipment deployed across plants and lines.
- Detailed machine analytics drill-down: 30-day downtime trends, root cause distributions, and rated output settings.
- Includes **Register New Machine** modal with inline creation for new Plants and Production Lines.

### G. Work Shift Performance Analytics (`/shifts`)
- Analyzes downtime distribution across Morning, Afternoon, and Night shifts.
- Identifies shift handover vulnerabilities and operator setup variances.

### H. Downtime Data Import Center (`/import`)
- High-performance batch ingestion pipeline for CSV and Excel files.
- Includes file validation, preview table with duplicate detection, and batch staging.
- **Built-in Template:** Download button providing ready-to-upload `downtime_import_sample.csv` matching live machinery.

### I. Reporting Center (`/reports`)
- Comprehensive exportable report generation by facility, line, machine, and shift.

### J. Facility & Master Configuration (`/settings`)
- Complete management interface for Plants, Production Lines, Machines, Shifts, Root Causes, and System Security credentials.

---

## 6. How to Run the Project

### Default Admin Credentials

When logging in through the web portal (`http://localhost:5174/login`):

- **Username / Email:** `admin@gmail.com`
- **Password:** `Admin@123`

*(Note: The login page also features a **"Quick Fill Demo Admin Credentials"** 1-click button that automatically enters these credentials).*

---

### Prerequisites
- **Python:** 3.10, 3.11, or 3.12 installed
- **Node.js:** v18, v20, or v22+ installed
- **MongoDB:** MongoDB Atlas cloud cluster (pre-configured in `backend/.env`)

---

### Step-by-Step Setup Guide

#### 1. Backend Service Setup (FastAPI)

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

The backend server will start at:  
👉 **`http://127.0.0.1:8001/`**  
👉 Interactive API Documentation: **`http://127.0.0.1:8001/docs`**  
👉 Health Check: **`http://127.0.0.1:8001/api/v1/health`**

---

#### 2. Frontend Application Setup (React + Vite)

Open a second terminal and navigate to the `frontend/` directory:

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application will start at:  
👉 **`http://localhost:5174/`** (or `http://localhost:5175/`)

---

### One-Click Windows Launcher

You can launch both the Backend and Frontend servers simultaneously by running the batch launcher in the root directory:

```cmd
start.bat
```

Or double-click `start.bat` from Windows File Explorer.

---

## 7. CSV Batch Import Verification Guide

To test the automated data ingestion pipeline:

1. Log in to the application at `http://localhost:5174/` using `admin@gmail.com` / `Admin@123`.
2. Click on **Import Center** in the sidebar navigation (`/import`).
3. You can either:
   - Click **"Download Template (.csv)"** in the top-right header, or
   - Use the pre-generated sample file located at:  
     `downtime_import_sample.csv` (in the project root).
4. Drag and drop the CSV into the upload dropzone.
5. Click **"Preview Import"**: Notice how the parser automatically detects columns and validates timestamps and machine codes.
6. Click **"Commit Import"**: All 15 stoppage events are committed to MongoDB.
7. Navigate to **Overview**, **Downtime Logs**, **Shifts**, **Shop Floor Twin**, **Predictive AI**, or **Financial Loss**—every dashboard immediately updates with real-time analytics!

---

## 8. Industrial Formulas & Mathematical Foundations

### 1. Fleet Availability ($A$)
$$A = \left( 1 - \frac{\text{Total Downtime Minutes}}{\text{Total Planned Operating Minutes}} \right) \times 100$$

### 2. Estimated Units Lost ($U_{\text{lost}}$)
$$U_{\text{lost}} = \sum_{i=1}^{n} \left( \frac{\text{Downtime Minutes}_i}{60} \times \text{Rated Output Capacity}_i \right)$$

### 3. Mean Time Between Failures ($\text{MTBF}$)
$$\text{MTBF} = \frac{\text{Total Operating Hours} - \text{Total Downtime Hours}}{\text{Total Number of Unplanned Breakdown Events}}$$

### 4. Mean Time to Repair ($\text{MTTR}$)
$$\text{MTTR} = \frac{\text{Total Stoppage Duration (Minutes)}}{\text{Total Number of Repair Incidents}}$$

### 5. Monetary Production Loss ($\text{Cost}_{\text{lost}}$)
$$\text{Cost}_{\text{lost}} = (U_{\text{lost}} \times \text{Unit Margin}) + (\text{Downtime Hours} \times \text{Idle Labor Wage}) + (\text{Downtime Hours} \times \text{Overhead Power})$$

---

## License & Credits

Developed as a college engineering project for Industrial IoT and Manufacturing Analytics.  
**Platform:** FactoryPulse – Machine Downtime Intelligence & Production Loss Estimator.
