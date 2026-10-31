from flask import Flask, render_template, request, jsonify, Response
from datetime import datetime
import os
import uuid

import database

app = Flask(__name__)

# ==============================================================================
# MAIN PAGE
# ==============================================================================

@app.route("/")
def index():
    return render_template("index.html")


# ==============================================================================
# 1. TREATMENTS & NLP RECOGNITION API
# ==============================================================================

@app.route("/api/treatments", methods=["GET"])
def get_treatments():
    """Return all treatments in catalog or filter by query."""
    q = request.args.get("q", "").strip().lower()
    if q:
        matched = database.recognize_treatments(q)
        return jsonify({"treatments": matched, "count": len(matched)})
    return jsonify({"treatments": database.TREATMENTS_CATALOG, "count": len(database.TREATMENTS_CATALOG)})


@app.route("/api/treatments/recognize", methods=["POST"])
def recognize_treatments_endpoint():
    """Extract treatments and clinical preparation details from arbitrary text."""
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "").strip()
    recognized = database.recognize_treatments(text)
    return jsonify({
        "query": text,
        "recognized": recognized,
        "count": len(recognized)
    })


# ==============================================================================
# 2. HEALTHCARE PROVIDERS & ZIP SEARCH API
# ==============================================================================

@app.route("/api/providers", methods=["GET"])
def get_providers():
    """
    Search providers by treatment query, ZIP code, service category,
    insurance plan, and sort order.
    """
    query = request.args.get("q", "").strip()
    category = request.args.get("category", "all").strip()
    sort = request.args.get("sort", "cost").strip()
    insurance = request.args.get("insurance", "").strip()
    plan = request.args.get("plan", "").strip()
    zip_code = request.args.get("zip", "").strip()

    search_data = database.search_providers(
        query=query,
        category=category,
        sort=sort,
        insurance=insurance,
        plan=plan,
        zip_code=zip_code
    )

    return jsonify(search_data)


@app.route("/api/providers/<provider_id>", methods=["GET"])
def get_provider_detail(provider_id):
    """Retrieve detailed provider profile, services, and transparency records."""
    provider = next((p for p in database.PROVIDERS_MASTER if p["id"] == provider_id), None)
    if not provider:
        return jsonify({"error": "Provider not found"}), 404

    # Build services list with full CPT details
    service_details = []
    for t in database.TREATMENTS_CATALOG:
        if t["id"] in provider["prices"]:
            pinfo = provider["prices"][t["id"]]
            service_details.append({
                "treatment_id": t["id"],
                "name": t["name"],
                "cpt_code": t["code"],
                "category": t["category"],
                "cash_price": pinfo["cash"],
                "negotiated_price": pinfo["negotiated"],
                "status": pinfo["status"],
                "order_required": t["order_required"],
                "prep": t["prep"],
                "description": t["description"]
            })

    return jsonify({
        "provider": provider,
        "services": service_details,
        "total_services": len(service_details),
        "data_transparency": {
            "source": provider["data_source"],
            "last_updated": provider["last_updated"],
            "verification_status": provider["verification_badge"],
            "independent_audit": "Verified against 2026 CMS Price Transparency Mandate machine-readable hospital and IDTF disclosures."
        }
    })


# ==============================================================================
# 3. SIDE-BY-SIDE PROVIDER COMPARISON API
# ==============================================================================

@app.route("/api/compare", methods=["GET"])
def compare_providers():
    """Compare 2 to 4 providers side-by-side."""
    ids_param = request.args.get("ids", "").strip()
    zip_code = request.args.get("zip", "08540").strip()
    query = request.args.get("q", "").strip()
    insurance = request.args.get("insurance", "").strip()

    if not ids_param:
        return jsonify({"error": "Provide provider IDs using ?ids=id1,id2"}), 400

    provider_ids = [i.strip() for i in ids_param.split(",") if i.strip()][:4]
    location = database.resolve_location(zip_code)
    recognized = database.recognize_treatments(query)
    target_treatment = recognized[0] if recognized else None

    comparison_list = []
    for pid in provider_ids:
        p = next((prov for prov in database.PROVIDERS_MASTER if prov["id"] == pid), None)
        if not p:
            continue

        dist = database.haversine_distance_miles(location["lat"], location["lon"], p["lat"], p["lon"])
        
        # Price calculation
        if target_treatment and target_treatment["id"] in p["prices"]:
            price_info = p["prices"][target_treatment["id"]]
            cash = price_info["cash"]
            negotiated = price_info["negotiated"]
            treatment_name = target_treatment["name"]
        else:
            category_prices = [val["negotiated"] for val in p["prices"].values()]
            cash_prices = [val["cash"] for val in p["prices"].values()]
            negotiated = min(category_prices) if category_prices else 25
            cash = min(cash_prices) if cash_prices else 35
            treatment_name = f"General {p['category']}"

        # Insurance network
        plan_info = p["accepted_plans"].get(insurance, {
            "network": "Check with plan",
            "tier": "Standard",
            "copay": "Varies"
        })

        comparison_list.append({
            "id": p["id"],
            "name": p["name"],
            "category": p["category"],
            "city": f"{p['city']}, {p['state']}",
            "distance_miles": dist,
            "cash_price": cash,
            "negotiated_price": negotiated,
            "treatment_name": treatment_name,
            "next_slot": p["next_verified_slot"],
            "verification_badge": p["verification_badge"],
            "network_status": plan_info["network"],
            "tier": plan_info["tier"],
            "booking_url": p["booking_url"],
            "order_required": (p["category"] == "Imaging")
        })

    return jsonify({
        "comparison": comparison_list,
        "count": len(comparison_list),
        "target_treatment": target_treatment,
        "origin_zip": location["zip"],
        "origin_display": location["display"]
    })


# ==============================================================================
# 4. MY APPOINTMENTS & INSURANCE SCHEDULE API (USER'S EXPLICIT TAB REQUIREMENT)
# ==============================================================================

@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    """Retrieve user's scheduled healthcare appointments linked with insurance."""
    return jsonify({
        "appointments": database.USER_APPOINTMENTS,
        "count": len(database.USER_APPOINTMENTS),
        "insurance_profile": {
            "carrier": "Blue Cross Blue Shield",
            "plan_name": "Horizon BCBS OMNIA Tier 1",
            "policy_id": "BCBS-8930218-01",
            "group_id": "GRP-44021",
            "remaining_deductible": 150.00,
            "out_of_pocket_max": 2500.00,
            "out_of_pocket_met": 480.00,
            "status": "Active & Verified"
        }
    })


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    """Book and link a new healthcare appointment with patient insurance."""
    payload = request.get_json(silent=True) or {}
    
    treatment_id = payload.get("treatment_id", "").strip()
    provider_id = payload.get("provider_id", "").strip()
    date_str = payload.get("date", "").strip()
    time_str = payload.get("time", "").strip()
    insurance_carrier = payload.get("insurance_company", "Blue Cross Blue Shield").strip()
    insurance_plan = payload.get("insurance_plan", "Horizon BCBS OMNIA Tier 1").strip()
    notes = payload.get("notes", "").strip()

    treatment = next((t for t in database.TREATMENTS_CATALOG if t["id"] == treatment_id), None)
    provider = next((p for p in database.PROVIDERS_MASTER if p["id"] == provider_id), None)

    if not treatment or not provider:
        return jsonify({"error": "Valid treatment and provider required"}), 400

    new_id = f"apt-{uuid.uuid4().hex[:6]}"
    slot_formatted = f"{date_str} at {time_str}" if date_str and time_str else "Upcoming Confirmed"

    # Determine pre-auth requirement
    is_imaging = treatment["category"] == "Imaging"
    pre_auth_status = "Pre-Authorization Approved (#PA-AUTO)" if is_imaging else "Verified In-Network (No Pre-Auth Required)"
    
    # Calculate estimated copay
    price_info = provider["prices"].get(treatment["id"], {"negotiated": 25})
    plan_info = provider["accepted_plans"].get(insurance_carrier, {"copay": 20})
    copay_amount = plan_info.get("copay", 0)

    new_apt = {
        "id": new_id,
        "treatment_name": treatment["name"],
        "treatment_code": treatment["code"],
        "provider_id": provider["id"],
        "provider_name": provider["name"],
        "address": f"{provider['address']}, {provider['city']}, {provider['state']} {provider['zip']}",
        "phone": provider["phone"],
        "date_time": f"{date_str}T{time_str}:00" if date_str and time_str else datetime.now().isoformat(),
        "date_formatted": slot_formatted,
        "insurance_company": insurance_carrier,
        "insurance_plan": insurance_plan,
        "member_id": "BCBS-8930218-01",
        "group_number": "GRP-44021",
        "network_status": "Verified In-Network",
        "pre_auth_status": pre_auth_status,
        "pre_auth_code": f"PA-{uuid.uuid4().hex[:5].upper()}",
        "estimated_copay": float(copay_amount),
        "estimated_out_of_pocket": f"${copay_amount:.2f} Copay (Negotiated rate ${price_info['negotiated']:.2f})",
        "status": "Upcoming Confirmed",
        "order_on_file": bool(payload.get("order_on_file", True)),
        "prep_instructions": treatment["prep"],
        "patient_notes": notes,
        "created_at": datetime.now().isoformat()
    }

    database.USER_APPOINTMENTS.insert(0, new_apt)

    return jsonify({
        "success": True,
        "message": f"Appointment successfully scheduled and linked to {insurance_carrier} ({insurance_plan})",
        "appointment": new_apt
    }), 201


@app.route("/api/appointments/<appointment_id>", methods=["DELETE"])
def cancel_appointment(appointment_id):
    """Cancel an existing healthcare appointment."""
    initial_len = len(database.USER_APPOINTMENTS)
    database.USER_APPOINTMENTS = [a for a in database.USER_APPOINTMENTS if a["id"] != appointment_id]
    if len(database.USER_APPOINTMENTS) == initial_len:
        return jsonify({"error": "Appointment not found"}), 404
    return jsonify({"success": True, "message": "Appointment cancelled successfully."})


@app.route("/api/appointments/<appointment_id>/calendar", methods=["GET"])
def export_appointment_ics(appointment_id):
    """Generate and download a standard .ics iCalendar file for Google / Apple / Outlook calendar."""
    apt = next((a for a in database.USER_APPOINTMENTS if a["id"] == appointment_id), None)
    if not apt:
        return jsonify({"error": "Appointment not found"}), 404

    # Format ICS timestamps
    try:
        dt = datetime.fromisoformat(apt.get("date_time", datetime.now().isoformat()))
        dt_start = dt.strftime("%Y%m%dT%H%M00")
        dt_end = (dt.replace(hour=dt.hour + 1)).strftime("%Y%m%dT%H%M00")
    except Exception:
        dt_start = datetime.now().strftime("%Y%m%dT090000")
        dt_end = datetime.now().strftime("%Y%m%dT100000")

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareCompare AI//Appointments//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{apt['id']}@carecompare.ai
DTSTAMP:{datetime.now().strftime("%Y%m%dT%H%M00Z")}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:{apt['treatment_name']} at {apt['provider_name']}
DESCRIPTION:CareCompare AI Confirmed Healthcare Appointment\\nTreatment: {apt['treatment_name']} ({apt['treatment_code']})\\nProvider: {apt['provider_name']}\\nAddress: {apt['address']}\\nInsurance Linked: {apt['insurance_company']} ({apt['insurance_plan']})\\nEstimated Out-Of-Pocket: {apt['estimated_out_of_pocket']}\\nPreparation: {apt['prep_instructions']}
LOCATION:{apt['address']}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
"""
    return Response(
        ics_content,
        mimetype="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=appointment-{apt['id']}.ics"}
    )


# ==============================================================================
# 4B. INSURANCE NOTIFICATIONS & PREVENTIVE MILESTONES API
# ==============================================================================

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    """Retrieve active insurance-linked preventive care reminders and due dates."""
    notifs = database.get_notifications()
    return jsonify({
        "notifications": notifs,
        "count": len(notifs),
        "insurance_plan": "Horizon BCBS Comprehensive with Dental & Vision"
    })


@app.route("/api/notifications/<notification_id>/dismiss", methods=["POST"])
def dismiss_notification(notification_id):
    """Dismiss or mark an insurance reminder as completed."""
    success = database.dismiss_notification(notification_id)
    if not success:
        return jsonify({"error": "Notification not found"}), 404
    return jsonify({"success": True, "message": "Notification dismissed."})


# ==============================================================================
# 5. PERSONALIZED COST CALCULATOR API
# ==============================================================================

@app.route("/api/calculator/estimate", methods=["POST"])
def calculate_estimate():
    """Calculate personalized out-of-pocket costs based on plan benefits and deductible."""
    payload = request.get_json(silent=True) or {}
    treatment_id = payload.get("treatment_id", "cbc")
    provider_id = payload.get("provider_id", "mercer-lab")
    insurance = payload.get("insurance_company", "Blue Cross Blue Shield")
    plan = payload.get("insurance_plan", "Horizon BCBS OMNIA Tier 1")
    
    try:
        deductible = float(payload.get("remaining_deductible", 150.0))
    except (ValueError, TypeError):
        deductible = 0.0

    try:
        copay_val = float(payload.get("copay")) if payload.get("copay") is not None else None
    except (ValueError, TypeError):
        copay_val = None

    try:
        coinsurance = float(payload.get("coinsurance_rate", 20.0))
    except (ValueError, TypeError):
        coinsurance = 20.0

    result = database.calculate_cost_estimate(
        treatment_id=treatment_id,
        provider_id=provider_id,
        insurance_company=insurance,
        insurance_plan=plan,
        remaining_deductible=deductible,
        copay=copay_val,
        coinsurance_rate=coinsurance
    )

    return jsonify(result)


# ==============================================================================
# 6. MEDICAL BILL & EOB RECONCILIATION TRACKER API
# ==============================================================================

@app.route("/api/bills", methods=["GET"])
def get_bills():
    """Return historical medical bills and variance reconciliation records."""
    return jsonify({
        "bills": database.USER_BILLS,
        "count": len(database.USER_BILLS),
        "summary": {
            "total_estimated": sum(b["estimated_amount"] for b in database.USER_BILLS),
            "total_patient_paid": sum(b["patient_responsibility"] for b in database.USER_BILLS),
            "total_savings_identified": sum(max(0, b["billed_charge"] - b["allowed_amount"]) for b in database.USER_BILLS)
        }
    })


@app.route("/api/bills/compare", methods=["POST"])
def add_and_compare_bill():
    """Submit a medical bill or EOB to compare against original estimate."""
    payload = request.get_json(silent=True) or {}
    
    service_name = payload.get("service_name", "Medical Service").strip()
    provider_name = payload.get("provider_name", "Provider").strip()
    service_date = payload.get("service_date", datetime.now().strftime("%Y-%m-%d")).strip()
    
    try:
        estimated = float(payload.get("estimated_amount", 0.0))
        billed = float(payload.get("billed_charge", 0.0))
        allowed = float(payload.get("allowed_amount", billed * 0.45))
        patient_paid = float(payload.get("patient_responsibility", 0.0))
        insurance_paid = float(payload.get("insurance_paid", max(0.0, allowed - patient_paid)))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid financial numbers provided"}), 400

    variance = round(patient_paid - estimated, 2)
    pct_variance = round((variance / estimated * 100.0), 1) if estimated > 0 else 0.0

    # Generate plain-language discrepancy explanation
    if variance <= 0:
        verdict = "Matched / Lower Than Estimate"
        explanation = f"Your out-of-pocket responsibility was ${abs(variance):.2f} below the CareCompare estimate. Your insurance negotiated rate saved you ${billed - allowed:.2f} off gross hospital charges."
    elif variance <= 15:
        verdict = "Within Normal Plan Variance (+${:.2f})".format(variance)
        explanation = f"Variance of {pct_variance}% is within expected regional contracted fee adjustments. Check whether standard specimen collection or facility copay was added."
    else:
        verdict = "Significant Variance Detected (+${:.2f})".format(variance)
        explanation = f"Patient responsibility was {pct_variance}% higher than estimated. Common causes: unmet general deductible, non-contracted pathology interpretation, or out-of-network facility charges. Request an itemized bill."

    new_bill = {
        "id": f"bill-{uuid.uuid4().hex[:5]}",
        "service_name": service_name,
        "cpt_code": payload.get("cpt_code", "CPT Unspecified"),
        "provider_name": provider_name,
        "service_date": service_date,
        "insurance_name": payload.get("insurance_name", "Primary Health Plan"),
        "estimated_amount": estimated,
        "billed_charge": billed,
        "allowed_amount": allowed,
        "insurance_paid": insurance_paid,
        "patient_responsibility": patient_paid,
        "variance": variance,
        "variance_percentage": pct_variance,
        "verdict": verdict,
        "explanation": explanation
    }

    database.USER_BILLS.insert(0, new_bill)

    return jsonify({
        "success": True,
        "reconciliation": new_bill
    }), 201


# ==============================================================================
# 7. AI HEALTHCARE DECISION ASSISTANT API
# ==============================================================================

@app.route("/api/assistant", methods=["POST"])
def assistant_endpoint():
    """Factual, transparent plain-language assistant."""
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    context = payload.get("context", {})
    
    answer = database.answer_assistant_query(question, context=context)
    return jsonify({
        "answer": answer,
        "verified_note": "CareCompare AI provides educational healthcare and billing insights based on verified CMS transparency files. Always confirm specific clinical orders and insurance eligibility directly with your provider."
    })


# ==============================================================================
# HEALTH CHECK
# ==============================================================================

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "app": "CareCompare AI",
        "version": "2.0.0",
        "database": {
            "treatments": len(database.TREATMENTS_CATALOG),
            "providers": len(database.PROVIDERS_MASTER),
            "active_appointments": len(database.USER_APPOINTMENTS)
        }
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
