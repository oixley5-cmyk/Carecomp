# CareCompare AI — Flask + Vercel starter

A responsive Flask full-stack prototype based on the uploaded CareCompare AI product requirements. It includes:
- Responsive landing page
- Provider search by service and category
- Sort by sample cost, distance, or appointment timing
- Insurance company / plan input (not saved or verified)
- Side-by-side-style provider cards with explicit data status
- Rule-based plain-language assistant endpoint
- Health check endpoint
- Vercel Python entrypoint and configuration

## Important: demo only
All provider names, distances, and cost ranges are illustrative sample data. This app is **not connected** to live pricing, insurance eligibility, provider networks, or scheduling systems. It must not be used to make real healthcare decisions. The assistant is rule-based, not an LLM, and does not provide medical advice. Do not collect real patient information or upload bills/EOBs until security, privacy, consent, retention, and legal requirements have been reviewed.

## Run locally

Use Python 3.10+.

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`.

## Deploy to Vercel

1. Create a Git repository and put this project at the repository root.
2. Push it to GitHub.
3. In Vercel, import that repository.
4. Keep the included `vercel.json` and `requirements.txt`.
5. Deploy. Vercel will use `api/index.py` as the Flask entrypoint.
6. Open the deployed URL and test `/health`, search, and the assistant.

You can also install the Vercel CLI and deploy from the project folder:

```bash
npm i -g vercel
vercel
```

If Vercel reports a runtime/build configuration issue, check the current Vercel Python runtime docs because platform configuration can change.

## Project structure

```text
carecompare_ai/
├── api/
│   └── index.py
├── static/
│   ├── app.js
│   └── styles.css
├── templates/
│   └── index.html
├── app.py
├── requirements.txt
├── vercel.json
├── .gitignore
└── README.md
```

## API endpoints

- `GET /` — web interface
- `GET /api/providers?q=blood%20test&category=lab%20tests&sort=cost` — sample provider search
- `POST /api/assistant` — rule-based explanatory assistant; JSON body: `{"question":"What is a deductible?"}`
- `GET /health` — health check

## Before a real pilot

1. Choose a single launch market and specific services.
2. Replace the demo provider list with data you are permitted to use.
3. Connect authorized pricing, plan/network verification, and scheduling sources. Never infer these from the insurer name alone.
4. Define how estimates are calculated, display sources and last-updated timestamps, and validate against actual bills with consent.
5. Add tests, logging without sensitive data, abuse controls, and secure configuration.
6. Have qualified privacy/legal professionals review applicable HIPAA and other requirements before processing sensitive health or insurance data.
7. Keep provider ranking logic transparent and independent from paid promotions.
