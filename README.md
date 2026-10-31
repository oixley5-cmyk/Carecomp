# CareCompare AI (V2.0) — Healthcare Cost Comparison & Appointment Tracker

CareCompare AI is an AI-first healthcare price transparency and appointment scheduling platform. Built to comply with the 2026 CMS Hospital and Clinical Price Transparency Mandate, CareCompare AI empowers insured and self-pay patients to compare verified out-of-pocket costs, locate nearby licensed clinics by ZIP code, automatically recognize medical procedures and billing codes (CPT), and manage appointments directly linked to their health insurance policy.

---

## Key Features & Highlights

1. **ZIP Code Clinic Locator & Geocoding**:
   - Locates accredited diagnostic laboratories and radiology clinics within your area.
   - Calculates real geographic distance (in miles) using regional centroid coordinates and the Haversine formula.
   - Sort by lowest out-of-pocket cost, closest distance, earliest verified appointment slot, or in-network tier.

2. **Smart Treatment Recognition Engine (NLP)**:
   - Natural language parser that recognizes medical treatments and everyday search terms (e.g., *"blood test"*, *"cholesterol"*, *"chest x-ray"*, *"abdominal ultrasound"*, *"brain mri"*, *"metabolic panel"*, *"a1c"*).
   - Automatically maps queries to standardized **CPT billing codes** (e.g. CPT 80061 for Lipid Panel, CPT 71046 for Chest X-Ray, CPT 70551 for Brain MRI).
   - Displays required clinical preparation (e.g., 12-hour fasting, bladder preparation) and warns when a physician order/referral is legally mandated.

3. **My Appointments & Insurance Schedule Tab**:
   - Dedicated dashboard tab linking clinical appointments to the patient's verified health insurance policy (e.g., Horizon Blue Cross Blue Shield OMNIA Tier 1).
   - Tracks appointment date/time, provider facility address, contact details, and pre-authorization approval numbers.
   - Real-time estimated copay calculation based on remaining deductible.
   - **One-click Calendar Export**: Downloads standard `.ics` iCalendar files for Apple Calendar, Google Calendar, and Microsoft Outlook.
   - Schedule new appointments or cancel existing slots with automated benefits updates.

4. **Transparent & Verified Data Integrity**:
   - Explicit verification status tags (`VERIFIED`, `ESTIMATED`, `UNAVAILABLE`).
   - Every price record cites the primary CMS Hospital Price Transparency Machine-Readable File (MRF) or direct clinic scheduling feed and audit date.
   - Unbiased ranking: Provider positions are strictly organic and never influenced by paid sponsorships.

5. **Personalized Out-of-Pocket Cost Calculator**:
   - Actuarial estimation simulating patient responsibility vs. health plan contribution.
   - Factors in remaining annual deductible, coinsurance rates (e.g. 80/20 split), and specialist copayments.

6. **Medical Bill & EOB Reconciliation Tracker**:
   - Compare original CareCompare estimates against final Explanation of Benefits (EOB) statements and clinic invoices.
   - Automated discrepancy analyzer explains why bills differ (deductible accumulation, out-of-network pathology fees, facility charges).

7. **AI Healthcare Decision Assistant**:
   - Plain-language conversational assistant grounded in CMS transparency rules and clinical requirements.
   - Explains deductibles, copays, coinsurance, and trade-offs between lowest cost vs. earliest appointment.

---

## Tech Stack & Architecture

- **Backend**: Python 3.10+ / Flask 3.1
- **Frontend**: Modern Vanilla JS (ES6+), Semantic HTML5, CSS3 Custom Properties (Design System)
- **Deployment**: Local WSGI or Serverless on Vercel (`api/index.py` runtime)
- **Typography**: DM Sans & Manrope Google Fonts

---

## Getting Started

### Local Setup

```bash
# 1. Clone repository and navigate to folder
cd carecopare

# 2. Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run automated test suite
python -m unittest test_app.py

# 5. Launch the local Flask server
python app.py
```

Open your browser at `http://127.0.0.1:5000`.

---

## API Documentation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | `GET` | Main responsive single-page application interface. |
| `GET /api/providers` | `GET` | Search providers with query parameters: `q`, `zip`, `category`, `insurance`, `sort`. |
| `GET /api/providers/<id>` | `GET` | Fetch provider profile and complete CPT chargemaster schedule. |
| `GET /api/treatments` | `GET` | List treatments catalog or search by query. |
| `POST /api/treatments/recognize` | `POST` | NLP endpoint: extracts CPT codes and preparation instructions from text. |
| `GET /api/compare` | `GET` | Compare 2 to 4 clinics side-by-side with `?ids=id1,id2&zip=08540`. |
| `GET /api/appointments` | `GET` | Retrieve user's scheduled appointments and active insurance profile. |
| `POST /api/appointments` | `POST` | Book/link a new appointment with health insurance. |
| `DELETE /api/appointments/<id>` | `DELETE` | Cancel an appointment slot. |
| `GET /api/appointments/<id>/calendar`| `GET` | Download standard `.ics` iCalendar file for Google/Apple/Outlook. |
| `POST /api/calculator/estimate` | `POST` | Calculate patient out-of-pocket vs insurer payment breakdown. |
| `GET /api/bills` | `GET` | Fetch tracked medical bills and variance reconciliations. |
| `POST /api/bills/compare` | `POST` | Submit medical bill / EOB to evaluate variance against estimate. |
| `POST /api/assistant` | `POST` | Query the grounded AI Healthcare Decision Assistant. |
| `GET /health` | `GET` | Health check endpoint returning version and service metrics. |

---

## Verification & Compliance Notice

CareCompare AI provides educational healthcare cost estimates and administrative scheduling assistance derived from publicly available CMS transparency files (MRF). CareCompare AI does not provide medical diagnoses, clinical treatment plans, or guaranteed quotes. Final patient out-of-pocket responsibility depends on claim adjudication by your insurance carrier.
