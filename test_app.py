"""
CareCompare AI — Comprehensive Integration & Feature Tests
Tests:
1. Landing page rendering & metadata
2. Treatment recognition across multiple queries (CBC, MRI, Ultrasound, Cholesterol, X-ray)
3. Provider search by ZIP code & distance calculation
4. Provider side-by-side comparison (2-4 providers)
5. Appointments & Insurance Schedule API (GET, POST, DELETE, Calendar .ics)
6. Actuarial Cost Calculator with deductible, copay & coinsurance logic
7. Medical Bill / EOB Reconciliation Tracker
8. AI Healthcare Decision Assistant
9. Health check
"""

import unittest
from app import app
import database

class CareCompareTestSuite(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_health_check(self):
        res = self.client.get('/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["version"], "2.0.0")
        self.assertGreaterEqual(data["database"]["treatments"], 15)
        self.assertGreaterEqual(data["database"]["providers"], 5)

    def test_02_index_page(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        content = res.data.decode('utf-8')
        self.assertIn("CareCompare", content)
        self.assertIn("My Appointments &amp; Insurance", content)
        self.assertIn("Cost Calculator", content)
        self.assertIn("Bill &amp; EOB Tracker", content)
        self.assertIn("TRANSPARENT &amp; VERIFIED HEALTHCARE DATA", content)

    def test_03_treatment_recognition(self):
        queries = [
            ("i need a cbc blood test", "Complete Blood Count"),
            ("chest xray for lung pain", "Chest X-Ray"),
            ("doctor ordered abdominal ultrasound", "Abdominal Ultrasound"),
            ("checking my cholesterol and lipid panel", "Lipid Panel"),
            ("brain mri scan", "Brain MRI"),
        ]
        for query, expected_sub in queries:
            res = self.client.post('/api/treatments/recognize', json={"text": query})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertGreater(data["count"], 0, f"Failed to recognize query: {query}")
            matched_names = [t["name"] for t in data["recognized"]]
            self.assertTrue(any(expected_sub in name for name in matched_names), f"Expected '{expected_sub}' in {matched_names}")

    def test_04_provider_search_by_zip(self):
        # Search from Princeton ZIP 08540
        res = self.client.get('/api/providers?zip=08540&q=blood%20test')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreater(data["count"], 0)
        self.assertEqual(data["location"]["zip"], "08540")
        
        # Verify distance exists and is positive float
        for p in data["results"]:
            self.assertIn("distance_miles", p)
            self.assertGreaterEqual(p["distance_miles"], 0.0)
            self.assertIn("negotiated_price", p)
            self.assertIn("verification_badge", p)
            self.assertEqual(p["verification_badge"], "VERIFIED")

    def test_05_provider_comparison(self):
        res = self.client.get('/api/compare?ids=mercer-lab,university-diagnostics&zip=08540&q=lipid')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["count"], 2)
        comp1, comp2 = data["comparison"][0], data["comparison"][1]
        self.assertIn(comp1["id"], ["mercer-lab", "university-diagnostics"])
        self.assertIn("distance_miles", comp1)
        self.assertIn("negotiated_price", comp1)
        self.assertIn("network_status", comp1)

    def test_06_appointments_and_insurance_schedule(self):
        # 1. Fetch existing appointments
        res = self.client.get('/api/appointments')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["count"], 2)
        self.assertEqual(data["insurance_profile"]["carrier"], "Blue Cross Blue Shield")

        first_apt = data["appointments"][0]
        self.assertIn("treatment_name", first_apt)
        self.assertIn("insurance_company", first_apt)
        self.assertIn("pre_auth_status", first_apt)

        # 2. Add new appointment linked to insurance
        new_payload = {
            "treatment_id": "chest_xray",
            "provider_id": "central-imaging",
            "date": "2026-11-20",
            "time": "14:00",
            "insurance_company": "Blue Cross Blue Shield",
            "insurance_plan": "Horizon BCBS OMNIA Tier 1",
            "notes": "Testing appointment scheduling"
        }
        create_res = self.client.post('/api/appointments', json=new_payload)
        self.assertEqual(create_res.status_code, 201)
        created_data = create_res.get_json()
        new_apt_id = created_data["appointment"]["id"]

        # 3. Export calendar .ics
        cal_res = self.client.get(f'/api/appointments/{new_apt_id}/calendar')
        self.assertEqual(cal_res.status_code, 200)
        self.assertIn("text/calendar", cal_res.headers.get("Content-Type", ""))
        ics_text = cal_res.data.decode('utf-8')
        self.assertIn("BEGIN:VCALENDAR", ics_text)
        self.assertIn("Chest X-Ray", ics_text)
        self.assertIn("END:VCALENDAR", ics_text)

        # 4. Cancel appointment
        del_res = self.client.delete(f'/api/appointments/{new_apt_id}')
        self.assertEqual(del_res.status_code, 200)

    def test_07_cost_calculator(self):
        payload = {
            "treatment_id": "abdominal_us",
            "provider_id": "central-imaging",
            "insurance_company": "Blue Cross Blue Shield",
            "remaining_deductible": 100.0,
            "coinsurance_rate": 20.0
        }
        res = self.client.post('/api/calculator/estimate', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        rates = data["rates"]
        self.assertIn("total_patient_responsibility", rates)
        self.assertIn("contracted_allowed_rate", rates)
        self.assertIn("assumptions", rates)
        # Allowed rate should equal patient responsibility + insurer payment
        total_sum = round(rates["total_patient_responsibility"] + rates["estimated_insurer_payment"], 2)
        self.assertAlmostEqual(total_sum, rates["contracted_allowed_rate"], delta=0.05)

    def test_08_medical_bill_tracker(self):
        # 1. Fetch bills
        res = self.client.get('/api/bills')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(data["count"], 1)

        # 2. Submit new bill
        bill_payload = {
            "service_name": "Screening Mammography",
            "cpt_code": "CPT 77067",
            "provider_name": "Central Imaging Center",
            "estimated_amount": 120.0,
            "billed_charge": 340.0,
            "patient_responsibility": 0.0,
            "insurance_paid": 120.0
        }
        post_res = self.client.post('/api/bills/compare', json=bill_payload)
        self.assertEqual(post_res.status_code, 201)
        rec = post_res.get_json()["reconciliation"]
        self.assertEqual(rec["variance"], -120.0)
        self.assertIn("Matched / Lower Than Estimate", rec["verdict"])

    def test_09_decision_assistant(self):
        # Test deductible explanation
        res1 = self.client.post('/api/assistant', json={"question": "What is a deductible?"})
        self.assertIn("Deductible", res1.get_json()["answer"])

        # Test appointments tracking inquiry
        res2 = self.client.post('/api/assistant', json={"question": "How can I track my appointments?"})
        self.assertIn("My Appointments & Insurance", res2.get_json()["answer"])

        # Test order requirement
        res3 = self.client.post('/api/assistant', json={"question": "Do I need a prescription for an MRI?"})
        self.assertIn("MANDATORY", res3.get_json()["answer"])

if __name__ == '__main__':
    unittest.main()
