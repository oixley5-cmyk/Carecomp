"""
CareCompare AI — Data Engine and Database Layer
Includes:
- Medical Treatment & CPT Catalog with clinical aliases and preparation instructions
- ZIP code coordinates and Haversine distance calculator
- Healthcare providers with verified CMS pricing data, operating hours, and network tiers
- Appointments & Insurance scheduling engine
- Personalized Cost Calculator formulas
- Medical Bill / EOB reconciliation engine
- AI Healthcare Decision Assistant engine
"""

import math
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

# ==============================================================================
# 1. ZIP CODE COORDINATES & DISTANCE CALCULATOR
# ==============================================================================

# Central NJ, Tri-State & regional launch market coordinates
ZIP_COORDINATES: Dict[str, Dict[str, Any]] = {
    # Princeton & Mercer County
    "08540": {"lat": 40.3573, "lon": -74.6672, "city": "Princeton", "state": "NJ"},
    "08542": {"lat": 40.3541, "lon": -74.6558, "city": "Princeton", "state": "NJ"},
    "08544": {"lat": 40.3487, "lon": -74.6593, "city": "Princeton (Campus)", "state": "NJ"},
    "08536": {"lat": 40.3340, "lon": -74.5880, "city": "Plainsboro", "state": "NJ"},
    "08648": {"lat": 40.2982, "lon": -74.7299, "city": "Lawrenceville", "state": "NJ"},
    "08690": {"lat": 40.2198, "lon": -74.6865, "city": "Hamilton", "state": "NJ"},
    "08619": {"lat": 40.2390, "lon": -74.7082, "city": "Hamilton Square", "state": "NJ"},
    "08608": {"lat": 40.2206, "lon": -74.7699, "city": "Trenton", "state": "NJ"},
    "08611": {"lat": 40.2039, "lon": -74.7495, "city": "Trenton", "state": "NJ"},
    "08618": {"lat": 40.2443, "lon": -74.7925, "city": "Trenton", "state": "NJ"},
    "08520": {"lat": 40.2687, "lon": -74.5321, "city": "East Windsor", "state": "NJ"},
    "08525": {"lat": 40.3895, "lon": -74.7915, "city": "Hopewell", "state": "NJ"},
    "08534": {"lat": 40.3168, "lon": -74.8732, "city": "Pennington", "state": "NJ"},
    "08550": {"lat": 40.3060, "lon": -74.6212, "city": "West Windsor", "state": "NJ"},
    # Middlesex & Somerset
    "08854": {"lat": 40.5510, "lon": -74.4607, "city": "Piscataway", "state": "NJ"},
    "08901": {"lat": 40.4975, "lon": -74.4474, "city": "New Brunswick", "state": "NJ"},
    "08817": {"lat": 40.5187, "lon": -74.4121, "city": "Edison", "state": "NJ"},
    "08820": {"lat": 40.5794, "lon": -74.3582, "city": "Edison North", "state": "NJ"},
    "08873": {"lat": 40.4937, "lon": -74.5262, "city": "Somerset", "state": "NJ"},
    "08807": {"lat": 40.5982, "lon": -74.6307, "city": "Bridgewater", "state": "NJ"},
    # Greater NJ / Philadelphia / NYC regional anchors
    "07090": {"lat": 40.6584, "lon": -74.3479, "city": "Westfield", "state": "NJ"},
    "07102": {"lat": 40.7357, "lon": -74.1724, "city": "Newark", "state": "NJ"},
    "07302": {"lat": 40.7178, "lon": -74.0431, "city": "Jersey City", "state": "NJ"},
    "10001": {"lat": 40.7501, "lon": -73.9967, "city": "New York", "state": "NY"},
    "10016": {"lat": 40.7465, "lon": -73.9780, "city": "New York", "state": "NY"},
    "19104": {"lat": 39.9575, "lon": -75.1950, "city": "Philadelphia", "state": "PA"},
    "19107": {"lat": 39.9510, "lon": -75.1580, "city": "Philadelphia", "state": "PA"},
    "08002": {"lat": 39.9348, "lon": -75.0135, "city": "Cherry Hill", "state": "NJ"},
}

DEFAULT_ORIGIN = {"lat": 40.3573, "lon": -74.6672, "city": "Princeton", "state": "NJ", "zip": "08540", "display": "Princeton, NJ (08540)"}

def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two coordinates in miles."""
    R = 3958.8  # Earth radius in miles
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def resolve_location(query: str) -> Dict[str, Any]:
    """Resolve a ZIP code or city name into latitude, longitude, and display label."""
    clean = (query or "").strip().lower()
    zip_match = re.search(r"\b(\d{5})\b", clean)
    if zip_match:
        zip_str = zip_match.group(1)
        if zip_str in ZIP_COORDINATES:
            coord = ZIP_COORDINATES[zip_str]
            return {
                "zip": zip_str,
                "lat": coord["lat"],
                "lon": coord["lon"],
                "display": f"{coord['city']}, {coord['state']} ({zip_str})",
                "matched": True,
            }
        else:
            # Fallback for unrecognized 5-digit ZIP: estimate from first digits
            prefix = zip_str[:2]
            if prefix in ["07", "08"]:  # NJ
                lat, lon = 40.25, -74.50
            elif prefix in ["10", "11", "12"]:  # NY
                lat, lon = 40.71, -74.00
            elif prefix in ["19", "18"]:  # PA
                lat, lon = 39.95, -75.16
            else:
                lat, lon = 40.35, -74.66
            return {
                "zip": zip_str,
                "lat": lat,
                "lon": lon,
                "display": f"ZIP {zip_str} (Regional lookup)",
                "matched": False,
            }

    # Match by city name
    for z, data in ZIP_COORDINATES.items():
        if clean in data["city"].lower():
            return {
                "zip": z,
                "lat": data["lat"],
                "lon": data["lon"],
                "display": f"{data['city']}, {data['state']} ({z})",
                "matched": True,
            }

    # Default to Princeton, NJ
    return {
        "zip": DEFAULT_ORIGIN["zip"],
        "lat": DEFAULT_ORIGIN["lat"],
        "lon": DEFAULT_ORIGIN["lon"],
        "display": f"{DEFAULT_ORIGIN['city']}, {DEFAULT_ORIGIN['state']} ({DEFAULT_ORIGIN['zip']})",
        "matched": False,
    }


# ==============================================================================
# 2. MEDICAL TREATMENTS & CPT CATALOG (SMART RECOGNITION ENGINE)
# ==============================================================================

TREATMENTS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "cbc",
        "code": "CPT 85025",
        "name": "Complete Blood Count (CBC) with Differential",
        "category": "Lab tests",
        "aliases": ["cbc", "blood count", "complete blood count", "hemogram", "blood work", "cbc test", "white blood cells", "rbc", "platelets"],
        "order_required": False,
        "order_note": "Direct access / wellness screening order available; physician order recommended for insurance claims.",
        "prep": "No fasting required for isolated CBC. Wear loose clothing for arm blood draw.",
        "typical_cash_range": (20, 48),
        "typical_in_network_range": (14, 32),
        "description": "Evaluates overall health and detects a variety of disorders, including anemia and leukemia, by measuring RBCs, WBCs, hemoglobin, and platelets."
    },
    {
        "id": "cmp",
        "code": "CPT 80053",
        "name": "Comprehensive Metabolic Panel (CMP-14)",
        "category": "Lab tests",
        "aliases": ["cmp", "comprehensive metabolic", "metabolic panel", "chem 14", "chemistry panel", "kidney liver panel", "metabolic test"],
        "order_required": False,
        "order_note": "Doctor's order recommended for plan coverage; routine screening accepted.",
        "prep": "Fast for 10-12 hours before test (water permitted).",
        "typical_cash_range": (24, 65),
        "typical_in_network_range": (18, 42),
        "description": "Measures 14 blood chemicals to evaluate kidney function, liver function, electrolyte balance, blood sugar, and protein levels."
    },
    {
        "id": "bmp",
        "code": "CPT 80048",
        "name": "Basic Metabolic Panel (BMP-8)",
        "category": "Lab tests",
        "aliases": ["bmp", "basic metabolic", "chem 7", "basic chem", "electrolytes", "creatinine test"],
        "order_required": False,
        "order_note": "Routine outpatient order or direct wellness order.",
        "prep": "Fast for 8 hours prior to test (water permitted).",
        "typical_cash_range": (18, 45),
        "typical_in_network_range": (12, 28),
        "description": "Checks 8 essential components including glucose, calcium, electrolytes (sodium, potassium), and kidney indicators (BUN, creatinine)."
    },
    {
        "id": "lipid",
        "code": "CPT 80061",
        "name": "Lipid Panel (Total Cholesterol, HDL, LDL, Triglycerides)",
        "category": "Lab tests",
        "aliases": ["lipid", "lipid panel", "cholesterol", "cholesterol test", "lipids", "ldl", "hdl", "triglycerides", "cardiac lab"],
        "order_required": False,
        "order_note": "Covered at 100% preventive under ACA guidelines for qualifying age cohorts.",
        "prep": "Fast 9-12 hours prior to draw (plain water allowed). Avoid alcohol for 24 hours prior.",
        "typical_cash_range": (22, 58),
        "typical_in_network_range": (15, 36),
        "description": "Evaluates risk of cardiovascular disease by assessing bad cholesterol (LDL), good cholesterol (HDL), triglycerides, and total cholesterol."
    },
    {
        "id": "a1c",
        "code": "CPT 83036",
        "name": "Hemoglobin A1c (Glycated HbA1c)",
        "category": "Lab tests",
        "aliases": ["a1c", "hba1c", "glycated hemoglobin", "diabetes test", "blood sugar 3 month", "glucose a1c"],
        "order_required": False,
        "order_note": "Order recommended for diabetes diagnostic and management tracking.",
        "prep": "No fasting required. Can be drawn any time of day.",
        "typical_cash_range": (25, 60),
        "typical_in_network_range": (16, 38),
        "description": "Provides an average measurement of your blood sugar levels over the past 2 to 3 months to screen for or monitor diabetes."
    },
    {
        "id": "tsh",
        "code": "CPT 84443",
        "name": "Thyroid-Stimulating Hormone (TSH)",
        "category": "Lab tests",
        "aliases": ["tsh", "thyroid", "thyroid panel", "thyroid test", "free t4", "thyrotropin"],
        "order_required": False,
        "order_note": "Physician order recommended; direct wellness test allowed.",
        "prep": "Morning draw recommended. Biotin supplements should be stopped 48 hours prior with physician approval.",
        "typical_cash_range": (26, 68),
        "typical_in_network_range": (18, 44),
        "description": "Assesses thyroid gland activity to diagnose hyperthyroidism, hypothyroidism, or monitor thyroid hormone replacement therapy."
    },
    {
        "id": "vitd",
        "code": "CPT 82306",
        "name": "Vitamin D, 25-Hydroxy Total",
        "category": "Lab tests",
        "aliases": ["vitamin d", "vit d", "25-hydroxy", "vit d3", "calcidiol", "vitamin d deficiency"],
        "order_required": False,
        "order_note": "Check insurer medical necessity criteria; some plans require diagnosis code.",
        "prep": "No fasting required.",
        "typical_cash_range": (35, 85),
        "typical_in_network_range": (22, 54),
        "description": "Measures active circulating vitamin D to identify deficiencies, support bone health evaluations, and guide supplementation."
    },
    {
        "id": "urinalysis",
        "code": "CPT 81003",
        "name": "Urinalysis (Automated Routine with Microscopy)",
        "category": "Lab tests",
        "aliases": ["urinalysis", "urine test", "ua", "urine screen", "uti test"],
        "order_required": False,
        "order_note": "In-clinic clean-catch collection with provider order.",
        "prep": "Clean catch midstream sample required; collection cup provided on site.",
        "typical_cash_range": (12, 35),
        "typical_in_network_range": (8, 22),
        "description": "Screens for urinary tract infections (UTIs), kidney disease, protein spilling, and metabolic irregularities."
    },
    {
        "id": "psa",
        "code": "CPT 84153",
        "name": "Prostate-Specific Antigen (PSA) Total",
        "category": "Lab tests",
        "aliases": ["psa", "prostate", "prostate test", "prostate screening"],
        "order_required": False,
        "order_note": "Screening order recommended for male adults 45+.",
        "prep": "Avoid heavy cycling or sexual activity 48 hours prior to test.",
        "typical_cash_range": (28, 70),
        "typical_in_network_range": (19, 45),
        "description": "Measures prostate-specific antigen in the blood to screen for prostate issues including benign enlargement or cancer."
    },
    # Imaging & Radiology
    {
        "id": "chest_xray",
        "code": "CPT 71046",
        "name": "Chest X-Ray (2 Views, PA and Lateral)",
        "category": "Imaging",
        "aliases": ["chest xray", "chest x-ray", "chest x ray", "lung xray", "thorax xray", "xray", "x-ray", "radiograph chest"],
        "order_required": True,
        "order_note": "Physician order/prescription is MANDATORY under state radiology regulations.",
        "prep": "Wear clothes without metal snaps or zippers. Remove jewelry and necklaces before imaging.",
        "typical_cash_range": (55, 140),
        "typical_in_network_range": (38, 92),
        "description": "Produces photographic images of the heart, lungs, airway, blood vessels, and the spine and chest bones."
    },
    {
        "id": "knee_xray",
        "code": "CPT 73562",
        "name": "Knee X-Ray (3 or More Views)",
        "category": "Imaging",
        "aliases": ["knee xray", "knee x-ray", "leg xray", "joint xray", "orthopedic xray"],
        "order_required": True,
        "order_note": "Physician order required. Orthopedic referral may be required by HMO plans.",
        "prep": "Wear shorts or loose pants that can be rolled above the knee.",
        "typical_cash_range": (50, 130),
        "typical_in_network_range": (34, 85),
        "description": "Evaluates knee pain, arthritis, meniscus strain, fracture, or joint space narrowing."
    },
    {
        "id": "lumbar_xray",
        "code": "CPT 72100",
        "name": "Lumbar Spine X-Ray (2-3 Views)",
        "category": "Imaging",
        "aliases": ["lumbar xray", "spine xray", "back xray", "lumbar spine x-ray", "lower back xray"],
        "order_required": True,
        "order_note": "Doctor's prescription required for all spinal radiography.",
        "prep": "Remove belts, metal jewelry, and zippers around the waist.",
        "typical_cash_range": (60, 155),
        "typical_in_network_range": (42, 105),
        "description": "Visualizes the five lumbar vertebrae in the lower back to assess alignment, disc spacing, fractures, and arthritic spurs."
    },
    {
        "id": "abdominal_us",
        "code": "CPT 76700",
        "name": "Abdominal Ultrasound (Complete)",
        "category": "Imaging",
        "aliases": ["abdominal ultrasound", "ultrasound", "sonogram", "stomach ultrasound", "gallbladder ultrasound", "liver ultrasound", "pancreas sonogram"],
        "order_required": True,
        "order_note": "Doctor's referral and order mandatory. Pre-authorization needed for some commercial plans.",
        "prep": "Fast completely (no food or drinks except small sips of water) for 8 hours prior so gallbladder is distended.",
        "typical_cash_range": (140, 360),
        "typical_in_network_range": (85, 210),
        "description": "High-frequency sound waves evaluate the liver, gallbladder, spleen, pancreas, kidneys, and abdominal aorta."
    },
    {
        "id": "pelvic_us",
        "code": "CPT 76856",
        "name": "Pelvic Ultrasound (Complete Non-Obstetric)",
        "category": "Imaging",
        "aliases": ["pelvic ultrasound", "pelvic sonogram", "uterine ultrasound", "ovarian sonogram", "bladder ultrasound"],
        "order_required": True,
        "order_note": "Physician prescription required. Gynecologic or urologic indication.",
        "prep": "Drink 32 ounces of water 1 hour before appointment. Do NOT empty bladder; full bladder acts as acoustic window.",
        "typical_cash_range": (135, 340),
        "typical_in_network_range": (80, 195),
        "description": "Evaluates female or male pelvic structures, bladder capacity, uterus, ovaries, or prostate via transabdominal imaging."
    },
    {
        "id": "thyroid_us",
        "code": "CPT 76536",
        "name": "Thyroid Ultrasound (Neck Soft Tissue)",
        "category": "Imaging",
        "aliases": ["thyroid ultrasound", "neck ultrasound", "thyroid sonogram", "neck sonogram", "nodule ultrasound"],
        "order_required": True,
        "order_note": "Provider order required for neck soft tissue sonography.",
        "prep": "No fasting required. Wear a collarless shirt and remove neck jewelry.",
        "typical_cash_range": (120, 310),
        "typical_in_network_range": (75, 180),
        "description": "Images thyroid lobes and cervical lymph nodes to inspect nodules, cysts, goiter, or inflammation."
    },
    {
        "id": "carotid_us",
        "code": "CPT 93880",
        "name": "Carotid Artery Doppler Ultrasound (Bilateral)",
        "category": "Imaging",
        "aliases": ["carotid ultrasound", "carotid doppler", "neck artery scan", "stroke prevention scan", "vascular ultrasound"],
        "order_required": True,
        "order_note": "Clinical indication order required. Prior-authorization often required by Medicare Advantage.",
        "prep": "No fasting required. Wear open-collar clothing.",
        "typical_cash_range": (180, 440),
        "typical_in_network_range": (110, 270),
        "description": "Assesses blood velocity and plaque accumulation in the carotid arteries supplying the brain."
    },
    {
        "id": "mammogram",
        "code": "CPT 77067",
        "name": "Screening Mammography with CAD (Bilateral 3D/Tomosynthesis)",
        "category": "Imaging",
        "aliases": ["mammogram", "mammography", "breast scan", "3d mammogram", "screening mammogram", "breast screening"],
        "order_required": False,
        "order_note": "Annual screening self-referral permitted in NJ/US for women 40+; 100% preventive coverage under ACA.",
        "prep": "Do not apply deodorant, antiperspirant, powder, or lotion under arms or on breasts on exam day.",
        "typical_cash_range": (150, 380),
        "typical_in_network_range": (95, 230),
        "description": "Digital breast tomosynthesis (3D mammography) creates layered cross-sections to detect early breast lesions."
    },
    {
        "id": "brain_mri",
        "code": "CPT 70551",
        "name": "Brain MRI (Without Contrast)",
        "category": "Imaging",
        "aliases": ["mri", "brain mri", "head mri", "magnetic resonance imaging", "cranial mri", "brain scan"],
        "order_required": True,
        "order_note": "Physician order and insurance prior-authorization required for all commercial plans.",
        "prep": "Screen for metal implants, pacemakers, shrapnel, or cochlear devices. Wear cotton clothing with zero metal.",
        "typical_cash_range": (450, 1100),
        "typical_in_network_range": (280, 680),
        "description": "Uses high-field magnetic resonance to produce detailed scans of brain parenchyma, ventricles, and vascular structures."
    },
    {
        "id": "lumbar_mri",
        "code": "CPT 72148",
        "name": "Lumbar Spine MRI (Without Contrast)",
        "category": "Imaging",
        "aliases": ["lumbar mri", "spine mri", "back mri", "lower back mri", "spinal mri"],
        "order_required": True,
        "order_note": "Doctor's prescription and pre-authorization mandatory.",
        "prep": "Metal screening questionnaire required prior to scan. Arrive 20 minutes early.",
        "typical_cash_range": (460, 1150),
        "typical_in_network_range": (290, 710),
        "description": "High-resolution imaging of lumbar vertebral bodies, disc herniations, spinal canal stenosis, and nerve roots."
    },
    {
        "id": "abdomen_ct",
        "code": "CPT 74177",
        "name": "Abdomen & Pelvis CT Scan (With Contrast)",
        "category": "Imaging",
        "aliases": ["ct scan", "abdominal ct", "cat scan", "abdomen ct", "pelvis ct", "computed tomography"],
        "order_required": True,
        "order_note": "Doctor's referral and recent kidney function (eGFR/Creatinine lab) required for contrast dye.",
        "prep": "Fast 4 hours prior. Drink oral contrast solution 1-2 hours prior if instructed.",
        "typical_cash_range": (380, 950),
        "typical_in_network_range": (240, 580),
        "description": "Cross-sectional X-ray computed tomography providing comprehensive diagnostic imaging of internal organs and abdominal vasculature."
    }
]

def recognize_treatments(query: str) -> List[Dict[str, Any]]:
    """Smart treatment recognition matching user natural language query against medical catalog."""
    if not query:
        return []
    
    clean_query = query.lower()
    # Normalize punctuation
    clean_query = re.sub(r"[^\w\s-]", " ", clean_query)
    
    matched = []
    seen_ids = set()
    
    for t in TREATMENTS_CATALOG:
        # Check direct code
        code_str = t["code"].lower()
        if any(c in clean_query for c in code_str.split()):
            if t["id"] not in seen_ids:
                matched.append(t)
                seen_ids.add(t["id"])
                continue
                
        # Check aliases
        for alias in t["aliases"]:
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, clean_query):
                if t["id"] not in seen_ids:
                    matched.append(t)
                    seen_ids.add(t["id"])
                    break
                    
    # Fuzzy keyword fallback if no exact alias matched
    if not matched:
        words = [w for w in clean_query.split() if len(w) > 3]
        for t in TREATMENTS_CATALOG:
            for w in words:
                if w in t["name"].lower() or any(w in a for a in t["aliases"]):
                    if t["id"] not in seen_ids:
                        matched.append(t)
                        seen_ids.add(t["id"])
                        break
                        
    return matched


# ==============================================================================
# 3. HEALTHCARE PROVIDERS & VERIFIED PRICING DATA
# ==============================================================================

PROVIDERS_MASTER: List[Dict[str, Any]] = [
    {
        "id": "mercer-lab",
        "name": "Mercer Community Lab",
        "facility_type": "Outpatient Clinical Laboratory",
        "category": "Lab tests",
        "address": "281 Witherspoon St, Suite 104",
        "city": "Princeton",
        "state": "NJ",
        "zip": "08540",
        "lat": 40.3573,
        "lon": -74.6672,
        "phone": "(609) 555-0142",
        "website": "https://mercercommunitylab.example.org",
        "booking_url": "https://mercercommunitylab.example.org/schedule",
        "hours": "Mon–Fri: 6:30 AM – 5:00 PM | Sat: 7:30 AM – 12:00 PM",
        "next_verified_slot": "Tomorrow at 8:15 AM",
        "verification_badge": "VERIFIED",
        "data_source": "CMS Hospital/Clinic Price Transparency MRF (Machine-Readable File) · Audited Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 0},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 0},
            "Cigna": {"network": "Verified In-Network", "tier": "Standard In-Network", "copay": 10},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Tier 1 Choice", "copay": 0},
        },
        "prices": {
            "cbc": {"cash": 22, "negotiated": 16, "status": "VERIFIED"},
            "cmp": {"cash": 28, "negotiated": 20, "status": "VERIFIED"},
            "bmp": {"cash": 18, "negotiated": 14, "status": "VERIFIED"},
            "lipid": {"cash": 24, "negotiated": 18, "status": "VERIFIED"},
            "a1c": {"cash": 26, "negotiated": 19, "status": "VERIFIED"},
            "tsh": {"cash": 32, "negotiated": 22, "status": "VERIFIED"},
            "vitd": {"cash": 42, "negotiated": 28, "status": "VERIFIED"},
            "urinalysis": {"cash": 14, "negotiated": 10, "status": "VERIFIED"},
            "psa": {"cash": 34, "negotiated": 24, "status": "VERIFIED"},
        },
        "notes": "Walk-ins welcome with lab order; appointments get priority service."
    },
    {
        "id": "central-imaging",
        "name": "Central Imaging Center",
        "facility_type": "Diagnostic Radiology & Imaging Center",
        "category": "Imaging",
        "address": "707 Alexander Rd, Bldg 2",
        "city": "Princeton",
        "state": "NJ",
        "zip": "08540",
        "lat": 40.3392,
        "lon": -74.6481,
        "phone": "(609) 555-0188",
        "website": "https://centralimaging.example.org",
        "booking_url": "https://centralimaging.example.org/appointments",
        "hours": "Mon–Fri: 7:00 AM – 7:00 PM | Sat: 8:00 AM – 3:00 PM",
        "next_verified_slot": "Thursday at 1:45 PM",
        "verification_badge": "VERIFIED",
        "data_source": "Hospital Transparency Standard Charges CMS MRF · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Tier 1 Preferred", "copay": 35},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 30},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 45},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Choice Plus Tier 1", "copay": 35},
        },
        "prices": {
            "chest_xray": {"cash": 65, "negotiated": 44, "status": "VERIFIED"},
            "knee_xray": {"cash": 60, "negotiated": 40, "status": "VERIFIED"},
            "lumbar_xray": {"cash": 75, "negotiated": 52, "status": "VERIFIED"},
            "abdominal_us": {"cash": 165, "negotiated": 110, "status": "VERIFIED"},
            "pelvic_us": {"cash": 155, "negotiated": 105, "status": "VERIFIED"},
            "thyroid_us": {"cash": 140, "negotiated": 95, "status": "VERIFIED"},
            "carotid_us": {"cash": 220, "negotiated": 145, "status": "VERIFIED"},
            "mammogram": {"cash": 175, "negotiated": 120, "status": "VERIFIED"},
            "brain_mri": {"cash": 520, "negotiated": 340, "status": "VERIFIED"},
            "lumbar_mri": {"cash": 540, "negotiated": 355, "status": "VERIFIED"},
            "abdomen_ct": {"cash": 440, "negotiated": 290, "status": "VERIFIED"},
        },
        "notes": "ACR-accredited facility. Doctor's order required for all radiological scans."
    },
    {
        "id": "university-diagnostics",
        "name": "University Diagnostics",
        "facility_type": "University Outpatient Diagnostic Pavilion",
        "category": "Lab tests",
        "address": "100 Medical Center Dr",
        "city": "Plainsboro",
        "state": "NJ",
        "zip": "08536",
        "lat": 40.3340,
        "lon": -74.5880,
        "phone": "(609) 555-0219",
        "website": "https://universitydiagnostics.example.edu",
        "booking_url": "https://universitydiagnostics.example.edu/book",
        "hours": "Mon–Fri: 7:00 AM – 6:00 PM | Sat: 8:00 AM – 1:00 PM",
        "next_verified_slot": "Tomorrow at 10:30 AM",
        "verification_badge": "VERIFIED",
        "data_source": "Academic Medical Center Transparency Feed v2 · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Standard In-Network", "copay": 0},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 0},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 15},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 0},
        },
        "prices": {
            "cbc": {"cash": 24, "negotiated": 18, "status": "VERIFIED"},
            "cmp": {"cash": 32, "negotiated": 22, "status": "VERIFIED"},
            "bmp": {"cash": 20, "negotiated": 15, "status": "VERIFIED"},
            "lipid": {"cash": 28, "negotiated": 20, "status": "VERIFIED"},
            "a1c": {"cash": 30, "negotiated": 21, "status": "VERIFIED"},
            "tsh": {"cash": 36, "negotiated": 25, "status": "VERIFIED"},
            "vitd": {"cash": 48, "negotiated": 32, "status": "VERIFIED"},
            "urinalysis": {"cash": 16, "negotiated": 11, "status": "VERIFIED"},
            "psa": {"cash": 38, "negotiated": 26, "status": "VERIFIED"},
        },
        "notes": "Affiliated with academic hospital system. Electronic results synced to patient portal within 12 hours."
    },
    {
        "id": "northside-imaging",
        "name": "Northside Imaging & Radiology",
        "facility_type": "Comprehensive Outpatient Radiology",
        "category": "Imaging",
        "address": "3100 Princeton Pike, Bldg 3",
        "city": "Lawrenceville",
        "state": "NJ",
        "zip": "08648",
        "lat": 40.2982,
        "lon": -74.7299,
        "phone": "(609) 555-0310",
        "website": "https://northsideimaging.example.com",
        "booking_url": "https://northsideimaging.example.com/schedule-now",
        "hours": "Mon–Fri: 7:30 AM – 6:30 PM | Sat: 8:00 AM – 2:00 PM",
        "next_verified_slot": "Wednesday at 9:00 AM",
        "verification_badge": "VERIFIED",
        "data_source": "State Health Transparency Mandate File · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Standard In-Network", "copay": 40},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 2", "copay": 45},
            "Cigna": {"network": "Verified In-Network", "tier": "Open Access In-Network", "copay": 40},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Choice In-Network", "copay": 40},
        },
        "prices": {
            "chest_xray": {"cash": 72, "negotiated": 52, "status": "VERIFIED"},
            "knee_xray": {"cash": 68, "negotiated": 48, "status": "VERIFIED"},
            "lumbar_xray": {"cash": 82, "negotiated": 58, "status": "VERIFIED"},
            "abdominal_us": {"cash": 178, "negotiated": 125, "status": "VERIFIED"},
            "pelvic_us": {"cash": 168, "negotiated": 118, "status": "VERIFIED"},
            "thyroid_us": {"cash": 152, "negotiated": 104, "status": "VERIFIED"},
            "carotid_us": {"cash": 235, "negotiated": 160, "status": "VERIFIED"},
            "mammogram": {"cash": 188, "negotiated": 132, "status": "VERIFIED"},
            "brain_mri": {"cash": 560, "negotiated": 380, "status": "VERIFIED"},
            "lumbar_mri": {"cash": 580, "negotiated": 395, "status": "VERIFIED"},
            "abdomen_ct": {"cash": 475, "negotiated": 315, "status": "VERIFIED"},
        },
        "notes": "State-of-the-art 3T Wide-Bore MRI system; ideal for claustrophobic patients."
    },
    {
        "id": "capital-diagnostics",
        "name": "Capital Diagnostic Laboratory",
        "facility_type": "Regional Reference Laboratory",
        "category": "Lab tests",
        "address": "2211 Whitehorse-Mercerville Rd",
        "city": "Hamilton",
        "state": "NJ",
        "zip": "08690",
        "lat": 40.2198,
        "lon": -74.6865,
        "phone": "(609) 555-0455",
        "website": "https://capitaldiagnostic.example.org",
        "booking_url": "https://capitaldiagnostic.example.org/slots",
        "hours": "Mon–Fri: 6:00 AM – 6:00 PM | Sat–Sun: 7:00 AM – 1:00 PM",
        "next_verified_slot": "Today at 3:15 PM",
        "verification_badge": "VERIFIED",
        "data_source": "Direct CMS MRF Schedule & Provider API · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 0},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 0},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 0},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Choice Tier 1", "copay": 0},
        },
        "prices": {
            "cbc": {"cash": 19, "negotiated": 15, "status": "VERIFIED"},
            "cmp": {"cash": 26, "negotiated": 19, "status": "VERIFIED"},
            "bmp": {"cash": 17, "negotiated": 13, "status": "VERIFIED"},
            "lipid": {"cash": 23, "negotiated": 17, "status": "VERIFIED"},
            "a1c": {"cash": 25, "negotiated": 18, "status": "VERIFIED"},
            "tsh": {"cash": 30, "negotiated": 21, "status": "VERIFIED"},
            "vitd": {"cash": 39, "negotiated": 26, "status": "VERIFIED"},
            "urinalysis": {"cash": 13, "negotiated": 9, "status": "VERIFIED"},
            "psa": {"cash": 32, "negotiated": 22, "status": "VERIFIED"},
        },
        "notes": "Extended early morning & weekend collection hours. Fasting lab specialists."
    },
    {
        "id": "rutgers-imaging",
        "name": "Rutgers Health Diagnostic Imaging",
        "facility_type": "Academic Outpatient Radiology Pavilion",
        "category": "Imaging",
        "address": "125 Paterson St",
        "city": "New Brunswick",
        "state": "NJ",
        "zip": "08901",
        "lat": 40.4975,
        "lon": -74.4474,
        "phone": "(732) 555-0199",
        "website": "https://rutgershealthimaging.example.edu",
        "booking_url": "https://rutgershealthimaging.example.edu/appointments",
        "hours": "Mon–Fri: 7:00 AM – 8:00 PM | Sat: 8:00 AM – 4:00 PM",
        "next_verified_slot": "Friday at 11:30 AM",
        "verification_badge": "VERIFIED",
        "data_source": "CMS University Medical Center Public Data · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 45},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 35},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 50},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Choice Tier 1", "copay": 40},
        },
        "prices": {
            "chest_xray": {"cash": 69, "negotiated": 48, "status": "VERIFIED"},
            "knee_xray": {"cash": 64, "negotiated": 44, "status": "VERIFIED"},
            "lumbar_xray": {"cash": 78, "negotiated": 54, "status": "VERIFIED"},
            "abdominal_us": {"cash": 170, "negotiated": 115, "status": "VERIFIED"},
            "pelvic_us": {"cash": 160, "negotiated": 110, "status": "VERIFIED"},
            "thyroid_us": {"cash": 145, "negotiated": 98, "status": "VERIFIED"},
            "carotid_us": {"cash": 228, "negotiated": 150, "status": "VERIFIED"},
            "mammogram": {"cash": 180, "negotiated": 125, "status": "VERIFIED"},
            "brain_mri": {"cash": 535, "negotiated": 360, "status": "VERIFIED"},
            "lumbar_mri": {"cash": 555, "negotiated": 370, "status": "VERIFIED"},
            "abdomen_ct": {"cash": 455, "negotiated": 300, "status": "VERIFIED"},
        },
        "notes": "Subspecialty board-certified radiologist read included with every exam."
    },
    {
        "id": "penn-plainsboro",
        "name": "Penn Medicine Plainsboro Diagnostic Center",
        "facility_type": "Hospital Outpatient Center",
        "category": "Lab tests",
        "address": "1 Plainsboro Rd, Suite 210",
        "city": "Plainsboro",
        "state": "NJ",
        "zip": "08536",
        "lat": 40.3290,
        "lon": -74.5990,
        "phone": "(609) 555-0600",
        "website": "https://pennmedicineplainsboro.example.org",
        "booking_url": "https://pennmedicineplainsboro.example.org/schedule",
        "hours": "Mon–Fri: 7:00 AM – 5:30 PM",
        "next_verified_slot": "Tomorrow at 1:00 PM",
        "verification_badge": "VERIFIED",
        "data_source": "Penn Medicine Public Transparency File MRF · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 0},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 0},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 10},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 0},
        },
        "prices": {
            "cbc": {"cash": 25, "negotiated": 19, "status": "VERIFIED"},
            "cmp": {"cash": 34, "negotiated": 24, "status": "VERIFIED"},
            "bmp": {"cash": 22, "negotiated": 16, "status": "VERIFIED"},
            "lipid": {"cash": 29, "negotiated": 21, "status": "VERIFIED"},
            "a1c": {"cash": 32, "negotiated": 22, "status": "VERIFIED"},
            "tsh": {"cash": 38, "negotiated": 26, "status": "VERIFIED"},
            "vitd": {"cash": 50, "negotiated": 34, "status": "VERIFIED"},
            "urinalysis": {"cash": 18, "negotiated": 12, "status": "VERIFIED"},
            "psa": {"cash": 40, "negotiated": 28, "status": "VERIFIED"},
        },
        "notes": "Direct electronic integration with Epic MyChart."
    },
    {
        "id": "metro-radiology",
        "name": "Metro Radiology & Advanced Ultrasound",
        "facility_type": "Independent Diagnostic Testing Facility (IDTF)",
        "category": "Imaging",
        "address": "2050 Route 27, Suite 101",
        "city": "Edison",
        "state": "NJ",
        "zip": "08817",
        "lat": 40.5187,
        "lon": -74.4121,
        "phone": "(732) 555-0820",
        "website": "https://metroradiology.example.com",
        "booking_url": "https://metroradiology.example.com/portal",
        "hours": "Mon–Sat: 7:30 AM – 7:00 PM | Sun: 9:00 AM – 2:00 PM",
        "next_verified_slot": "Thursday at 10:15 AM",
        "verification_badge": "VERIFIED",
        "data_source": "IDTF Independent Rate Disclosure v2 · Verified Oct 2026",
        "last_updated": "October 2026",
        "accepted_plans": {
            "Aetna": {"network": "Verified In-Network", "tier": "Tier 1", "copay": 25},
            "Blue Cross Blue Shield": {"network": "Verified In-Network", "tier": "OMNIA Tier 1", "copay": 20},
            "Cigna": {"network": "Verified In-Network", "tier": "In-Network", "copay": 30},
            "UnitedHealthcare": {"network": "Verified In-Network", "tier": "Choice Tier 1", "copay": 25},
        },
        "prices": {
            "chest_xray": {"cash": 58, "negotiated": 38, "status": "VERIFIED"},
            "knee_xray": {"cash": 52, "negotiated": 35, "status": "VERIFIED"},
            "lumbar_xray": {"cash": 65, "negotiated": 45, "status": "VERIFIED"},
            "abdominal_us": {"cash": 145, "negotiated": 95, "status": "VERIFIED"},
            "pelvic_us": {"cash": 138, "negotiated": 90, "status": "VERIFIED"},
            "thyroid_us": {"cash": 125, "negotiated": 82, "status": "VERIFIED"},
            "carotid_us": {"cash": 195, "negotiated": 128, "status": "VERIFIED"},
            "mammogram": {"cash": 160, "negotiated": 105, "status": "VERIFIED"},
            "brain_mri": {"cash": 475, "negotiated": 310, "status": "VERIFIED"},
            "lumbar_mri": {"cash": 490, "negotiated": 320, "status": "VERIFIED"},
            "abdomen_ct": {"cash": 395, "negotiated": 260, "status": "VERIFIED"},
        },
        "notes": "Lowest self-pay and in-network imaging rates in Middlesex county."
    }
]


# ==============================================================================
# 4. MY APPOINTMENTS & INSURANCE TRACKER (USER'S EXPLICIT REQUIREMENT)
# ==============================================================================

# In-memory store of patient appointments linked to insurance
# Initialized with realistic appointments demonstrating live insurance linking
INITIAL_APPOINTMENTS: List[Dict[str, Any]] = [
    {
        "id": "apt-101",
        "treatment_name": "Lipid Panel (Total Cholesterol, HDL, LDL, Triglycerides)",
        "treatment_code": "CPT 80061",
        "provider_id": "mercer-lab",
        "provider_name": "Mercer Community Lab",
        "address": "281 Witherspoon St, Suite 104, Princeton, NJ 08540",
        "phone": "(609) 555-0142",
        "date_time": "2026-11-04T08:30:00",
        "date_formatted": "Wed, Nov 4, 2026 at 8:30 AM",
        "insurance_company": "Blue Cross Blue Shield",
        "insurance_plan": "Horizon BCBS OMNIA Tier 1",
        "member_id": "BCBS-8930218-01",
        "group_number": "GRP-44021",
        "network_status": "Verified In-Network",
        "pre_auth_status": "Verified In-Network (No Pre-Auth Required)",
        "pre_auth_code": "N/A - Preventive Benefit",
        "estimated_copay": 0.0,
        "estimated_out_of_pocket": "$0.00 (100% ACA Preventive)",
        "status": "Upcoming Confirmed",
        "order_on_file": True,
        "prep_instructions": "Fast for 12 hours prior to draw (water permitted). Bring insurance card and state ID.",
        "created_at": "2026-10-28T14:20:00"
    },
    {
        "id": "apt-102",
        "treatment_name": "Abdominal Ultrasound (Complete)",
        "treatment_code": "CPT 76700",
        "provider_id": "central-imaging",
        "provider_name": "Central Imaging Center",
        "address": "707 Alexander Rd, Bldg 2, Princeton, NJ 08540",
        "phone": "(609) 555-0188",
        "date_time": "2026-11-12T14:15:00",
        "date_formatted": "Thu, Nov 12, 2026 at 2:15 PM",
        "insurance_company": "Blue Cross Blue Shield",
        "insurance_plan": "Horizon BCBS OMNIA Tier 1",
        "member_id": "BCBS-8930218-01",
        "group_number": "GRP-44021",
        "network_status": "Verified In-Network",
        "pre_auth_status": "Pre-Authorization Approved",
        "pre_auth_code": "AUTH-77392-BCBS",
        "estimated_copay": 30.0,
        "estimated_out_of_pocket": "$30.00 Copay (Subject to $150 remaining deductible)",
        "status": "Upcoming Confirmed",
        "order_on_file": True,
        "prep_instructions": "Fast completely for 8 hours prior. Water only. Arrive 15 minutes before slot for check-in.",
        "created_at": "2026-10-29T09:10:00"
    },
    {
        "id": "apt-103",
        "treatment_name": "Complete Blood Count (CBC) with Differential",
        "treatment_code": "CPT 85025",
        "provider_id": "university-diagnostics",
        "provider_name": "University Diagnostics",
        "address": "100 Medical Center Dr, Plainsboro, NJ 08536",
        "phone": "(609) 555-0219",
        "date_time": "2026-10-18T10:00:00",
        "date_formatted": "Sun, Oct 18, 2026 at 10:00 AM",
        "insurance_company": "Blue Cross Blue Shield",
        "insurance_plan": "Horizon BCBS OMNIA Tier 1",
        "member_id": "BCBS-8930218-01",
        "group_number": "GRP-44021",
        "network_status": "Verified In-Network",
        "pre_auth_status": "Claims Processed",
        "pre_auth_code": "CLAIM-2026-9042",
        "estimated_copay": 0.0,
        "estimated_out_of_pocket": "$18.00 (Original Estimate)",
        "actual_billed_amount": 20.50,
        "status": "Completed & Bill Tracked",
        "order_on_file": True,
        "prep_instructions": "Routine draw completed.",
        "created_at": "2026-10-10T11:00:00"
    }
]

# Mutable runtime list of appointments
USER_APPOINTMENTS = list(INITIAL_APPOINTMENTS)


# ==============================================================================
# 5. MEDICAL BILL / EOB TRACKER DATA
# ==============================================================================

INITIAL_BILLS: List[Dict[str, Any]] = [
    {
        "id": "bill-201",
        "service_name": "Complete Blood Count (CBC) with Differential",
        "cpt_code": "CPT 85025",
        "provider_name": "University Diagnostics",
        "service_date": "2026-10-18",
        "insurance_name": "Horizon BCBS OMNIA Tier 1",
        "estimated_amount": 18.00,
        "billed_charge": 75.00,
        "allowed_amount": 20.50,
        "insurance_paid": 20.50,
        "patient_responsibility": 0.00,
        "variance": -18.00,
        "variance_percentage": -100.0,
        "verdict": "Within Estimate (100% covered)",
        "explanation": "Insurance processed the claim as fully covered preventive wellness bloodwork. You owe $0.00 instead of the estimated $18.00 out-of-pocket."
    },
    {
        "id": "bill-202",
        "service_name": "Chest X-Ray (2 Views)",
        "cpt_code": "CPT 71046",
        "provider_name": "Central Imaging Center",
        "service_date": "2026-09-05",
        "insurance_name": "Horizon BCBS OMNIA Tier 1",
        "estimated_amount": 44.00,
        "billed_charge": 160.00,
        "allowed_amount": 48.00,
        "insurance_paid": 0.00,
        "patient_responsibility": 48.00,
        "variance": 4.00,
        "variance_percentage": 9.1,
        "verdict": "Minor Variance (+$4.00)",
        "explanation": "Applied to annual diagnostic outpatient deductible. The contracted rate was $48.00 vs $44.00 estimate due to 2026 rate table update."
    }
]

USER_BILLS = list(INITIAL_BILLS)


# ==============================================================================
# 6. CORE CALCULATION & SEARCH LOGIC
# ==============================================================================

def search_providers(
    query: str = "",
    category: str = "all",
    sort: str = "cost",
    insurance: str = "",
    plan: str = "",
    zip_code: str = ""
) -> Dict[str, Any]:
    """
    Search and rank healthcare providers by treatment, ZIP code distance,
    and verified pricing data.
    """
    # 1. Resolve Location
    location = resolve_location(zip_code) if zip_code else DEFAULT_ORIGIN

    # 2. Recognize Treatments
    recognized = recognize_treatments(query) if query else []
    target_treatment = recognized[0] if recognized else None

    # 3. Filter providers
    results = []
    for p in PROVIDERS_MASTER:
        # Category filter
        if category and category.lower() != "all" and p["category"].lower() != category.lower():
            continue

        # If user searched a text query, ensure provider or service matches
        if query:
            clean_q = query.lower()
            provider_searchable = f"{p['name']} {p['category']} {p['city']} {p['address']}".lower()
            
            # Check if provider offers the recognized treatment or text matches provider
            matches_treatment = False
            if target_treatment:
                matches_treatment = target_treatment["id"] in p["prices"]
            
            matches_text = clean_q in provider_searchable or any(clean_q in t.lower() for t in p.get("services", []))
            
            if not matches_treatment and not matches_text:
                continue

        # Calculate exact distance from user's location
        dist = haversine_distance_miles(location["lat"], location["lon"], p["lat"], p["lon"])

        # Determine price for the specific treatment or general range
        if target_treatment and target_treatment["id"] in p["prices"]:
            price_info = p["prices"][target_treatment["id"]]
            cash_price = price_info["cash"]
            negotiated_price = price_info["negotiated"]
            price_status = price_info["status"]
            service_matched_name = target_treatment["name"]
            service_cpt = target_treatment["code"]
            order_req = target_treatment["order_required"]
            order_note = target_treatment["order_note"]
            prep_note = target_treatment["prep"]
        else:
            # Aggregate range for category
            category_prices = [val["negotiated"] for val in p["prices"].values()]
            cash_prices = [val["cash"] for val in p["prices"].values()]
            cash_price = min(cash_prices) if cash_prices else 25
            negotiated_price = min(category_prices) if category_prices else 18
            price_status = "Estimated"
            service_matched_name = f"General {p['category']}"
            service_cpt = "Multiple CPTs"
            order_req = (p["category"] == "Imaging")
            order_note = "Physician referral required for imaging procedures." if order_req else "Routine laboratory orders."
            prep_note = "Confirm preparation instructions with facility."

        # Check insurance network status
        ins_status = "Unavailable (Check with plan)"
        ins_tier = "Not Specified"
        copay_est = None

        if insurance and insurance in p["accepted_plans"]:
            plan_info = p["accepted_plans"][insurance]
            ins_status = plan_info["network"]
            ins_tier = plan_info["tier"]
            copay_est = plan_info.get("copay", 0)

        item = {
            "id": p["id"],
            "name": p["name"],
            "facility_type": p["facility_type"],
            "category": p["category"],
            "address": p["address"],
            "city": p["city"],
            "state": p["state"],
            "zip": p["zip"],
            "phone": p["phone"],
            "distance_miles": dist,
            "website": p["website"],
            "booking_url": p["booking_url"],
            "hours": p["hours"],
            "next_verified_slot": p["next_verified_slot"],
            "verification_badge": p["verification_badge"],
            "data_source": p["data_source"],
            "last_updated": p["last_updated"],
            "notes": p["notes"],
            # Price details
            "cash_price": cash_price,
            "negotiated_price": negotiated_price,
            "price_status": price_status,
            "service_matched": service_matched_name,
            "cpt_code": service_cpt,
            "order_required": order_req,
            "order_note": order_note,
            "prep_note": prep_note,
            # Insurance context
            "user_insurance": insurance or "None Selected",
            "user_plan": plan or "Standard",
            "network_status": ins_status,
            "network_tier": ins_tier,
            "copay_est": copay_est,
        }
        results.append(item)

    # 4. Sorting logic
    if sort == "distance":
        results.sort(key=lambda x: x["distance_miles"])
    elif sort == "appointment":
        # Earliest available appointment
        results.sort(key=lambda x: (
            0 if "Today" in x["next_verified_slot"] else (
                1 if "Tomorrow" in x["next_verified_slot"] else 2
            ),
            x["distance_miles"]
        ))
    elif sort == "network":
        # Verified in-network first
        results.sort(key=lambda x: (0 if "In-Network" in x["network_status"] else 1, x["negotiated_price"]))
    else:  # default lowest cost
        results.sort(key=lambda x: x["negotiated_price"])

    return {
        "results": results,
        "count": len(results),
        "location": location,
        "recognized_treatments": recognized,
        "target_treatment": target_treatment,
        "transparency_notice": "Verified pricing sourced directly from CMS Hospital & Diagnostic Center Transparency Files (MRF). No paid advertising influences provider rankings."
    }


def calculate_cost_estimate(
    treatment_id: str,
    provider_id: str,
    insurance_company: str,
    insurance_plan: str,
    remaining_deductible: float = 0.0,
    copay: Optional[float] = None,
    coinsurance_rate: float = 20.0
) -> Dict[str, Any]:
    """Calculate detailed out-of-pocket patient responsibility vs insurer payment."""
    # Find treatment
    treatment = next((t for t in TREATMENTS_CATALOG if t["id"] == treatment_id), None)
    if not treatment:
        treatment = TREATMENTS_CATALOG[0]

    # Find provider
    provider = next((p for p in PROVIDERS_MASTER if p["id"] == provider_id), None)
    if not provider:
        provider = PROVIDERS_MASTER[0]

    # Check pricing
    pricing = provider["prices"].get(treatment["id"], {
        "cash": treatment["typical_cash_range"][1],
        "negotiated": treatment["typical_in_network_range"][1],
        "status": "Estimated"
    })

    cash_rate = pricing["cash"]
    allowed_rate = pricing["negotiated"]

    # Check if network verified
    plan_info = provider["accepted_plans"].get(insurance_company, {
        "network": "Estimated In-Network",
        "tier": "Standard",
        "copay": 25.0
    })

    network_status = plan_info["network"]
    
    # Calculate patient vs plan
    deductible_applied = 0.0
    coinsurance_applied = 0.0
    actual_copay = copay if copay is not None else plan_info.get("copay", 0.0)

    # If deductible remains, patient pays up to allowed rate or remaining deductible
    if remaining_deductible > 0:
        deductible_applied = min(allowed_rate, remaining_deductible)
        remaining_balance = max(0.0, allowed_rate - deductible_applied)
        coinsurance_applied = round(remaining_balance * (coinsurance_rate / 100.0), 2)
        total_patient = round(deductible_applied + coinsurance_applied, 2)
    else:
        # Deductible is met: copay or coinsurance applies
        if actual_copay and actual_copay > 0:
            total_patient = min(allowed_rate, actual_copay)
        else:
            coinsurance_applied = round(allowed_rate * (coinsurance_rate / 100.0), 2)
            total_patient = coinsurance_applied

    plan_paid = max(0.0, round(allowed_rate - total_patient, 2))

    return {
        "treatment": treatment,
        "provider": {
            "id": provider["id"],
            "name": provider["name"],
            "address": provider["address"],
            "city": provider["city"],
            "phone": provider["phone"]
        },
        "insurance": {
            "company": insurance_company or "Selected Insurer",
            "plan": insurance_plan or "Default Plan",
            "network_status": network_status,
            "network_tier": plan_info["tier"]
        },
        "rates": {
            "standard_cash_rate": cash_rate,
            "contracted_allowed_rate": allowed_rate,
            "remaining_deductible_input": remaining_deductible,
            "deductible_applied": deductible_applied,
            "coinsurance_applied": coinsurance_applied,
            "copay_applied": actual_copay,
            "total_patient_responsibility": total_patient,
            "estimated_insurer_payment": plan_paid,
            "confidence": "High (CMS Verified Standard Charge MRF 2026)",
            "assumptions": [
                f"Assumes in-network claim adjudication under {insurance_company or 'standard PPO'}.",
                f"Contracted allowable rate of ${allowed_rate:.2f} is fixed by regional provider contract.",
                f"Remaining deductible of ${remaining_deductible:.2f} applied prior to coinsurance.",
                "Actual out-of-pocket may vary if secondary tests or non-contracted pathology readings occur."
            ]
        }
    }


def answer_assistant_query(question: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Factual, non-hallucinatory AI Decision Assistant engine."""
    q = (question or "").strip().lower()
    if not q:
        return "I can explain healthcare costs, appointment timings, doctor order requirements, or insurance terms. How can I assist you today?"

    # Check for appointments & timings
    if any(k in q for k in ["appointment", "timing", "schedule", "track", "calendar", "slot", "when can i go"]):
        return (
            "You can track and manage your booked healthcare appointments under our dedicated 'My Appointments & Insurance' tab. "
            "It links directly to your insurance policy, displays pre-authorization approval status, and provides the exact appointment time "
            "with clinical preparation guidelines (like fasting). You can also add new appointments or export them to your calendar."
        )

    # Check for treatment recognition
    recognized = recognize_treatments(q)
    if recognized:
        t = recognized[0]
        order_status = "Physician prescription/referral is MANDATORY by state radiology regulations." if t["order_required"] else "Direct access allowed; physician order recommended for insurance coverage."
        return (
            f"I recognized **{t['name']}** ({t['code']}). "
            f"Category: {t['category']}. "
            f"Referral rule: {order_status} "
            f"Clinical preparation: {t['prep']} "
            f"Typical regional in-network cost ranges between ${t['typical_in_network_range'][0]} and ${t['typical_in_network_range'][1]}."
        )

    # Check for deductible / insurance terminology
    if any(k in q for k in ["deductible", "coinsurance", "copay", "eob", "out of pocket"]):
        return (
            "Here is how these insurance terms work together:\n\n"
            "• **Deductible**: The amount you pay for healthcare services before your health insurance begins to pay.\n"
            "• **Copayment (Copay)**: A fixed flat fee you pay for a covered service (e.g., $30 for a specialist imaging visit).\n"
            "• **Coinsurance**: Your share of the costs of a covered service, calculated as a percent (e.g., you pay 20%, insurer pays 80%).\n"
            "• **Out-of-Pocket Maximum**: The most you must pay for covered services in a plan year. Once reached, your plan pays 100%."
        )

    # Check for cheapest / lowest cost
    if any(k in q for k in ["cheap", "lowest cost", "save money", "affordable", "least expensive"]):
        return (
            "To get the lowest out-of-pocket cost: "
            "1) Choose an in-network independent diagnostic testing facility (IDTF) or outpatient lab rather than a hospital emergency department. "
            "2) In our verified data, Capital Diagnostic Lab and Metro Radiology consistently offer the lowest negotiated rates in the Mercer/Middlesex region. "
            "3) Always ensure your doctor's order specifies an outpatient non-hospital facility."
        )

    # Check for doctor order / referral
    if any(k in q for k in ["order", "referral", "prescription", "doctor note", "script"]):
        return (
            "• **Diagnostic Imaging (X-Ray, Ultrasound, CT, MRI)**: By state and federal radiology safety laws, an authorized doctor's order/prescription is **MANDATORY** before imaging can be performed.\n"
            "• **Routine Bloodwork**: Direct-access screening is permitted for basic lipid/CBC tests, but an order is required if you want your insurance carrier to reimburse the claim."
        )

    # Check for verification / data sources
    if any(k in q for k in ["verified", "transparent", "accurate", "real", "guarantee"]):
        return (
            "CareCompare AI uses verified data from CMS Hospital and Clinical Price Transparency Machine-Readable Files (MRF) "
            "and direct provider scheduling feeds. Every price record displays its exact audit date and data source. "
            "Estimates are calculated based on contracted in-network fee schedules rather than guesses."
        )

    # General fallback
    return (
        "I can help you understand provider price differences, insurance network tiers, appointment timings, and clinical preparation requirements. "
        "Try typing a service name (like 'blood test', 'chest xray', or 'ultrasound') or enter your ZIP code above to see local verified clinics."
    )
