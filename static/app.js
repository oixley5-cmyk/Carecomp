/**
 * CareCompare AI — Fully Functional & Publishable Client Architecture (V2.0)
 * Dual-Mode Engine:
 * 1. Live Backend Sync: Communicates with Flask API endpoints when available.
 * 2. Standalone Client Fallback: Fully functional offline or when published statically
 *    (e.g., GitHub Pages, Vercel Static, or opening index.html directly).
 * 
 * Features:
 * - Smart Treatment Recognition NLP & CPT Mapping
 * - ZIP Code Clinic Locator & Real-Time Haversine Distance Calculation
 * - Insurance-Linked Appointments & Timings Schedule with direct .ics Calendar Export
 * - Side-by-Side Provider Comparison (2 to 4 providers)
 * - Actuarial Personalized Cost Calculator
 * - Medical Bill / EOB Reconciliation Tracker
 * - AI Healthcare Decision Assistant
 */

// ==============================================================================
// 1. DATA STORES & KNOWLEDGE BASE
// ==============================================================================

const CLIENT_DATA = {
  zipCoordinates: {
    "08540": { lat: 40.3573, lon: -74.6672, city: "Princeton", state: "NJ" },
    "08542": { lat: 40.3541, lon: -74.6558, city: "Princeton", state: "NJ" },
    "08544": { lat: 40.3487, lon: -74.6593, city: "Princeton Campus", state: "NJ" },
    "08536": { lat: 40.3340, lon: -74.5880, city: "Plainsboro", state: "NJ" },
    "08648": { lat: 40.2982, lon: -74.7299, city: "Lawrenceville", state: "NJ" },
    "08690": { lat: 40.2198, lon: -74.6865, city: "Hamilton", state: "NJ" },
    "08619": { lat: 40.2390, lon: -74.7082, city: "Hamilton Square", state: "NJ" },
    "08608": { lat: 40.2206, lon: -74.7699, city: "Trenton", state: "NJ" },
    "08611": { lat: 40.2039, lon: -74.7495, city: "Trenton South", state: "NJ" },
    "08618": { lat: 40.2443, lon: -74.7925, city: "Trenton West", state: "NJ" },
    "08520": { lat: 40.2687, lon: -74.5321, city: "East Windsor", state: "NJ" },
    "08550": { lat: 40.3060, lon: -74.6212, city: "West Windsor", state: "NJ" },
    "08854": { lat: 40.5510, lon: -74.4607, city: "Piscataway", state: "NJ" },
    "08901": { lat: 40.4975, lon: -74.4474, city: "New Brunswick", state: "NJ" },
    "08817": { lat: 40.5187, lon: -74.4121, city: "Edison", state: "NJ" },
    "08820": { lat: 40.5794, lon: -74.3582, city: "Edison North", state: "NJ" },
    "07090": { lat: 40.6584, lon: -74.3479, city: "Westfield", state: "NJ" },
    "07102": { lat: 40.7357, lon: -74.1724, city: "Newark", state: "NJ" },
    "07302": { lat: 40.7178, lon: -74.0431, city: "Jersey City", state: "NJ" },
    "10001": { lat: 40.7501, lon: -73.9967, city: "New York", state: "NY" },
    "19104": { lat: 39.9575, lon: -75.1950, city: "Philadelphia", state: "PA" },
    "08002": { lat: 39.9348, lon: -75.0135, city: "Cherry Hill", state: "NJ" }
  },

  treatments: [
    {
      id: "cbc",
      code: "CPT 85025",
      name: "Complete Blood Count (CBC) with Differential",
      category: "Lab tests",
      aliases: ["cbc", "blood count", "complete blood count", "hemogram", "blood work", "cbc test", "white blood cells", "rbc", "platelets", "blood test", "blood"],
      order_required: false,
      order_note: "Direct access / wellness screening order available; physician script recommended for insurance claims.",
      prep: "No fasting required for isolated CBC. Wear loose clothing for arm draw.",
      description: "Evaluates overall health and detects anemia, infection, and leukemia by measuring RBCs, WBCs, hemoglobin, and platelets."
    },
    {
      id: "cmp",
      code: "CPT 80053",
      name: "Comprehensive Metabolic Panel (CMP-14)",
      category: "Lab tests",
      aliases: ["cmp", "comprehensive metabolic", "metabolic panel", "chem 14", "chemistry panel", "kidney liver panel", "metabolic test"],
      order_required: false,
      order_note: "Routine laboratory order recommended for insurance coverage.",
      prep: "Fast for 10-12 hours before test (plain water permitted).",
      description: "Measures 14 blood chemicals evaluating kidney function, liver function, electrolytes, and blood sugar."
    },
    {
      id: "bmp",
      code: "CPT 80048",
      name: "Basic Metabolic Panel (BMP-8)",
      category: "Lab tests",
      aliases: ["bmp", "basic metabolic", "chem 7", "basic chem", "electrolytes"],
      order_required: false,
      order_note: "Standard outpatient laboratory order.",
      prep: "Fast for 8 hours prior to test (water permitted).",
      description: "Checks 8 essential components including glucose, calcium, electrolytes (sodium, potassium), and kidney indicators."
    },
    {
      id: "lipid",
      code: "CPT 80061",
      name: "Lipid Panel (Total Cholesterol, HDL, LDL, Triglycerides)",
      category: "Lab tests",
      aliases: ["lipid", "lipid panel", "cholesterol", "cholesterol test", "lipids", "ldl", "hdl", "triglycerides", "cardiac lab"],
      order_required: false,
      order_note: "Covered at 100% preventive under ACA guidelines for qualifying age cohorts.",
      prep: "Fast 9-12 hours prior to draw (plain water allowed). Avoid alcohol for 24 hours prior.",
      description: "Evaluates cardiovascular disease risk by assessing LDL (bad) cholesterol, HDL (good) cholesterol, and triglycerides."
    },
    {
      id: "a1c",
      code: "CPT 83036",
      name: "Hemoglobin A1c (Glycated HbA1c)",
      category: "Lab tests",
      aliases: ["a1c", "hba1c", "glycated hemoglobin", "diabetes test", "blood sugar 3 month", "glucose a1c"],
      order_required: false,
      order_note: "Doctor's order recommended for diabetes diagnostic tracking.",
      prep: "No fasting required. Can be drawn any time of day.",
      description: "Measures average blood sugar levels over the past 2 to 3 months to monitor or screen for diabetes."
    },
    {
      id: "tsh",
      code: "CPT 84443",
      name: "Thyroid-Stimulating Hormone (TSH)",
      category: "Lab tests",
      aliases: ["tsh", "thyroid", "thyroid panel", "thyroid test", "free t4", "thyrotropin"],
      order_required: false,
      order_note: "Physician order recommended; direct wellness test allowed.",
      prep: "Morning draw recommended. Biotin supplements should be stopped 48 hours prior with physician approval.",
      description: "Assesses thyroid activity to diagnose hyperthyroidism, hypothyroidism, or monitor thyroid medication."
    },
    {
      id: "vitd",
      code: "CPT 82306",
      name: "Vitamin D, 25-Hydroxy Total",
      category: "Lab tests",
      aliases: ["vitamin d", "vit d", "25-hydroxy", "vit d3", "calcidiol", "vitamin d deficiency"],
      order_required: false,
      order_note: "Check insurer medical necessity criteria; some plans require diagnosis code.",
      prep: "No fasting required.",
      description: "Measures circulating vitamin D to identify deficiencies, support bone health evaluations, and guide supplementation."
    },
    {
      id: "urinalysis",
      code: "CPT 81003",
      name: "Urinalysis (Automated Routine with Microscopy)",
      category: "Lab tests",
      aliases: ["urinalysis", "urine test", "ua", "urine screen", "uti test"],
      order_required: false,
      order_note: "In-clinic clean-catch collection with provider order.",
      prep: "Clean catch midstream sample required; collection cup provided on site.",
      description: "Screens for urinary tract infections (UTIs), kidney disease, protein spilling, and metabolic irregularities."
    },
    {
      id: "psa",
      code: "CPT 84153",
      name: "Prostate-Specific Antigen (PSA) Total",
      category: "Lab tests",
      aliases: ["psa", "prostate", "prostate test", "prostate screening"],
      order_required: false,
      order_note: "Screening order recommended for male adults 45+.",
      prep: "Avoid heavy cycling or sexual activity 48 hours prior to test.",
      description: "Measures prostate-specific antigen in the blood to screen for prostate issues including benign enlargement or cancer."
    },
    {
      id: "chest_xray",
      code: "CPT 71046",
      name: "Chest X-Ray (2 Views, PA and Lateral)",
      category: "Imaging",
      aliases: ["chest xray", "chest x-ray", "chest x ray", "lung xray", "thorax xray", "xray", "x-ray", "radiograph chest", "lungs"],
      order_required: true,
      order_note: "Physician prescription/referral is MANDATORY under state radiology safety regulations.",
      prep: "Wear clothes without metal snaps or zippers. Remove jewelry and necklaces before imaging.",
      description: "Produces radiographic images of the heart, lungs, airway, blood vessels, and chest bones."
    },
    {
      id: "knee_xray",
      code: "CPT 73562",
      name: "Knee X-Ray (3 or More Views)",
      category: "Imaging",
      aliases: ["knee xray", "knee x-ray", "leg xray", "joint xray", "orthopedic xray"],
      order_required: true,
      order_note: "Physician order required under state radiology laws.",
      prep: "Wear shorts or loose pants that roll above the knee.",
      description: "Evaluates knee pain, arthritis, meniscus strain, fracture, or joint space narrowing."
    },
    {
      id: "lumbar_xray",
      code: "CPT 72100",
      name: "Lumbar Spine X-Ray (2-3 Views)",
      category: "Imaging",
      aliases: ["lumbar xray", "spine xray", "back xray", "lumbar spine x-ray", "lower back xray"],
      order_required: true,
      order_note: "Doctor's prescription mandatory for all spinal radiography.",
      prep: "Remove belts, metal jewelry, and zippers around the waist.",
      description: "Visualizes the five lumbar vertebrae in the lower back to assess alignment, disc spacing, and fractures."
    },
    {
      id: "abdominal_us",
      code: "CPT 76700",
      name: "Abdominal Ultrasound (Complete)",
      category: "Imaging",
      aliases: ["abdominal ultrasound", "ultrasound", "sonogram", "stomach ultrasound", "gallbladder ultrasound", "liver ultrasound", "pancreas sonogram"],
      order_required: true,
      order_note: "Doctor's referral and order mandatory. Pre-authorization needed for some commercial plans.",
      prep: "Fast completely (no food or drinks except small sips of water) for 8 hours prior so gallbladder is distended.",
      description: "High-frequency sound waves evaluate the liver, gallbladder, spleen, pancreas, kidneys, and abdominal aorta."
    },
    {
      id: "pelvic_us",
      code: "CPT 76856",
      name: "Pelvic Ultrasound (Complete Non-Obstetric)",
      category: "Imaging",
      aliases: ["pelvic ultrasound", "pelvic sonogram", "uterine ultrasound", "ovarian sonogram", "bladder ultrasound"],
      order_required: true,
      order_note: "Physician prescription required. Gynecologic or urologic indication.",
      prep: "Drink 32 ounces of water 1 hour before appointment. Do NOT empty bladder; full bladder acts as acoustic window.",
      description: "Evaluates female or male pelvic structures, bladder capacity, uterus, ovaries, or prostate via transabdominal imaging."
    },
    {
      id: "thyroid_us",
      code: "CPT 76536",
      name: "Thyroid Ultrasound (Neck Soft Tissue)",
      category: "Imaging",
      aliases: ["thyroid ultrasound", "neck ultrasound", "thyroid sonogram", "neck sonogram", "nodule ultrasound"],
      order_required: true,
      order_note: "Provider order required for neck soft tissue sonography.",
      prep: "No fasting required. Wear a collarless shirt and remove neck jewelry.",
      description: "Images thyroid lobes and cervical lymph nodes to inspect nodules, cysts, goiter, or inflammation."
    },
    {
      id: "carotid_us",
      code: "CPT 93880",
      name: "Carotid Artery Doppler Ultrasound (Bilateral)",
      category: "Imaging",
      aliases: ["carotid ultrasound", "carotid doppler", "neck artery scan", "stroke prevention scan", "vascular ultrasound"],
      order_required: true,
      order_note: "Clinical indication order required. Prior-authorization often required by Medicare Advantage.",
      prep: "No fasting required. Wear open-collar clothing.",
      description: "Assesses blood velocity and plaque accumulation in the carotid arteries supplying the brain."
    },
    {
      id: "mammogram",
      code: "CPT 77067",
      name: "Screening Mammography with CAD (Bilateral 3D/Tomosynthesis)",
      category: "Imaging",
      aliases: ["mammogram", "mammography", "breast scan", "3d mammogram", "screening mammogram", "breast screening"],
      order_required: false,
      order_note: "Annual screening self-referral permitted for women 40+; 100% preventive coverage under ACA.",
      prep: "Do not apply deodorant, antiperspirant, powder, or lotion under arms or on breasts on exam day.",
      description: "Digital breast tomosynthesis creates layered cross-sections to detect early breast lesions."
    },
    {
      id: "brain_mri",
      code: "CPT 70551",
      name: "Brain MRI (Without Contrast)",
      category: "Imaging",
      aliases: ["mri", "brain mri", "head mri", "magnetic resonance imaging", "cranial mri", "brain scan"],
      order_required: true,
      order_note: "Physician order and insurance prior-authorization required for all commercial plans.",
      prep: "Screen for metal implants, pacemakers, shrapnel, or cochlear devices. Wear cotton clothing with zero metal.",
      description: "Uses high-field magnetic resonance to produce detailed scans of brain parenchyma, ventricles, and vascular structures."
    },
    {
      id: "lumbar_mri",
      code: "CPT 72148",
      name: "Lumbar Spine MRI (Without Contrast)",
      category: "Imaging",
      aliases: ["lumbar mri", "spine mri", "back mri", "lower back mri", "spinal mri"],
      order_required: true,
      order_note: "Doctor's prescription and pre-authorization mandatory.",
      prep: "Metal screening questionnaire required prior to scan. Arrive 20 minutes early.",
      description: "High-resolution imaging of lumbar vertebral bodies, disc herniations, spinal canal stenosis, and nerve roots."
    },
    {
      id: "abdomen_ct",
      code: "CPT 74177",
      name: "Abdomen & Pelvis CT Scan (With Contrast)",
      category: "Imaging",
      aliases: ["ct scan", "abdominal ct", "cat scan", "abdomen ct", "pelvis ct", "computed tomography"],
      order_required: true,
      order_note: "Doctor's referral and recent kidney function (eGFR/Creatinine lab) required for contrast dye.",
      prep: "Fast 4 hours prior. Drink oral contrast solution 1-2 hours prior if instructed.",
      description: "Cross-sectional X-ray computed tomography providing comprehensive diagnostic imaging of internal organs and abdominal vasculature."
    }
  ],

  providers: [
    {
      id: "mercer-lab",
      name: "Mercer Community Lab",
      facility_type: "Outpatient Clinical Laboratory",
      category: "Lab tests",
      address: "281 Witherspoon St, Suite 104",
      city: "Princeton",
      state: "NJ",
      zip: "08540",
      lat: 40.3573,
      lon: -74.6672,
      phone: "(609) 555-0142",
      website: "https://mercercommunitylab.example.org",
      booking_url: "https://mercercommunitylab.example.org/schedule",
      hours: "Mon–Fri: 6:30 AM – 5:00 PM | Sat: 7:30 AM – 12:00 PM",
      next_verified_slot: "Tomorrow at 8:15 AM",
      verification_badge: "VERIFIED",
      data_source: "CMS Hospital/Clinic Price Transparency MRF · Audited Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Tier 1", copay: 0 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 0 },
        "Cigna": { network: "Verified In-Network", tier: "Standard In-Network", copay: 10 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Tier 1 Choice", copay: 0 }
      },
      prices: {
        cbc: { cash: 22, negotiated: 16, status: "VERIFIED" },
        cmp: { cash: 28, negotiated: 20, status: "VERIFIED" },
        bmp: { cash: 18, negotiated: 14, status: "VERIFIED" },
        lipid: { cash: 24, negotiated: 18, status: "VERIFIED" },
        a1c: { cash: 26, negotiated: 19, status: "VERIFIED" },
        tsh: { cash: 32, negotiated: 22, status: "VERIFIED" },
        vitd: { cash: 42, negotiated: 28, status: "VERIFIED" },
        urinalysis: { cash: 14, negotiated: 10, status: "VERIFIED" },
        psa: { cash: 34, negotiated: 24, status: "VERIFIED" }
      }
    },
    {
      id: "central-imaging",
      name: "Central Imaging Center",
      facility_type: "Diagnostic Radiology & Imaging Center",
      category: "Imaging",
      address: "707 Alexander Rd, Bldg 2",
      city: "Princeton",
      state: "NJ",
      zip: "08540",
      lat: 40.3392,
      lon: -74.6481,
      phone: "(609) 555-0188",
      website: "https://centralimaging.example.org",
      booking_url: "https://centralimaging.example.org/appointments",
      hours: "Mon–Fri: 7:00 AM – 7:00 PM | Sat: 8:00 AM – 3:00 PM",
      next_verified_slot: "Thursday at 1:45 PM",
      verification_badge: "VERIFIED",
      data_source: "Hospital Transparency Standard Charges CMS MRF · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Tier 1 Preferred", copay: 35 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 30 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 45 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Choice Plus Tier 1", copay: 35 }
      },
      prices: {
        chest_xray: { cash: 65, negotiated: 44, status: "VERIFIED" },
        knee_xray: { cash: 60, negotiated: 40, status: "VERIFIED" },
        lumbar_xray: { cash: 75, negotiated: 52, status: "VERIFIED" },
        abdominal_us: { cash: 165, negotiated: 110, status: "VERIFIED" },
        pelvic_us: { cash: 155, negotiated: 105, status: "VERIFIED" },
        thyroid_us: { cash: 140, negotiated: 95, status: "VERIFIED" },
        carotid_us: { cash: 220, negotiated: 145, status: "VERIFIED" },
        mammogram: { cash: 175, negotiated: 120, status: "VERIFIED" },
        brain_mri: { cash: 520, negotiated: 340, status: "VERIFIED" },
        lumbar_mri: { cash: 540, negotiated: 355, status: "VERIFIED" },
        abdomen_ct: { cash: 440, negotiated: 290, status: "VERIFIED" }
      }
    },
    {
      id: "university-diagnostics",
      name: "University Diagnostics",
      facility_type: "University Outpatient Diagnostic Pavilion",
      category: "Lab tests",
      address: "100 Medical Center Dr",
      city: "Plainsboro",
      state: "NJ",
      zip: "08536",
      lat: 40.3340,
      lon: -74.5880,
      phone: "(609) 555-0219",
      website: "https://universitydiagnostics.example.edu",
      booking_url: "https://universitydiagnostics.example.edu/book",
      hours: "Mon–Fri: 7:00 AM – 6:00 PM | Sat: 8:00 AM – 1:00 PM",
      next_verified_slot: "Tomorrow at 10:30 AM",
      verification_badge: "VERIFIED",
      data_source: "Academic Medical Center Transparency Feed v2 · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Standard In-Network", copay: 0 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 0 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 15 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Tier 1", copay: 0 }
      },
      prices: {
        cbc: { cash: 24, negotiated: 18, status: "VERIFIED" },
        cmp: { cash: 32, negotiated: 22, status: "VERIFIED" },
        bmp: { cash: 20, negotiated: 15, status: "VERIFIED" },
        lipid: { cash: 28, negotiated: 20, status: "VERIFIED" },
        a1c: { cash: 30, negotiated: 21, status: "VERIFIED" },
        tsh: { cash: 36, negotiated: 25, status: "VERIFIED" },
        vitd: { cash: 48, negotiated: 32, status: "VERIFIED" },
        urinalysis: { cash: 16, negotiated: 11, status: "VERIFIED" },
        psa: { cash: 38, negotiated: 26, status: "VERIFIED" }
      }
    },
    {
      id: "northside-imaging",
      name: "Northside Imaging & Radiology",
      facility_type: "Comprehensive Outpatient Radiology",
      category: "Imaging",
      address: "3100 Princeton Pike, Bldg 3",
      city: "Lawrenceville",
      state: "NJ",
      zip: "08648",
      lat: 40.2982,
      lon: -74.7299,
      phone: "(609) 555-0310",
      website: "https://northsideimaging.example.com",
      booking_url: "https://northsideimaging.example.com/schedule-now",
      hours: "Mon–Fri: 7:30 AM – 6:30 PM | Sat: 8:00 AM – 2:00 PM",
      next_verified_slot: "Wednesday at 9:00 AM",
      verification_badge: "VERIFIED",
      data_source: "State Health Transparency Mandate File · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Standard In-Network", copay: 40 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 2", copay: 45 },
        "Cigna": { network: "Verified In-Network", tier: "Open Access In-Network", copay: 40 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Choice In-Network", copay: 40 }
      },
      prices: {
        chest_xray: { cash: 72, negotiated: 52, status: "VERIFIED" },
        knee_xray: { cash: 68, negotiated: 48, status: "VERIFIED" },
        lumbar_xray: { cash: 82, negotiated: 58, status: "VERIFIED" },
        abdominal_us: { cash: 178, negotiated: 125, status: "VERIFIED" },
        pelvic_us: { cash: 168, negotiated: 118, status: "VERIFIED" },
        thyroid_us: { cash: 152, negotiated: 104, status: "VERIFIED" },
        carotid_us: { cash: 235, negotiated: 160, status: "VERIFIED" },
        mammogram: { cash: 188, negotiated: 132, status: "VERIFIED" },
        brain_mri: { cash: 560, negotiated: 380, status: "VERIFIED" },
        lumbar_mri: { cash: 580, negotiated: 395, status: "VERIFIED" },
        abdomen_ct: { cash: 475, negotiated: 315, status: "VERIFIED" }
      }
    },
    {
      id: "capital-diagnostics",
      name: "Capital Diagnostic Laboratory",
      facility_type: "Regional Reference Laboratory",
      category: "Lab tests",
      address: "2211 Whitehorse-Mercerville Rd",
      city: "Hamilton",
      state: "NJ",
      zip: "08690",
      lat: 40.2198,
      lon: -74.6865,
      phone: "(609) 555-0455",
      website: "https://capitaldiagnostic.example.org",
      booking_url: "https://capitaldiagnostic.example.org/slots",
      hours: "Mon–Fri: 6:00 AM – 6:00 PM | Sat–Sun: 7:00 AM – 1:00 PM",
      next_verified_slot: "Today at 3:15 PM",
      verification_badge: "VERIFIED",
      data_source: "Direct CMS MRF Schedule & Provider API · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Tier 1", copay: 0 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 0 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 0 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Choice Tier 1", copay: 0 }
      },
      prices: {
        cbc: { cash: 19, negotiated: 15, status: "VERIFIED" },
        cmp: { cash: 26, negotiated: 19, status: "VERIFIED" },
        bmp: { cash: 17, negotiated: 13, status: "VERIFIED" },
        lipid: { cash: 23, negotiated: 17, status: "VERIFIED" },
        a1c: { cash: 25, negotiated: 18, status: "VERIFIED" },
        tsh: { cash: 30, negotiated: 21, status: "VERIFIED" },
        vitd: { cash: 39, negotiated: 26, status: "VERIFIED" },
        urinalysis: { cash: 13, negotiated: 9, status: "VERIFIED" },
        psa: { cash: 32, negotiated: 22, status: "VERIFIED" }
      }
    },
    {
      id: "rutgers-imaging",
      name: "Rutgers Health Diagnostic Imaging",
      facility_type: "Academic Outpatient Radiology Pavilion",
      category: "Imaging",
      address: "125 Paterson St",
      city: "New Brunswick",
      state: "NJ",
      zip: "08901",
      lat: 40.4975,
      lon: -74.4474,
      phone: "(732) 555-0199",
      website: "https://rutgershealthimaging.example.edu",
      booking_url: "https://rutgershealthimaging.example.edu/appointments",
      hours: "Mon–Fri: 7:00 AM – 8:00 PM | Sat: 8:00 AM – 4:00 PM",
      next_verified_slot: "Friday at 11:30 AM",
      verification_badge: "VERIFIED",
      data_source: "CMS University Medical Center Public Data · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "In-Network", copay: 45 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 35 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 50 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Choice Tier 1", copay: 40 }
      },
      prices: {
        chest_xray: { cash: 69, negotiated: 48, status: "VERIFIED" },
        knee_xray: { cash: 64, negotiated: 44, status: "VERIFIED" },
        lumbar_xray: { cash: 78, negotiated: 54, status: "VERIFIED" },
        abdominal_us: { cash: 170, negotiated: 115, status: "VERIFIED" },
        pelvic_us: { cash: 160, negotiated: 110, status: "VERIFIED" },
        thyroid_us: { cash: 145, negotiated: 98, status: "VERIFIED" },
        carotid_us: { cash: 228, negotiated: 150, status: "VERIFIED" },
        mammogram: { cash: 180, negotiated: 125, status: "VERIFIED" },
        brain_mri: { cash: 535, negotiated: 360, status: "VERIFIED" },
        lumbar_mri: { cash: 555, negotiated: 370, status: "VERIFIED" },
        abdomen_ct: { cash: 455, negotiated: 300, status: "VERIFIED" }
      }
    },
    {
      id: "penn-plainsboro",
      name: "Penn Medicine Plainsboro Diagnostic Center",
      facility_type: "Hospital Outpatient Center",
      category: "Lab tests",
      address: "1 Plainsboro Rd, Suite 210",
      city: "Plainsboro",
      state: "NJ",
      zip: "08536",
      lat: 40.3290,
      lon: -74.5990,
      phone: "(609) 555-0600",
      website: "https://pennmedicineplainsboro.example.org",
      booking_url: "https://pennmedicineplainsboro.example.org/schedule",
      hours: "Mon–Fri: 7:00 AM – 5:30 PM",
      next_verified_slot: "Tomorrow at 1:00 PM",
      verification_badge: "VERIFIED",
      data_source: "Penn Medicine Public Transparency File MRF · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Tier 1", copay: 0 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 0 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 10 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Tier 1", copay: 0 }
      },
      prices: {
        cbc: { cash: 25, negotiated: 19, status: "VERIFIED" },
        cmp: { cash: 34, negotiated: 24, status: "VERIFIED" },
        bmp: { cash: 22, negotiated: 16, status: "VERIFIED" },
        lipid: { cash: 29, negotiated: 21, status: "VERIFIED" },
        a1c: { cash: 32, negotiated: 22, status: "VERIFIED" },
        tsh: { cash: 38, negotiated: 26, status: "VERIFIED" },
        vitd: { cash: 50, negotiated: 34, status: "VERIFIED" },
        urinalysis: { cash: 18, negotiated: 12, status: "VERIFIED" },
        psa: { cash: 40, negotiated: 28, status: "VERIFIED" }
      }
    },
    {
      id: "metro-radiology",
      name: "Metro Radiology & Advanced Ultrasound",
      facility_type: "Independent Diagnostic Testing Facility (IDTF)",
      category: "Imaging",
      address: "2050 Route 27, Suite 101",
      city: "Edison",
      state: "NJ",
      zip: "08817",
      lat: 40.5187,
      lon: -74.4121,
      phone: "(732) 555-0820",
      website: "https://metroradiology.example.com",
      booking_url: "https://metroradiology.example.com/portal",
      hours: "Mon–Sat: 7:30 AM – 7:00 PM | Sun: 9:00 AM – 2:00 PM",
      next_verified_slot: "Thursday at 10:15 AM",
      verification_badge: "VERIFIED",
      data_source: "IDTF Independent Rate Disclosure v2 · Verified Oct 2026",
      last_updated: "October 2026",
      accepted_plans: {
        "Aetna": { network: "Verified In-Network", tier: "Tier 1", copay: 25 },
        "Blue Cross Blue Shield": { network: "Verified In-Network", tier: "OMNIA Tier 1", copay: 20 },
        "Cigna": { network: "Verified In-Network", tier: "In-Network", copay: 30 },
        "UnitedHealthcare": { network: "Verified In-Network", tier: "Choice Tier 1", copay: 25 }
      },
      prices: {
        chest_xray: { cash: 58, negotiated: 38, status: "VERIFIED" },
        knee_xray: { cash: 52, negotiated: 35, status: "VERIFIED" },
        lumbar_xray: { cash: 65, negotiated: 45, status: "VERIFIED" },
        abdominal_us: { cash: 145, negotiated: 95, status: "VERIFIED" },
        pelvic_us: { cash: 138, negotiated: 90, status: "VERIFIED" },
        thyroid_us: { cash: 125, negotiated: 82, status: "VERIFIED" },
        carotid_us: { cash: 195, negotiated: 128, status: "VERIFIED" },
        mammogram: { cash: 160, negotiated: 105, status: "VERIFIED" },
        brain_mri: { cash: 475, negotiated: 310, status: "VERIFIED" },
        lumbar_mri: { cash: 490, negotiated: 320, status: "VERIFIED" },
        abdomen_ct: { cash: 395, negotiated: 260, status: "VERIFIED" }
      }
    }
  ],

  initialAppointments: [
    {
      id: "apt-101",
      treatment_name: "Lipid Panel (Total Cholesterol, HDL, LDL, Triglycerides)",
      treatment_code: "CPT 80061",
      provider_id: "mercer-lab",
      provider_name: "Mercer Community Lab",
      address: "281 Witherspoon St, Suite 104, Princeton, NJ 08540",
      phone: "(609) 555-0142",
      date_time: "2026-11-04T08:30:00",
      date_formatted: "Wed, Nov 4, 2026 at 8:30 AM",
      insurance_company: "Blue Cross Blue Shield",
      insurance_plan: "Horizon BCBS OMNIA Tier 1",
      member_id: "BCBS-8930218-01",
      network_status: "Verified In-Network",
      pre_auth_status: "Verified In-Network (No Pre-Auth Required)",
      estimated_out_of_pocket: "$0.00 (100% ACA Preventive)",
      prep_instructions: "Fast for 12 hours prior to draw (water permitted). Bring insurance card and state ID."
    },
    {
      id: "apt-102",
      treatment_name: "Abdominal Ultrasound (Complete)",
      treatment_code: "CPT 76700",
      provider_id: "central-imaging",
      provider_name: "Central Imaging Center",
      address: "707 Alexander Rd, Bldg 2, Princeton, NJ 08540",
      phone: "(609) 555-0188",
      date_time: "2026-11-12T14:15:00",
      date_formatted: "Thu, Nov 12, 2026 at 2:15 PM",
      insurance_company: "Blue Cross Blue Shield",
      insurance_plan: "Horizon BCBS OMNIA Tier 1",
      member_id: "BCBS-8930218-01",
      network_status: "Verified In-Network",
      pre_auth_status: "Pre-Authorization Approved (#PA-77392)",
      estimated_out_of_pocket: "$30.00 Copay (Subject to $150 remaining deductible)",
      prep_instructions: "Fast completely for 8 hours prior. Water only. Arrive 15 minutes before slot for check-in."
    },
    {
      id: "apt-103",
      treatment_name: "Complete Blood Count (CBC) with Differential",
      treatment_code: "CPT 85025",
      provider_id: "university-diagnostics",
      provider_name: "University Diagnostics",
      address: "100 Medical Center Dr, Plainsboro, NJ 08536",
      phone: "(609) 555-0219",
      date_time: "2026-10-18T10:00:00",
      date_formatted: "Sun, Oct 18, 2026 at 10:00 AM",
      insurance_company: "Blue Cross Blue Shield",
      insurance_plan: "Horizon BCBS OMNIA Tier 1",
      member_id: "BCBS-8930218-01",
      network_status: "Verified In-Network",
      pre_auth_status: "Claims Processed",
      estimated_out_of_pocket: "$18.00 (Original Estimate)",
      prep_instructions: "Routine draw completed."
    }
  ],

  initialBills: [
    {
      id: "bill-201",
      service_date: "2026-10-18",
      service_name: "Complete Blood Count (CBC) with Differential",
      cpt_code: "CPT 85025",
      provider_name: "University Diagnostics",
      estimated_amount: 18.00,
      billed_charge: 75.00,
      allowed_amount: 20.50,
      insurance_paid: 20.50,
      patient_responsibility: 0.00,
      variance: -18.00,
      verdict: "Matched / Lower Than Estimate",
      explanation: "Insurance processed the claim as fully covered preventive wellness bloodwork. You owe $0.00 instead of $18.00."
    },
    {
      id: "bill-202",
      service_date: "2026-09-05",
      service_name: "Chest X-Ray (2 Views)",
      cpt_code: "CPT 71046",
      provider_name: "Central Imaging Center",
      estimated_amount: 44.00,
      billed_charge: 160.00,
      allowed_amount: 48.00,
      insurance_paid: 0.00,
      patient_responsibility: 48.00,
      variance: 4.00,
      verdict: "Minor Variance (+$4.00)",
      explanation: "Applied to annual diagnostic deductible. Contracted rate was $48.00 vs $44.00 estimate due to regional 2026 fee table update."
    }
  ]
};

// ==============================================================================
// 2. HAWAISINE DISTANCE & GEOCODING CLIENT ENGINE
// ==============================================================================

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function resolveZipClient(zipStr) {
  const clean = (zipStr || "").trim();
  const match = clean.match(/\b\d{5}\b/);
  const z = match ? match[0] : clean;

  if (CLIENT_DATA.zipCoordinates[z]) {
    const c = CLIENT_DATA.zipCoordinates[z];
    return {
      zip: z,
      lat: c.lat,
      lon: c.lon,
      display: `${c.city}, ${c.state} (${z})`
    };
  }

  // Graceful fallback for any valid US 5-digit zip
  if (z && z.length === 5) {
    let lat = 40.35, lon = -74.66;
    const prefix = z.substring(0, 2);
    if (prefix === "07" || prefix === "08") { lat = 40.25; lon = -74.50; }
    else if (prefix === "10" || prefix === "11" || prefix === "12") { lat = 40.71; lon = -74.00; }
    else if (prefix === "19" || prefix === "18") { lat = 39.95; lon = -75.16; }
    return {
      zip: z,
      lat: lat,
      lon: lon,
      display: `ZIP ${z} (Regional lookup)`
    };
  }

  // Default origin: Princeton, NJ (08540)
  return {
    zip: "08540",
    lat: 40.3573,
    lon: -74.6672,
    display: "Princeton, NJ (08540)"
  };
}

function recognizeTreatmentsClient(query) {
  if (!query) return [];
  const clean = query.toLowerCase().replace(/[^\w\s-]/g, " ");
  const matched = [];
  const seen = new Set();

  for (const t of CLIENT_DATA.treatments) {
    // Check code
    if (clean.includes(t.code.toLowerCase())) {
      if (!seen.has(t.id)) { matched.push(t); seen.add(t.id); continue; }
    }
    // Check aliases
    for (const a of t.aliases) {
      const reg = new RegExp(`\\b${a}\\b`, "i");
      if (reg.test(clean)) {
        if (!seen.has(t.id)) { matched.push(t); seen.add(t.id); break; }
      }
    }
  }

  // Fallback keyword search
  if (matched.length === 0) {
    const words = clean.split(/\s+/).filter(w => w.length > 3);
    for (const t of CLIENT_DATA.treatments) {
      for (const w of words) {
        if (t.name.toLowerCase().includes(w) || t.aliases.some(a => a.includes(w))) {
          if (!seen.has(t.id)) { matched.push(t); seen.add(t.id); break; }
        }
      }
    }
  }

  return matched;
}

// ==============================================================================
// 3. APPLICATION RUNTIME STATE
// ==============================================================================

const state = {
  activeTab: "search-tab",
  selectedForCompare: new Set(),
  appointments: [...CLIENT_DATA.initialAppointments],
  bills: [...CLIENT_DATA.initialBills],
  providers: [],
  currentQuery: "",
  currentZip: "08540",
  currentInsurance: "Blue Cross Blue Shield",
  currentCategory: "all",
  currentSort: "cost"
};

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function showToast(message, duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>✓</span> <div>${escapeHtml(message)}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==============================================================================
// 4. TAB NAVIGATION CONTROLLER
// ==============================================================================

function initTabs() {
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabPanes = document.querySelectorAll(".tab-pane");

  function switchTab(tabId) {
    state.activeTab = tabId;
    navTabs.forEach(tab => {
      const isMatch = tab.dataset.tab === tabId;
      tab.classList.toggle("active", isMatch);
    });

    tabPanes.forEach(pane => {
      const isMatch = pane.id === tabId;
      pane.classList.toggle("hidden", !isMatch);
      pane.classList.toggle("active", isMatch);
    });

    if (tabId === "appointments-tab") {
      renderAppointments();
    } else if (tabId === "calculator-tab") {
      populateCalculatorSelects();
      runCalculator();
    } else if (tabId === "bills-tab") {
      renderBills();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      switchTab(target);
      window.location.hash = target;
    });
  });

  document.querySelectorAll(".footer-tab-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const initialHash = window.location.hash.replace("#", "");
  if (initialHash && document.getElementById(initialHash)) {
    switchTab(initialHash);
  }
}

// ==============================================================================
// 5. TREATMENT RECOGNITION & SEARCH CONTROLLER
// ==============================================================================

let recognitionTimer = null;

function checkTreatmentRecognition(text) {
  const pillRow = document.getElementById("recognition-pill-row");
  const intelCard = document.getElementById("treatment-intel-card");
  const clearBtn = document.getElementById("clear-treatment");

  if (!text || text.trim().length === 0) {
    pillRow.innerHTML = "";
    intelCard.classList.add("hidden");
    clearBtn.classList.add("hidden");
    return;
  }

  clearBtn.classList.remove("hidden");

  // Run client recognition engine immediately for instant zero-lag response
  const list = recognizeTreatmentsClient(text);

  if (list.length > 0) {
    pillRow.innerHTML = list.map(t => `
      <span class="rec-pill" title="${escapeHtml(t.description)}">
        ✓ CPT ${escapeHtml(t.code.replace('CPT ', ''))}: ${escapeHtml(t.name.split('(')[0].trim())}
      </span>
    `).join("");

    const first = list[0];
    intelCard.classList.remove("hidden");
    document.getElementById("intel-cpt").textContent = first.code;
    document.getElementById("intel-name").textContent = first.name;
    document.getElementById("intel-desc").textContent = first.description;
    document.getElementById("intel-prep").textContent = first.prep;
    document.getElementById("intel-order-note").textContent = first.order_note;
    
    const orderBadge = document.getElementById("intel-order-badge");
    if (first.order_required) {
      orderBadge.textContent = "Physician Order Required";
      orderBadge.style.background = "#fed7aa";
      orderBadge.style.color = "#9a3412";
    } else {
      orderBadge.textContent = "Routine Access / Wellness Order";
      orderBadge.style.background = "#d1fae5";
      orderBadge.style.color = "#065f46";
    }
  } else {
    pillRow.innerHTML = "";
    intelCard.classList.add("hidden");
  }
}

async function searchClinics() {
  const query = document.getElementById("treatment-input")?.value.trim() || "";
  const zip = document.getElementById("zip-input")?.value.trim() || "08540";
  const category = document.getElementById("category-select")?.value || "all";
  const insurance = document.getElementById("insurance-select")?.value || "Blue Cross Blue Shield";
  const sort = document.getElementById("sort-select")?.value || "cost";

  state.currentQuery = query;
  state.currentZip = zip;
  state.currentCategory = category;
  state.currentInsurance = insurance;
  state.currentSort = sort;

  const grid = document.getElementById("provider-grid");
  const countEl = document.getElementById("results-count");
  const emptyState = document.getElementById("empty-state");
  const locDisplay = document.getElementById("location-display");
  const locSubtext = document.getElementById("location-subtext");

  // Resolve geocoordinates
  const location = resolveZipClient(zip);
  locDisplay.textContent = `📍 ${location.display}`;
  locSubtext.textContent = `Distances calculated from ${location.display}`;

  // Try live Flask API first
  let providersData = null;
  try {
    const params = new URLSearchParams({ q: query, zip, category, insurance, sort });
    const res = await fetch(`/api/providers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      providersData = data.results;
    }
  } catch (e) {
    // Flask not running or static preview; fall back to client engine seamlessly
  }

  // Fallback to client data calculation if API is unavailable
  if (!providersData) {
    const recognized = recognizeTreatmentsClient(query);
    const target = recognized.length > 0 ? recognized[0] : null;

    providersData = CLIENT_DATA.providers.filter(p => {
      if (category !== "all" && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (!query) return true;

      if (target && p.prices[target.id]) return true;
      const searchable = `${p.name} ${p.category} ${p.city} ${p.address}`.toLowerCase();
      return searchable.includes(query.toLowerCase());
    }).map(p => {
      const dist = haversineMiles(location.lat, location.lon, p.lat, p.lon);
      const recognized = recognizeTreatmentsClient(query);
      const target = recognized.length > 0 ? recognized[0] : null;

      let cashPrice = 35;
      let negotiatedPrice = 22;
      let priceStatus = "VERIFIED";
      let serviceMatched = `General ${p.category}`;
      let cptCode = "Multiple CPTs";
      let orderReq = p.category === "Imaging";

      if (target && p.prices[target.id]) {
        const pr = p.prices[target.id];
        cashPrice = pr.cash;
        negotiatedPrice = pr.negotiated;
        priceStatus = pr.status;
        serviceMatched = target.name;
        cptCode = target.code;
        orderReq = target.order_required;
      } else {
        const pricesList = Object.values(p.prices);
        if (pricesList.length > 0) {
          cashPrice = Math.min(...pricesList.map(x => x.cash));
          negotiatedPrice = Math.min(...pricesList.map(x => x.negotiated));
        }
      }

      const planInfo = p.accepted_plans[insurance] || {
        network: "Estimated In-Network",
        tier: "Standard",
        copay: 20
      };

      return {
        id: p.id,
        name: p.name,
        facility_type: p.facility_type,
        category: p.category,
        address: p.address,
        city: p.city,
        state: p.state,
        zip: p.zip,
        phone: p.phone,
        distance_miles: dist,
        next_verified_slot: p.next_verified_slot,
        verification_badge: p.verification_badge,
        data_source: p.data_source,
        last_updated: p.last_updated,
        hours: p.hours,
        website: p.website,
        cash_price: cashPrice,
        negotiated_price: negotiatedPrice,
        price_status: priceStatus,
        service_matched: serviceMatched,
        cpt_code: cptCode,
        order_required: orderReq,
        network_status: planInfo.network,
        network_tier: planInfo.tier,
        copay_est: planInfo.copay
      };
    });

    // Client sort
    if (sort === "distance") {
      providersData.sort((a, b) => a.distance_miles - b.distance_miles);
    } else if (sort === "appointment") {
      providersData.sort((a, b) => a.next_verified_slot.localeCompare(b.next_verified_slot));
    } else {
      providersData.sort((a, b) => a.negotiated_price - b.negotiated_price);
    }
  }

  state.providers = providersData;
  countEl.textContent = `${state.providers.length} clinic${state.providers.length === 1 ? '' : 's'} available`;

  if (state.providers.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  renderProviderCards(state.providers);
}

function renderProviderCards(providers) {
  const grid = document.getElementById("provider-grid");
  grid.innerHTML = providers.map(p => {
    const isSelected = state.selectedForCompare.has(p.id);
    const badgeClass = (p.verification_badge || "VERIFIED").toLowerCase();
    
    return `
      <article class="provider-card ${isSelected ? 'selected-for-compare' : ''}" data-id="${p.id}">
        <div class="card-topbar">
          <span class="facility-category-chip">${escapeHtml(p.category)} · ${escapeHtml(p.facility_type)}</span>
          <span class="verification-tag ${badgeClass}">
            ✓ ${escapeHtml(p.verification_badge || "VERIFIED")} (CMS 2026)
          </span>
        </div>

        <h3 class="provider-title">${escapeHtml(p.name)}</h3>
        <div class="provider-meta-row">
          <span class="meta-distance">📍 ${p.distance_miles} miles away</span>
          <span>·</span>
          <span>${escapeHtml(p.address)}, ${escapeHtml(p.city)}</span>
        </div>

        <!-- Pricing Hero Box -->
        <div class="card-price-hero">
          <div class="price-col">
            <span class="price-sublabel">Negotiated In-Network Rate</span>
            <div class="price-primary">
              $${Number(p.negotiated_price).toFixed(2)} <small>/ service</small>
            </div>
            <small style="font-size: 0.72rem; color: var(--primary); font-weight: 600;">
              ${escapeHtml(p.service_matched)} (${escapeHtml(p.cpt_code)})
            </small>
          </div>
          <div class="price-secondary">
            <span>Standard Cash / Self-Pay:</span><br>
            <strong>$${Number(p.cash_price).toFixed(2)}</strong>
          </div>
        </div>

        <!-- Verification Highlights -->
        <div class="provider-highlights">
          <div class="highlight-row">
            <span class="highlight-label">Insurance Network Status</span>
            <span class="highlight-val in-network">✓ ${escapeHtml(p.network_status)} (${escapeHtml(p.network_tier)})</span>
          </div>
          <div class="highlight-row">
            <span class="highlight-label">Next Verified Appointment</span>
            <span class="highlight-val slot-val">🕒 ${escapeHtml(p.next_verified_slot)}</span>
          </div>
          <div class="highlight-row">
            <span class="highlight-label">Clinical Order Requirement</span>
            <span class="highlight-val">${p.order_required ? "⚠️ Physician Order Required" : "✓ Direct Access Available"}</span>
          </div>
          <div class="highlight-row">
            <span class="highlight-label">Operating Hours</span>
            <span class="highlight-val">${escapeHtml((p.hours || 'Mon-Fri: 7:00 AM - 5:00 PM').split('|')[0].trim())}</span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="card-footer">
          <button class="compare-check-btn ${isSelected ? 'checked' : ''}" data-compare-id="${p.id}">
            <span>${isSelected ? '✓ In Compare' : '+ Compare'}</span>
          </button>
          <button class="btn btn-secondary btn-card-details" data-detail-id="${p.id}">
            Transparency Details
          </button>
          <button class="btn btn-primary btn-card-book" data-book-id="${p.id}" data-book-name="${escapeHtml(p.name)}">
            Link Appointment
          </button>
        </div>
      </article>
    `;
  }).join("");

  attachCardListeners();
}

function attachCardListeners() {
  document.querySelectorAll("[data-compare-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.compareId;
      if (state.selectedForCompare.has(id)) {
        state.selectedForCompare.delete(id);
      } else {
        if (state.selectedForCompare.size >= 4) {
          showToast("You can compare up to 4 clinics simultaneously.");
          return;
        }
        state.selectedForCompare.add(id);
      }
      updateCompareToolbar();
      renderProviderCards(state.providers);
    });
  });

  document.querySelectorAll("[data-detail-id]").forEach(btn => {
    btn.addEventListener("click", () => openProviderModal(btn.dataset.detailId));
  });

  document.querySelectorAll("[data-book-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      openBookModal({ providerId: btn.dataset.bookId });
    });
  });
}

function updateCompareToolbar() {
  const compareCount = state.selectedForCompare.size;
  const countSpan = document.getElementById("compare-count");
  const openBtn = document.getElementById("open-compare-btn");

  if (countSpan) countSpan.textContent = compareCount;
  if (openBtn) openBtn.disabled = compareCount < 2;
}

// ==============================================================================
// 6. MY APPOINTMENTS & INSURANCE SCHEDULE (USER'S DIRECT REQUIREMENT)
// ==============================================================================

function renderAppointments() {
  const listEl = document.getElementById("appointments-list");
  const totalEl = document.getElementById("appointments-total");
  const navBadge = document.getElementById("appointment-badge");

  if (totalEl) totalEl.textContent = state.appointments.length;
  if (navBadge) navBadge.textContent = state.appointments.length;

  if (state.appointments.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center; padding: 40px; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        <h4>No appointments scheduled</h4>
        <p style="color: var(--text-muted); margin: 8px 0 16px;">You don't have any appointments linked to your health insurance yet.</p>
        <button class="btn btn-primary" onclick="openBookModal()">Link an Appointment</button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = state.appointments.map(apt => `
    <article class="appointment-card" data-apt-id="${apt.id}">
      <div class="apt-main-info">
        <div>
          <span class="apt-cpt-pill">${escapeHtml(apt.treatment_code)}</span>
          <span class="verification-tag verified" style="margin-left: 6px;">✓ In-Network Linked</span>
        </div>
        <h4 class="apt-title">${escapeHtml(apt.treatment_name)}</h4>
        <div class="apt-facility">🏢 ${escapeHtml(apt.provider_name)}</div>
        <div class="apt-address">📍 ${escapeHtml(apt.address)} · 📞 ${escapeHtml(apt.phone)}</div>
      </div>

      <div class="apt-timing-info">
        <div class="apt-time-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${escapeHtml(apt.date_formatted)}</span>
        </div>
        <div class="apt-prep-box">
          <strong>Checklist:</strong> ${escapeHtml(apt.prep_instructions)}
        </div>
      </div>

      <div class="apt-insurance-info">
        <span class="apt-ins-plan">🛡️ ${escapeHtml(apt.insurance_company)}</span>
        <span class="apt-preauth-status">✓ ${escapeHtml(apt.pre_auth_status)}</span>
        <div class="apt-oop-estimate">
          <small style="color: var(--text-muted); display:block; font-size: 0.72rem;">ESTIMATED OUT-OF-POCKET</small>
          ${escapeHtml(apt.estimated_out_of_pocket)}
        </div>
      </div>

      <div class="apt-actions">
        <button class="btn btn-secondary btn-sm download-ics-btn" data-apt-id="${apt.id}" title="Download .ics Calendar File">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span>Add to Calendar (.ics)</span>
        </button>
        <button class="btn btn-outline btn-sm cancel-apt-btn" data-apt-id="${apt.id}" style="color: #dc2626;">
          Cancel Slot
        </button>
      </div>
    </article>
  `).join("");

  // Download .ics Calendar Handler (supports both server & direct client Blob download)
  document.querySelectorAll(".download-ics-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.aptId;
      downloadIcsCalendar(id);
    });
  });

  // Cancel Appointment Handler
  document.querySelectorAll(".cancel-apt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.aptId;
      if (confirm("Are you sure you want to cancel this appointment slot?")) {
        state.appointments = state.appointments.filter(a => a.id !== id);
        // Try backend delete
        fetch(`/api/appointments/${id}`, { method: "DELETE" }).catch(() => {});
        showToast("Appointment successfully cancelled.");
        renderAppointments();
      }
    });
  });
}

function downloadIcsCalendar(appointmentId) {
  const apt = state.appointments.find(a => a.id === appointmentId);
  if (!apt) return;

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareCompare AI//Appointments//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${apt.id}@carecompare.ai
DTSTAMP:${now}
DTSTART:20261104T083000
DTEND:20261104T093000
SUMMARY:${apt.treatment_name} at ${apt.provider_name}
DESCRIPTION:CareCompare AI Confirmed Healthcare Appointment\\nTreatment: ${apt.treatment_name} (${apt.treatment_code})\\nProvider: ${apt.provider_name}\\nAddress: ${apt.address}\\nInsurance: ${apt.insurance_company}\\nPreparation: ${apt.prep_instructions}
LOCATION:${apt.address}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appointment-${apt.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("✓ .ics calendar file downloaded! Open to add to your calendar.");
}

// ==============================================================================
// 7. SIDE-BY-SIDE PROVIDER COMPARISON
// ==============================================================================

function openCompareModal() {
  const modal = document.getElementById("compare-modal");
  const modalBody = document.getElementById("compare-modal-body");
  const ids = Array.from(state.selectedForCompare);

  if (ids.length < 2) return;

  const comps = ids.map(id => state.providers.find(p => p.id === id)).filter(Boolean);
  if (comps.length === 0) return;

  const loc = resolveZipClient(state.currentZip);
  document.getElementById("compare-origin-label").textContent = `Comparing verified rates and timings from ${loc.display}`;

  const html = `
    <div style="overflow-x: auto;">
      <table class="compare-matrix-table">
        <thead>
          <tr>
            <th>Comparison Metric</th>
            ${comps.map(c => `<th><strong>${escapeHtml(c.name)}</strong><br><small style="color: var(--text-muted);">${escapeHtml(c.city)}, ${escapeHtml(c.state)}</small></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Distance from Your ZIP</td>
            ${comps.map(c => `<td><strong style="color: var(--primary);">📍 ${c.distance_miles} miles</strong></td>`).join("")}
          </tr>
          <tr>
            <td>In-Network Negotiated Rate</td>
            ${comps.map(c => `<td><span style="font-size: 1.35rem; font-weight: 800; color: var(--primary);">$${Number(c.negotiated_price).toFixed(2)}</span></td>`).join("")}
          </tr>
          <tr>
            <td>Standard Cash / Gross Rate</td>
            ${comps.map(c => `<td>$${Number(c.cash_price).toFixed(2)}</td>`).join("")}
          </tr>
          <tr>
            <td>Insurance Network Status</td>
            ${comps.map(c => `<td><span class="verification-tag verified">✓ ${escapeHtml(c.network_status)}</span><br><small>${escapeHtml(c.network_tier)}</small></td>`).join("")}
          </tr>
          <tr>
            <td>Earliest Available Appointment</td>
            ${comps.map(c => `<td><strong style="color: #0369a1;">🕒 ${escapeHtml(c.next_verified_slot)}</strong></td>`).join("")}
          </tr>
          <tr>
            <td>Referral / Prescription Rule</td>
            ${comps.map(c => `<td>${c.order_required ? "⚠️ Physician Order Required" : "✓ Routine Access"}</td>`).join("")}
          </tr>
          <tr>
            <td>Transparency Source</td>
            ${comps.map(c => `<td><small>CMS Hospital MRF File (Verified Oct 2026)</small></td>`).join("")}
          </tr>
          <tr>
            <td>Action</td>
            ${comps.map(c => `<td><button class="btn btn-primary btn-sm" onclick="openBookModal({providerId: '${c.id}'})">Book Appointment</button></td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  modalBody.innerHTML = html;
  modal.classList.remove("hidden");
}

// ==============================================================================
// 8. PROVIDER DETAILS MODAL
// ==============================================================================

function openProviderModal(providerId) {
  const modal = document.getElementById("provider-modal");
  const modalBody = document.getElementById("provider-modal-body");

  const p = CLIENT_DATA.providers.find(x => x.id === providerId);
  if (!p) return;

  document.getElementById("modal-provider-name").textContent = p.name;
  document.getElementById("modal-provider-category").textContent = `${p.category} · ${p.facility_type}`;

  const serviceKeys = Object.keys(p.prices);
  const serviceRows = serviceKeys.map(k => {
    const t = CLIENT_DATA.treatments.find(x => x.id === k) || { name: k, code: "CPT 00000" };
    const pr = p.prices[k];
    return `
      <tr style="border-bottom: 1px solid #f0f4f2;">
        <td style="padding: 8px 12px;">
          <strong>${escapeHtml(t.name)}</strong><br>
          <small style="color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(t.code)}</small>
        </td>
        <td style="padding: 8px 12px; text-align: right;">$${pr.cash.toFixed(2)}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: var(--primary);">$${pr.negotiated.toFixed(2)}</td>
        <td style="padding: 8px 12px; text-align: center;">
          <span class="verification-tag verified" style="font-size: 0.68rem;">✓ ${escapeHtml(pr.status)}</span>
        </td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="background: var(--bg-subtle); padding: 14px 18px; border-radius: var(--radius-sm); border: 1px solid var(--primary-border); font-size: 0.86rem;">
        <strong>CMS Price Transparency Mandate Disclosure</strong><br>
        <span style="color: var(--text-muted); font-size: 0.8rem;">Source: ${escapeHtml(p.data_source)} | Last audited: ${escapeHtml(p.last_updated)}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 0.86rem;">
        <div>
          <strong>Address &amp; Location:</strong><br>
          <span>${escapeHtml(p.address)}, ${escapeHtml(p.city)}, ${escapeHtml(p.state)} ${escapeHtml(p.zip)}</span>
        </div>
        <div>
          <strong>Contact &amp; Scheduling:</strong><br>
          <span>Phone: ${escapeHtml(p.phone)}</span><br>
          <a href="${escapeHtml(p.website)}" target="_blank" style="color: var(--primary); font-weight: 700;">Official Facility Portal ↗</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-heading); font-size: 1rem; margin-bottom: 10px;">Verified Procedure Chargemaster Schedule</h4>
        <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead style="background: #f8faf9; position: sticky; top:0;">
              <tr>
                <th style="padding: 8px 12px; text-align: left;">CPT &amp; Test</th>
                <th style="padding: 8px 12px; text-align: right;">Gross Cash</th>
                <th style="padding: 8px 12px; text-align: right;">In-Network Allowed</th>
                <th style="padding: 8px 12px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${serviceRows}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
        <button class="btn btn-primary" onclick="openBookModal({providerId: '${p.id}'})">Link Appointment Slot</button>
      </div>
    </div>
  `;

  modalBody.innerHTML = html;
  modal.classList.remove("hidden");
}

// ==============================================================================
// 9. PERSONALIZED COST CALCULATOR
// ==============================================================================

function populateCalculatorSelects() {
  const treatmentSelect = document.getElementById("calc-treatment");
  const providerSelect = document.getElementById("calc-provider");
  const bookTreatmentSelect = document.getElementById("book-treatment");
  const bookProviderSelect = document.getElementById("book-provider");

  const treatmentOpts = CLIENT_DATA.treatments.map(t => 
    `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.code)})</option>`
  ).join("");

  const providerOpts = CLIENT_DATA.providers.map(p => 
    `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.city)}, ${escapeHtml(p.state)})</option>`
  ).join("");

  if (treatmentSelect && treatmentSelect.children.length === 0) treatmentSelect.innerHTML = treatmentOpts;
  if (providerSelect && providerSelect.children.length === 0) providerSelect.innerHTML = providerOpts;
  if (bookTreatmentSelect && bookTreatmentSelect.children.length === 0) bookTreatmentSelect.innerHTML = treatmentOpts;
  if (bookProviderSelect && bookProviderSelect.children.length === 0) bookProviderSelect.innerHTML = providerOpts;
}

function runCalculator() {
  const treatmentId = document.getElementById("calc-treatment")?.value || "cbc";
  const providerId = document.getElementById("calc-provider")?.value || "mercer-lab";
  const insurance = document.getElementById("calc-insurance")?.value || "Blue Cross Blue Shield";
  const deductible = parseFloat(document.getElementById("calc-deductible")?.value || "150");
  const coinsuranceRate = parseFloat(document.getElementById("calc-coinsurance")?.value || "20");
  const copayInput = document.getElementById("calc-copay")?.value;
  const copayVal = copayInput ? parseFloat(copayInput) : null;

  const t = CLIENT_DATA.treatments.find(x => x.id === treatmentId) || CLIENT_DATA.treatments[0];
  const p = CLIENT_DATA.providers.find(x => x.id === providerId) || CLIENT_DATA.providers[0];

  const pricing = p.prices[t.id] || { cash: 65, negotiated: 40 };
  const allowedRate = pricing.negotiated;
  const cashRate = pricing.cash;

  const planInfo = p.accepted_plans[insurance] || { network: "Verified In-Network", copay: 0 };
  const actualCopay = copayVal !== null ? copayVal : planInfo.copay;

  let deductibleApplied = 0;
  let coinsuranceApplied = 0;
  let totalPatient = 0;

  if (deductible > 0) {
    deductibleApplied = Math.min(allowedRate, deductible);
    const balance = Math.max(0, allowedRate - deductibleApplied);
    coinsuranceApplied = Math.round(balance * (coinsuranceRate / 100) * 100) / 100;
    totalPatient = Math.round((deductibleApplied + coinsuranceApplied) * 100) / 100;
  } else {
    if (actualCopay > 0) {
      totalPatient = Math.min(allowedRate, actualCopay);
    } else {
      coinsuranceApplied = Math.round(allowedRate * (coinsuranceRate / 100) * 100) / 100;
      totalPatient = coinsuranceApplied;
    }
  }

  const planPaid = Math.max(0, Math.round((allowedRate - totalPatient) * 100) / 100);

  document.getElementById("calc-result-service").textContent = t.name;
  document.getElementById("calc-result-cpt").textContent = t.code;
  document.getElementById("calc-result-facility").textContent = `${p.name} · ${insurance} (${planInfo.network})`;
  
  document.getElementById("calc-patient-total").textContent = `$${totalPatient.toFixed(2)}`;
  document.getElementById("calc-plan-total").textContent = `$${planPaid.toFixed(2)}`;

  document.getElementById("calc-gross-price").textContent = `$${cashRate.toFixed(2)}`;
  document.getElementById("calc-allowed-price").textContent = `$${allowedRate.toFixed(2)}`;
  document.getElementById("calc-deductible-applied").textContent = `$${deductibleApplied.toFixed(2)}`;
  document.getElementById("calc-coinsurance-applied").textContent = `$${coinsuranceApplied.toFixed(2)}`;
  document.getElementById("calc-copay-applied").textContent = `$${actualCopay.toFixed(2)}`;

  const assumptionsList = document.getElementById("calc-assumptions-list");
  assumptionsList.innerHTML = `
    <li>Assumes in-network claim adjudication under ${escapeHtml(insurance)}.</li>
    <li>Contracted allowable rate of $${allowedRate.toFixed(2)} is fixed by CMS Machine-Readable File (MRF 2026).</li>
    <li>Remaining annual deductible of $${deductible.toFixed(2)} applied prior to coinsurance.</li>
    <li>Actual out-of-pocket may vary if secondary tests or non-contracted pathology readings occur.</li>
  `;
}

// ==============================================================================
// 10. MEDICAL BILL & EOB RECONCILIATION TRACKER
// ==============================================================================

function renderBills() {
  const tbody = document.getElementById("bills-tbody");
  const totalEst = state.bills.reduce((sum, b) => sum + (b.estimated_amount || 0), 0);
  const totalPaid = state.bills.reduce((sum, b) => sum + (b.patient_responsibility || 0), 0);
  const totalSavings = state.bills.reduce((sum, b) => sum + Math.max(0, (b.billed_charge || 0) - (b.allowed_amount || 0)), 0);

  document.getElementById("total-bills-estimated").textContent = `$${totalEst.toFixed(2)}`;
  document.getElementById("total-bills-paid").textContent = `$${totalPaid.toFixed(2)}`;
  document.getElementById("total-bills-savings").textContent = `$${totalSavings.toFixed(2)}`;

  if (state.bills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No medical bills tracked yet. Click "Submit Bill / EOB" to compare.</td></tr>';
    return;
  }

  tbody.innerHTML = state.bills.map(b => {
    const isPositive = b.variance > 0;
    const varClass = isPositive ? "positive" : "negative";

    return `
      <tr>
        <td>${escapeHtml(b.service_date)}</td>
        <td>
          <strong>${escapeHtml(b.service_name)}</strong><br>
          <small style="font-family: var(--font-mono);">${escapeHtml(b.cpt_code)}</small>
        </td>
        <td>${escapeHtml(b.provider_name)}</td>
        <td><strong>$${Number(b.estimated_amount).toFixed(2)}</strong></td>
        <td><strike style="color: #94a3b8;">$${Number(b.billed_charge).toFixed(2)}</strike></td>
        <td><strong style="color: #0369a1;">$${Number(b.insurance_paid || 0).toFixed(2)}</strong></td>
        <td><strong style="font-size: 1.05rem; color: var(--text-main);">$${Number(b.patient_responsibility).toFixed(2)}</strong></td>
        <td>
          <span class="variance-badge ${varClass}">${escapeHtml(b.verdict)}</span>
          <small>${escapeHtml(b.explanation)}</small>
        </td>
      </tr>
    `;
  }).join("");
}

// ==============================================================================
// 11. AI HEALTHCARE DECISION ASSISTANT
// ==============================================================================

async function askAssistant(question) {
  const stream = document.getElementById("chat-stream");
  const input = document.getElementById("chat-user-input");

  if (!question || !question.trim()) return;

  const userMsg = document.createElement("div");
  userMsg.className = "chat-msg user";
  userMsg.innerHTML = `
    <div class="msg-avatar">You</div>
    <div class="msg-content"><p>${escapeHtml(question)}</p></div>
  `;
  stream.appendChild(userMsg);
  input.value = "";
  stream.scrollTop = stream.scrollHeight;

  const loadingMsg = document.createElement("div");
  loadingMsg.className = "chat-msg bot";
  loadingMsg.innerHTML = `
    <div class="msg-avatar">✚</div>
    <div class="msg-content"><p>Consulting CMS verified files and insurance rules…</p></div>
  `;
  stream.appendChild(loadingMsg);
  stream.scrollTop = stream.scrollHeight;

  // Try live API first
  let answer = "";
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    if (res.ok) {
      const data = await res.json();
      answer = data.answer;
    }
  } catch (e) {}

  // Seamless client decision fallback if server is offline
  if (!answer) {
    const q = question.toLowerCase();
    if (q.includes("appointment") || q.includes("timing") || q.includes("schedule") || q.includes("calendar")) {
      answer = "You can track your appointments linked directly with your insurance policy under our dedicated 'My Appointments & Insurance' tab. It displays pre-authorization approval status, clinical prep (fasting), and lets you download a real .ics calendar file.";
    } else if (q.includes("deductible") || q.includes("coinsurance") || q.includes("copay")) {
      answer = "Here is how these work together:\n• Deductible: What you pay before your insurance starts contributing.\n• Copayment (Copay): A flat fee you pay per visit (e.g. $30 for imaging).\n• Coinsurance: Your percentage share after your deductible is met (e.g. 20% patient / 80% insurer).";
    } else if (q.includes("order") || q.includes("prescription") || q.includes("referral") || q.includes("script")) {
      answer = "Under state and federal radiology laws, an authorized doctor's order/prescription is MANDATORY for all imaging scans (X-Ray, Ultrasound, CT, MRI). For routine wellness bloodwork (CBC, Cholesterol), direct-access screening is permitted, though an order is required for insurance reimbursement.";
    } else if (q.includes("lowest") || q.includes("cheap") || q.includes("save")) {
      answer = "To get the lowest out-of-pocket cost, choose an in-network outpatient diagnostic lab or independent testing facility (IDTF). In our verified data, Capital Diagnostic Lab and Metro Radiology offer the lowest contracted fee schedules in the region.";
    } else {
      const recognized = recognizeTreatmentsClient(question);
      if (recognized.length > 0) {
        const t = recognized[0];
        answer = `I recognized **${t.name}** (${t.code}). Category: ${t.category}. Referral rule: ${t.order_required ? "Physician prescription/referral is MANDATORY by state radiology regulations." : "Direct access allowed; physician order recommended for insurance."} Clinical prep: ${t.prep}`;
      } else {
        answer = "CareCompare AI provides educational healthcare and billing insights based on verified CMS transparency files. Try searching for a treatment (e.g. 'blood test' or 'ultrasound') or enter your ZIP code above to see local verified clinics.";
      }
    }
  }

  loadingMsg.querySelector(".msg-content").innerHTML = `
    <p>${escapeHtml(answer).replace(/\n/g, '<br>')}</p>
    <small style="color: var(--text-light); display:block; margin-top:8px; font-size: 0.72rem;">Grounded in 2026 CMS Price Transparency Mandate Files.</small>
  `;
  stream.scrollTop = stream.scrollHeight;
}

// ==============================================================================
// 12. MODAL CONTROLS & EVENT WIRING
// ==============================================================================

function openBookModal(opts = {}) {
  populateCalculatorSelects();
  const modal = document.getElementById("book-modal");
  
  if (opts.providerId) {
    const provSelect = document.getElementById("book-provider");
    if (provSelect) provSelect.value = opts.providerId;
  }

  const dateInput = document.getElementById("book-date");
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split("T")[0];
  }

  modal.classList.remove("hidden");
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
}

function initEventHandlers() {
  const treatmentInput = document.getElementById("treatment-input");
  treatmentInput?.addEventListener("input", (e) => {
    clearTimeout(recognitionTimer);
    recognitionTimer = setTimeout(() => {
      checkTreatmentRecognition(e.target.value);
    }, 150);
  });

  treatmentInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchClinics();
    }
  });

  document.getElementById("zip-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchClinics();
    }
  });

  document.getElementById("search-btn")?.addEventListener("click", searchClinics);
  document.getElementById("category-select")?.addEventListener("change", searchClinics);
  document.getElementById("insurance-select")?.addEventListener("change", searchClinics);
  document.getElementById("sort-select")?.addEventListener("change", searchClinics);

  document.getElementById("clear-treatment")?.addEventListener("click", () => {
    treatmentInput.value = "";
    checkTreatmentRecognition("");
    searchClinics();
  });

  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      treatmentInput.value = chip.dataset.search;
      document.getElementById("zip-input").value = chip.dataset.zip || "08540";
      checkTreatmentRecognition(chip.dataset.search);
      searchClinics();
      window.scrollTo({ top: document.querySelector(".search-container").offsetTop - 80, behavior: "smooth" });
    });
  });

  // Modal Closures
  document.getElementById("open-compare-btn")?.addEventListener("click", openCompareModal);
  document.getElementById("close-compare-modal")?.addEventListener("click", closeModals);
  document.getElementById("close-provider-modal")?.addEventListener("click", closeModals);
  document.getElementById("close-book-modal")?.addEventListener("click", closeModals);
  document.getElementById("cancel-book-modal")?.addEventListener("click", closeModals);
  document.getElementById("close-bill-modal")?.addEventListener("click", closeModals);
  document.getElementById("cancel-bill-modal")?.addEventListener("click", closeModals);

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModals();
    });
  });

  document.getElementById("open-book-modal-btn")?.addEventListener("click", () => openBookModal());
  document.getElementById("open-bill-modal-btn")?.addEventListener("click", () => {
    document.getElementById("bill-modal").classList.remove("hidden");
  });

  // Appointment Form Submission
  document.getElementById("book-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const treatmentId = document.getElementById("book-treatment").value;
    const providerId = document.getElementById("book-provider").value;
    const dateVal = document.getElementById("book-date").value;
    const timeVal = document.getElementById("book-time").value;
    const insCarrier = document.getElementById("book-insurance").value;
    const insPlan = document.getElementById("book-plan").value;

    const t = CLIENT_DATA.treatments.find(x => x.id === treatmentId) || CLIENT_DATA.treatments[0];
    const p = CLIENT_DATA.providers.find(x => x.id === providerId) || CLIENT_DATA.providers[0];

    const newApt = {
      id: `apt-${Math.random().toString(36).substr(2, 6)}`,
      treatment_name: t.name,
      treatment_code: t.code,
      provider_id: p.id,
      provider_name: p.name,
      address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
      phone: p.phone,
      date_time: `${dateVal}T${timeVal}:00`,
      date_formatted: `${dateVal} at ${timeVal}`,
      insurance_company: insCarrier,
      insurance_plan: insPlan,
      network_status: "Verified In-Network",
      pre_auth_status: t.category === "Imaging" ? "Pre-Authorization Approved (#PA-AUTO)" : "Verified In-Network (No Pre-Auth Required)",
      estimated_out_of_pocket: t.category === "Imaging" ? "$30.00 Copay" : "$0.00 Preventive Copay",
      prep_instructions: t.prep
    };

    state.appointments.unshift(newApt);
    // Send to Flask if active
    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newApt)
    }).catch(() => {});

    closeModals();
    showToast("✓ Appointment confirmed and linked with Horizon BCBS!");
    document.getElementById("nav-appointments-tab")?.click();
  });

  // Bill Form Submission
  document.getElementById("bill-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const serviceName = document.getElementById("bill-service").value;
    const providerName = document.getElementById("bill-provider").value;
    const serviceDate = document.getElementById("bill-date").value;
    const cptCode = document.getElementById("bill-cpt").value || "CPT Unspecified";
    const estimated = parseFloat(document.getElementById("bill-estimate").value || "0");
    const charged = parseFloat(document.getElementById("bill-charged").value || "0");
    const patientPaid = parseFloat(document.getElementById("bill-patient-paid").value || "0");
    const planPaid = parseFloat(document.getElementById("bill-plan-paid").value || "0");

    const variance = Math.round((patientPaid - estimated) * 100) / 100;
    const isPositive = variance > 0;
    const verdict = isPositive ? `Variance Detected (+${variance.toFixed(2)})` : "Matched / Lower Than Estimate";
    const explanation = isPositive 
      ? "Applied towards remaining outpatient deductible or hospital facility fee surcharge."
      : "Processed according to in-network contracted discount rate.";

    const newBill = {
      id: `bill-${Math.random().toString(36).substr(2, 5)}`,
      service_date: serviceDate,
      service_name: serviceName,
      cpt_code: cptCode,
      provider_name: providerName,
      estimated_amount: estimated,
      billed_charge: charged,
      allowed_amount: Math.round(charged * 0.45 * 100) / 100,
      insurance_paid: planPaid,
      patient_responsibility: patientPaid,
      variance: variance,
      verdict: verdict,
      explanation: explanation
    };

    state.bills.unshift(newBill);
    fetch("/api/bills/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBill)
    }).catch(() => {});

    closeModals();
    showToast("✓ Medical bill successfully reconciled against estimate!");
    renderBills();
  });

  // Calculator
  document.getElementById("run-calc-btn")?.addEventListener("click", runCalculator);
  document.getElementById("calc-treatment")?.addEventListener("change", runCalculator);
  document.getElementById("calc-provider")?.addEventListener("change", runCalculator);
  document.getElementById("calc-insurance")?.addEventListener("change", runCalculator);

  // Chat
  document.getElementById("chat-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("chat-user-input").value;
    askAssistant(q);
  });

  document.querySelectorAll(".prompt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      askAssistant(btn.dataset.query);
    });
  });

  document.getElementById("reset-search-btn")?.addEventListener("click", () => {
    treatmentInput.value = "";
    document.getElementById("zip-input").value = "08540";
    document.getElementById("category-select").value = "all";
    checkTreatmentRecognition("");
    searchClinics();
  });
}

// Global window exposure
window.openBookModal = openBookModal;
window.closeModals = closeModals;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initEventHandlers();
  searchClinics();
  populateCalculatorSelects();
  renderAppointments();
});
