# University Mobilization Data Collection System

A fast, mobile-first data collection web application designed for university mobilizers to rapidly record contacts into a central Google Sheet.

Designed specifically for field mobilizers on mobile devices (Android/iOS) who need to enter dozens or hundreds of records without navigation friction.

---

## 1. Supported Universities

Mobilizers select their institution once at the start of a session:
1. **Kampala International University (KIU)**
2. **Cavendish University Uganda**
3. **International University of East Africa (IUEA)**
4. **Clarke International University (CIU)**
5. **Kumi University (KCU)**

All 5 universities contribute to the **same central Google Sheet** in real time.

---

## 2. High-Speed Workflow

- **Select University Once**: Stays locked for the entire session.
- **Fast Entry**: Type Full Name → Type Phone Number → Tap `SAVE ENTRY` (or press `Enter`).
- **Instant Auto-Reset**: Form clears name and telephone, increments session counter, appends to Recent Entries, and immediately puts the cursor back into the Full Name field.
- **Duplicate Detection**: Flags already entered Ugandan telephone numbers and warns the mobilizer or administrator.
- **PWA & Offline Queue**: In poor network conditions, records are queued locally and automatically synchronized as soon as connection is restored.

---

## 3. Google Sheets Central Integration

Google Sheets acts as the central live database. Every record is appended with:

| ID | Full Name | Telephone Number | University | Date | Time | Timestamp |
|---|---|---|---|---|---|---|
| `001` | John Baptist Mukasa | `0701234567` | Kampala International University (KIU) | `09/09/2026` | `12:45` | `2026-09-09T12:45:00+03:00` |

### Step-by-Step Google Sheets Setup Guide

#### Step 1: Create a Google Cloud Project & Enable Sheets API
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named e.g. `university-mobilization`.
3. Navigate to **APIs & Services > Library**.
4. Search for **Google Sheets API** and click **Enable**.

#### Step 2: Create a Service Account
1. In Google Cloud Console, navigate to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**.
3. Name it `sheets-mobilizer` and click **Create and Continue**.
4. Click **Done**.
5. Click on your newly created service account email (e.g. `sheets-mobilizer@your-project.iam.gserviceaccount.com`).
6. Switch to the **Keys** tab.
7. Click **Add Key > Create new key > JSON**.
8. A JSON file will download to your computer.

#### Step 3: Create & Share the Central Spreadsheet
1. Create a new Google Spreadsheet at [sheets.new](https://sheets.new).
2. Name it e.g. **University Mobilization Central Database**.
3. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
4. Click the green **Share** button in the top right.
5. Paste the **Service Account Email** from Step 2.
6. Set permission to **Editor** and uncheck "Notify people", then click **Share**.

#### Step 4: Configure Environment Variables
Add the following variables to your `.env` (or Vercel / Cloud Run environment settings):

```env
GOOGLE_SHEETS_SPREADSHEET_ID="your_spreadsheet_id_from_step_3"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

*Note: In `.env` files, ensure newlines in `GOOGLE_PRIVATE_KEY` are represented as `\n` or enclosed in double quotes.*

#### Step 5: Test Connection in Admin Portal
1. Open the application.
2. Click the **Admin** button in the header.
3. Sign in using `admin` / `mobilize2026_admin` (or your configured `ADMIN_PASSWORD`).
4. Click **Test Connection** to verify live communication with your Google Sheet.
5. Click **Sync Unsynced** to push any records created before credentials were linked.

---

## 4. Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | Container binding port | `3000` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Spreadsheet ID | - |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Service Account Email | - |
| `GOOGLE_PRIVATE_KEY` | Google Service Account Private Key | - |
| `ADMIN_USERNAME` | Admin portal username | `admin` |
| `ADMIN_PASSWORD` | Admin portal password | `mobilize2026_admin` |

---

## 5. Security & Architecture

- **Zero Client Credential Exposure**: Google Sheets API private keys, service account credentials, and admin tokens remain strictly server-side on Node.js / Express.
- **Validation & Sanitization**: Strict Ugandan phone normalization (`07...`, `03...`, `+256...`), name length checks, and enum enforcement on participating universities.
- **Local Fallback Store**: When Google credentials are pending, the backend stores entries safely in local disk JSON storage (`data/entries.json`), ensuring zero data loss during field deployment.
- **Admin RBAC**: Public mobilizers only access the rapid-entry form; only authenticated administrators can view full logs, export CSV, or change duplicate policies.

---

## 6. Deployment Guide (Vercel & Cloud Run)

### Vercel Deployment
1. Import the repository into Vercel.
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure Environment Variables (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `ADMIN_PASSWORD`).
6. Deploy!

### Container / Cloud Run
The app boots with:
```bash
npm install
npm run build
npm start
```
Binds to `0.0.0.0:3000` with production static asset serving and API endpoints.

---

## 7. Mobilizer PWA Home Screen Installation
Mobilizers can install this app directly on their mobile phones:
- **Android / Chrome**: Tap the **Install App** button in the header or the browser prompt.
- **iPhone / Safari**: Tap **Share** > **Add to Home Screen** > **Add**.
The app will open fullscreen with offline queue resilience.
