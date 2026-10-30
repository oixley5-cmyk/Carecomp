from flask import Flask, render_template, request, jsonify
from datetime import datetime
import os

app = Flask(__name__)

# Demo data only. Replace with verified pricing, insurer/network, and scheduling integrations
# before using this for real healthcare decisions.
PROVIDERS = [
    {
        "id": "mercer-lab",
        "name": "Mercer Community Lab",
        "category": "Lab tests",
        "services": ["CBC blood test", "complete blood count", "basic metabolic panel", "lipid panel"],
        "city": "Princeton, NJ",
        "distance_miles": 2.4,
        "cost_min": 18,
        "cost_max": 42,
        "cost_status": "Estimated",
        "cost_source": "Illustrative demo estimate",
        "updated": "Demo data",
        "network_status": "Unavailable",
        "appointment": None,
        "booking_url": "https://example.com",
        "notes": "Call the provider and insurer to confirm the service and plan."
    },
    {
        "id": "central-imaging",
        "name": "Central Imaging Center",
        "category": "Imaging",
        "services": ["X-ray", "chest x-ray", "ultrasound", "abdominal ultrasound"],
        "city": "Princeton, NJ",
        "distance_miles": 4.1,
        "cost_min": 55,
        "cost_max": 130,
        "cost_status": "Estimated",
        "cost_source": "Illustrative demo estimate",
        "updated": "Demo data",
        "network_status": "Unavailable",
        "appointment": None,
        "booking_url": "https://example.com",
        "notes": "An order or referral may be required for some services."
    },
    {
        "id": "university-diagnostics",
        "name": "University Diagnostics",
        "category": "Lab tests",
        "services": ["CBC blood test", "complete blood count", "basic metabolic panel", "lipid panel"],
        "city": "Plainsboro, NJ",
        "distance_miles": 6.8,
        "cost_min": 22,
        "cost_max": 48,
        "cost_status": "Estimated",
        "cost_source": "Illustrative demo estimate",
        "updated": "Demo data",
        "network_status": "Unavailable",
        "appointment": None,
        "booking_url": "https://example.com",
        "notes": "Availability is not connected in this demo."
    },
    {
        "id": "northside-imaging",
        "name": "Northside Imaging",
        "category": "Imaging",
        "services": ["X-ray", "chest x-ray", "ultrasound", "abdominal ultrasound"],
        "city": "Lawrenceville, NJ",
        "distance_miles": 8.2,
        "cost_min": 65,
        "cost_max": 145,
        "cost_status": "Estimated",
        "cost_source": "Illustrative demo estimate",
        "updated": "Demo data",
        "network_status": "Unavailable",
        "appointment": None,
        "booking_url": "https://example.com",
        "notes": "Call ahead to confirm appointment requirements and final cost."
    },
]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/providers")
def providers():
    query = request.args.get("q", "").strip().lower()
    category = request.args.get("category", "all").strip().lower()
    sort = request.args.get("sort", "cost").strip().lower()
    insurance = request.args.get("insurance", "").strip()
    plan = request.args.get("plan", "").strip()

    results = []
    for p in PROVIDERS:
        searchable = " ".join([p["name"], p["category"], p["city"], *p["services"]]).lower()
        if query and query not in searchable:
            continue
        if category != "all" and p["category"].lower() != category:
            continue
        item = dict(p)
        item["insurance_company"] = insurance or None
        item["insurance_plan"] = plan or None
        results.append(item)

    if sort == "distance":
        results.sort(key=lambda x: x["distance_miles"])
    elif sort == "appointment":
        # Unknown availability sorts after any verified appointment time.
        results.sort(key=lambda x: (x["appointment"] is None, x["appointment"] or ""))
    else:
        results.sort(key=lambda x: x["cost_min"])

    return jsonify({
        "results": results,
        "notice": "Demo dataset only. Prices are illustrative, network status and appointment availability are not verified."
    })

@app.route("/api/assistant", methods=["POST"])
def assistant():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip().lower()
    if not question:
        return jsonify({"answer": "Ask me about comparing estimates, insurance terms, or appointment information."})

    if any(word in question for word in ["deductible", "coinsurance", "copay", "copayment"]):
        answer = (
            "A deductible is what you may need to pay for covered services before your plan starts paying. "
            "A copay is a fixed amount for a service. Coinsurance is a percentage of the allowed cost. "
            "Your plan documents and insurer determine the actual amount. This demo cannot verify your benefits."
        )
    elif any(word in question for word in ["cheapest", "cost", "price", "expensive"]):
        answer = (
            "The demo sorts providers by illustrative low-end estimates. These are not quotes and are not tied "
            "to your insurance benefits. Confirm the billing code, network status, deductible, and final estimate "
            "with the provider and insurer before booking."
        )
    elif any(word in question for word in ["appointment", "wait", "available", "booking"]):
        answer = (
            "Live appointment availability is not connected in this demo, so I won't invent appointment times. "
            "Use the provider's official scheduling page or call them to confirm current availability."
        )
    elif any(word in question for word in ["insurance", "in network", "network", "covered"]):
        answer = (
            "Network status depends on the exact insurance product and plan, not just the insurer's name. "
            "This demo marks network status as Unavailable because it has no verified eligibility integration. "
            "Check with your insurer and the provider before receiving care."
        )
    else:
        answer = (
            "I can explain the comparison shown on this page, but this demo does not provide medical advice or "
            "verify prices, insurance coverage, or appointment availability. Tell me whether you want help with "
            "cost estimates, insurance terms, or booking information."
        )
    return jsonify({"answer": answer})

@app.route("/health")
def health():
    return jsonify({"status": "ok", "app": "CareCompare AI"})

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
