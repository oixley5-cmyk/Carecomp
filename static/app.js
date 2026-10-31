/**
 * CareCompare AI — Frontend Application Logic (V2.0)
 * Handles:
 * - Smart Treatment Recognition & CPT matching NLP
 * - ZIP Code clinic locator & distance calculation
 * - Insurance-Linked Appointments & Timings Tracker (with .ics calendar export)
 * - Side-by-Side Provider Comparison (2-4 providers)
 * - Actuarial Personalized Cost Calculator
 * - Medical Bill / EOB Reconciliation Tracker
 * - AI Healthcare Decision Assistant
 */

// Application State
const state = {
  activeTab: "search-tab",
  treatments: [],
  providers: [],
  selectedForCompare: new Set(),
  appointments: [],
  bills: [],
  currentQuery: "",
  currentZip: "08540",
  currentInsurance: "Blue Cross Blue Shield",
  currentPlan: "Horizon BCBS OMNIA Tier 1",
  currentCategory: "all",
  currentSort: "cost"
};

// Utility: HTML Escaping
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// Utility: Toast Notifications
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
// 1. TAB NAVIGATION CONTROLLER
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

    // Sub-view refreshes
    if (tabId === "appointments-tab") {
      loadAppointments();
    } else if (tabId === "calculator-tab") {
      populateCalculatorSelects();
      runCalculator();
    } else if (tabId === "bills-tab") {
      loadBills();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      switchTab(target);
      window.location.hash = target;
    });
  });

  // Footer tab links
  document.querySelectorAll(".footer-tab-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Handle URL hash on page load
  const initialHash = window.location.hash.replace("#", "");
  if (initialHash && document.getElementById(initialHash)) {
    switchTab(initialHash);
  }
}

// ==============================================================================
// 2. TREATMENT RECOGNITION & SEARCH ENGINE
// ==============================================================================

let recognitionTimer = null;

async function checkTreatmentRecognition(text) {
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

  try {
    const res = await fetch("/api/treatments/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    const list = data.recognized || [];

    if (list.length > 0) {
      pillRow.innerHTML = list.map(t => `
        <span class="rec-pill" title="${escapeHtml(t.description)}">
          ✓ CPT ${escapeHtml(t.code.replace('CPT ', ''))}: ${escapeHtml(t.name.split('(')[0].trim())}
        </span>
      `).join("");

      // Populate Intel Card
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
  } catch (err) {
    console.error("Treatment recognition error:", err);
  }
}

async function searchClinics() {
  const query = document.getElementById("treatment-input").value.trim();
  const zip = document.getElementById("zip-input").value.trim();
  const category = document.getElementById("category-select").value;
  const insurance = document.getElementById("insurance-select").value;
  const sort = document.getElementById("sort-select").value;

  state.currentQuery = query;
  state.currentZip = zip || "08540";
  state.currentCategory = category;
  state.currentInsurance = insurance;
  state.currentSort = sort;

  const grid = document.getElementById("provider-grid");
  const countEl = document.getElementById("results-count");
  const emptyState = document.getElementById("empty-state");
  const locDisplay = document.getElementById("location-display");
  const locSubtext = document.getElementById("location-subtext");

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Finding verified clinics and calculating distances…</div>';
  emptyState.classList.add("hidden");

  const params = new URLSearchParams({
    q: query,
    zip: state.currentZip,
    category: category,
    insurance: insurance,
    sort: sort
  });

  try {
    const res = await fetch(`/api/providers?${params.toString()}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();

    state.providers = data.results || [];

    // Update location badges
    if (data.location) {
      locDisplay.textContent = `📍 ${data.location.display}`;
      locSubtext.textContent = `Distances calculated from ${data.location.display}`;
    }

    countEl.textContent = `${state.providers.length} clinic${state.providers.length === 1 ? '' : 's'} available`;

    if (state.providers.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    renderProviderCards(state.providers);
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #dc2626;">Error loading provider records. Please ensure Flask is running.</div>`;
    console.error(err);
  }
}

function renderProviderCards(providers) {
  const grid = document.getElementById("provider-grid");
  grid.innerHTML = providers.map(p => {
    const isSelected = state.selectedForCompare.has(p.id);
    const badgeClass = p.verification_badge.toLowerCase();
    
    return `
      <article class="provider-card ${isSelected ? 'selected-for-compare' : ''}" data-id="${p.id}">
        <div class="card-topbar">
          <span class="facility-category-chip">${escapeHtml(p.category)} · ${escapeHtml(p.facility_type)}</span>
          <span class="verification-tag ${badgeClass}">
            ✓ ${escapeHtml(p.verification_badge)} (CMS 2026)
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
              $${p.negotiated_price.toFixed(2)} <small>/ service</small>
            </div>
            <small style="font-size: 0.72rem; color: var(--primary); font-weight: 600;">
              ${escapeHtml(p.service_matched)} (${escapeHtml(p.cpt_code)})
            </small>
          </div>
          <div class="price-secondary">
            <span>Standard Cash / Self-Pay:</span><br>
            <strong>$${p.cash_price.toFixed(2)}</strong>
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
            <span class="highlight-val">${escapeHtml(p.hours.split('|')[0].trim())}</span>
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
  // Compare Buttons
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

  // Details Modal Buttons
  document.querySelectorAll("[data-detail-id]").forEach(btn => {
    btn.addEventListener("click", () => openProviderModal(btn.dataset.detailId));
  });

  // Link / Book Appointment Buttons
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
// 3. MY APPOINTMENTS & INSURANCE SCHEDULE (USER'S DIRECT REQUIREMENT)
// ==============================================================================

async function loadAppointments() {
  const listEl = document.getElementById("appointments-list");
  const totalEl = document.getElementById("appointments-total");
  const navBadge = document.getElementById("appointment-badge");

  listEl.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">Syncing appointments with insurance benefits…</div>';

  try {
    const res = await fetch("/api/appointments");
    const data = await res.json();
    state.appointments = data.appointments || [];

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
          <a href="/api/appointments/${apt.id}/calendar" class="btn btn-secondary btn-sm" title="Download .ics Calendar File">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <span>Add to Calendar (.ics)</span>
          </a>
          <button class="btn btn-outline btn-sm cancel-apt-btn" data-apt-id="${apt.id}" style="color: #dc2626;">
            Cancel Slot
          </button>
        </div>
      </article>
    `).join("");

    // Cancel appointment buttons
    document.querySelectorAll(".cancel-apt-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.aptId;
        if (confirm("Are you sure you want to cancel this appointment slot?")) {
          const delRes = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
          if (delRes.ok) {
            showToast("Appointment successfully cancelled.");
            loadAppointments();
          }
        }
      });
    });

  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center; color: #dc2626; padding: 30px;">Failed to load appointments: ${err.message}</div>`;
  }
}

// ==============================================================================
// 4. SIDE-BY-SIDE PROVIDER COMPARISON
// ==============================================================================

async function openCompareModal() {
  const modal = document.getElementById("compare-modal");
  const modalBody = document.getElementById("compare-modal-body");
  const ids = Array.from(state.selectedForCompare).join(",");

  if (!ids) return;

  modalBody.innerHTML = '<div style="text-align: center; padding: 40px;">Generating side-by-side comparison matrix…</div>';
  modal.classList.remove("hidden");

  try {
    const res = await fetch(`/api/compare?ids=${ids}&zip=${state.currentZip}&q=${encodeURIComponent(state.currentQuery)}&insurance=${encodeURIComponent(state.currentInsurance)}`);
    const data = await res.json();
    const comps = data.comparison || [];

    if (comps.length === 0) {
      modalBody.innerHTML = "<p>No providers available to compare.</p>";
      return;
    }

    document.getElementById("compare-origin-label").textContent = `Comparing for ${data.target_treatment ? data.target_treatment.name : 'General Services'} from ${data.origin_display}`;

    let html = `
      <div style="overflow-x: auto;">
        <table class="compare-matrix-table">
          <thead>
            <tr>
              <th>Comparison Metric</th>
              ${comps.map(c => `<th><strong>${escapeHtml(c.name)}</strong><br><small style="color: var(--text-muted);">${escapeHtml(c.city)}</small></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Distance from Your ZIP</td>
              ${comps.map(c => `<td><strong style="color: var(--primary);">📍 ${c.distance_miles} miles</strong></td>`).join("")}
            </tr>
            <tr>
              <td>In-Network Negotiated Rate</td>
              ${comps.map(c => `<td><span style="font-size: 1.3rem; font-weight: 800; color: var(--primary);">$${c.negotiated_price.toFixed(2)}</span></td>`).join("")}
            </tr>
            <tr>
              <td>Standard Cash / Gross Rate</td>
              ${comps.map(c => `<td>$${c.cash_price.toFixed(2)}</td>`).join("")}
            </tr>
            <tr>
              <td>Insurance Network Status</td>
              ${comps.map(c => `<td><span class="verification-tag verified">✓ ${escapeHtml(c.network_status)}</span><br><small>${escapeHtml(c.tier)}</small></td>`).join("")}
            </tr>
            <tr>
              <td>Earliest Available Appointment</td>
              ${comps.map(c => `<td><strong style="color: #0369a1;">🕒 ${escapeHtml(c.next_slot)}</strong></td>`).join("")}
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
  } catch (err) {
    modalBody.innerHTML = `<p style="color: red;">Failed to generate comparison: ${err.message}</p>`;
  }
}

// ==============================================================================
// 5. PROVIDER DETAILS MODAL
// ==============================================================================

async function openProviderModal(providerId) {
  const modal = document.getElementById("provider-modal");
  const modalBody = document.getElementById("provider-modal-body");

  modalBody.innerHTML = '<div style="text-align:center; padding: 30px;">Loading verified transparency file…</div>';
  modal.classList.remove("hidden");

  try {
    const res = await fetch(`/api/providers/${providerId}`);
    const data = await res.json();
    const p = data.provider;
    const services = data.services || [];

    document.getElementById("modal-provider-name").textContent = p.name;
    document.getElementById("modal-provider-category").textContent = `${p.category} · ${p.facility_type}`;

    let html = `
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
                ${services.map(s => `
                  <tr style="border-bottom: 1px solid #f0f4f2;">
                    <td style="padding: 8px 12px;">
                      <strong>${escapeHtml(s.name)}</strong><br>
                      <small style="color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(s.cpt_code)}</small>
                    </td>
                    <td style="padding: 8px 12px; text-align: right;">$${s.cash_price.toFixed(2)}</td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: var(--primary);">$${s.negotiated_price.toFixed(2)}</td>
                    <td style="padding: 8px 12px; text-align: center;">
                      <span class="verification-tag verified" style="font-size: 0.68rem;">✓ ${escapeHtml(s.status)}</span>
                    </td>
                  </tr>
                `).join("")}
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
  } catch (err) {
    modalBody.innerHTML = `<p style="color: red;">Failed to load details: ${err.message}</p>`;
  }
}

// ==============================================================================
// 6. PERSONALIZED COST CALCULATOR
// ==============================================================================

async function populateCalculatorSelects() {
  const treatmentSelect = document.getElementById("calc-treatment");
  const providerSelect = document.getElementById("calc-provider");
  const bookTreatmentSelect = document.getElementById("book-treatment");
  const bookProviderSelect = document.getElementById("book-provider");

  if (state.treatments.length === 0) {
    const res = await fetch("/api/treatments");
    const data = await res.json();
    state.treatments = data.treatments || [];
  }

  const treatmentOpts = state.treatments.map(t => 
    `<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.code)})</option>`
  ).join("");

  const providerOpts = [
    { id: "mercer-lab", name: "Mercer Community Lab (Princeton, NJ)" },
    { id: "central-imaging", name: "Central Imaging Center (Princeton, NJ)" },
    { id: "university-diagnostics", name: "University Diagnostics (Plainsboro, NJ)" },
    { id: "northside-imaging", name: "Northside Imaging & Radiology (Lawrenceville, NJ)" },
    { id: "capital-diagnostics", name: "Capital Diagnostic Laboratory (Hamilton, NJ)" },
    { id: "rutgers-imaging", name: "Rutgers Health Diagnostic Imaging (New Brunswick, NJ)" },
    { id: "penn-plainsboro", name: "Penn Medicine Plainsboro (Plainsboro, NJ)" },
    { id: "metro-radiology", name: "Metro Radiology & Advanced Ultrasound (Edison, NJ)" },
  ].map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");

  if (treatmentSelect && treatmentSelect.children.length === 0) treatmentSelect.innerHTML = treatmentOpts;
  if (providerSelect && providerSelect.children.length === 0) providerSelect.innerHTML = providerOpts;
  if (bookTreatmentSelect && bookTreatmentSelect.children.length === 0) bookTreatmentSelect.innerHTML = treatmentOpts;
  if (bookProviderSelect && bookProviderSelect.children.length === 0) bookProviderSelect.innerHTML = providerOpts;
}

async function runCalculator() {
  const treatmentId = document.getElementById("calc-treatment")?.value || "cbc";
  const providerId = document.getElementById("calc-provider")?.value || "mercer-lab";
  const insurance = document.getElementById("calc-insurance")?.value || "Blue Cross Blue Shield";
  const deductible = parseFloat(document.getElementById("calc-deductible")?.value || "150");
  const coinsurance = parseFloat(document.getElementById("calc-coinsurance")?.value || "20");
  const copayInput = document.getElementById("calc-copay")?.value;
  const copay = copayInput ? parseFloat(copayInput) : null;

  try {
    const res = await fetch("/api/calculator/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatment_id: treatmentId,
        provider_id: providerId,
        insurance_company: insurance,
        insurance_plan: "Standard Plan",
        remaining_deductible: deductible,
        coinsurance_rate: coinsurance,
        copay: copay
      })
    });

    const data = await res.json();
    const rates = data.rates;

    document.getElementById("calc-result-service").textContent = data.treatment.name;
    document.getElementById("calc-result-cpt").textContent = data.treatment.code;
    document.getElementById("calc-result-facility").textContent = `${data.provider.name} · ${data.insurance.company} (${data.insurance.network_status})`;
    
    document.getElementById("calc-patient-total").textContent = `$${rates.total_patient_responsibility.toFixed(2)}`;
    document.getElementById("calc-plan-total").textContent = `$${rates.estimated_insurer_payment.toFixed(2)}`;

    document.getElementById("calc-gross-price").textContent = `$${rates.standard_cash_rate.toFixed(2)}`;
    document.getElementById("calc-allowed-price").textContent = `$${rates.contracted_allowed_rate.toFixed(2)}`;
    document.getElementById("calc-deductible-applied").textContent = `$${rates.deductible_applied.toFixed(2)}`;
    document.getElementById("calc-coinsurance-applied").textContent = `$${rates.coinsurance_applied.toFixed(2)}`;
    document.getElementById("calc-copay-applied").textContent = `$${rates.copay_applied.toFixed(2)}`;

    const assumptionsList = document.getElementById("calc-assumptions-list");
    assumptionsList.innerHTML = rates.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join("");

  } catch (err) {
    console.error("Calculator error:", err);
  }
}

// ==============================================================================
// 7. MEDICAL BILL & EOB RECONCILIATION TRACKER
// ==============================================================================

async function loadBills() {
  const tbody = document.getElementById("bills-tbody");
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Loading historical reconciliation records…</td></tr>';

  try {
    const res = await fetch("/api/bills");
    const data = await res.json();
    state.bills = data.bills || [];

    document.getElementById("total-bills-estimated").textContent = `$${data.summary.total_estimated.toFixed(2)}`;
    document.getElementById("total-bills-paid").textContent = `$${data.summary.total_patient_paid.toFixed(2)}`;
    document.getElementById("total-bills-savings").textContent = `$${data.summary.total_savings_identified.toFixed(2)}`;

    if (state.bills.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No medical bills tracked yet. Click "Submit Bill / EOB" to compare.</td></tr>';
      return;
    }

    tbody.innerHTML = state.bills.map(b => {
      const isPositive = b.variance > 0;
      const varClass = isPositive ? "positive" : "negative";
      const varSign = isPositive ? `+${b.variance.toFixed(2)}` : `-$${Math.abs(b.variance).toFixed(2)}`;

      return `
        <tr>
          <td>${escapeHtml(b.service_date)}</td>
          <td>
            <strong>${escapeHtml(b.service_name)}</strong><br>
            <small style="font-family: var(--font-mono);">${escapeHtml(b.cpt_code)}</small>
          </td>
          <td>${escapeHtml(b.provider_name)}</td>
          <td><strong>$${b.estimated_amount.toFixed(2)}</strong></td>
          <td><strike style="color: #94a3b8;">$${b.billed_charge.toFixed(2)}</strike></td>
          <td><strong style="color: #0369a1;">$${b.insurance_paid.toFixed(2)}</strong></td>
          <td><strong style="font-size: 1.05rem; color: var(--text-main);">$${b.patient_responsibility.toFixed(2)}</strong></td>
          <td>
            <span class="variance-badge ${varClass}">${escapeHtml(b.verdict)}</span>
            <small>${escapeHtml(b.explanation)}</small>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px;">Failed to load bills: ${err.message}</td></tr>`;
  }
}

// ==============================================================================
// 8. AI HEALTHCARE DECISION ASSISTANT
// ==============================================================================

async function askAssistant(question) {
  const stream = document.getElementById("chat-stream");
  const input = document.getElementById("chat-user-input");

  if (!question || !question.trim()) return;

  // Append user bubble
  const userMsg = document.createElement("div");
  userMsg.className = "chat-msg user";
  userMsg.innerHTML = `
    <div class="msg-avatar">You</div>
    <div class="msg-content"><p>${escapeHtml(question)}</p></div>
  `;
  stream.appendChild(userMsg);
  input.value = "";
  stream.scrollTop = stream.scrollHeight;

  // Append temporary bot loading bubble
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "chat-msg bot";
  loadingMsg.innerHTML = `
    <div class="msg-avatar">✚</div>
    <div class="msg-content"><p>Consulting CMS verified files and insurance rules…</p></div>
  `;
  stream.appendChild(loadingMsg);
  stream.scrollTop = stream.scrollHeight;

  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    loadingMsg.querySelector(".msg-content").innerHTML = `
      <p>${escapeHtml(data.answer).replace(/\n\n/g, '</p><p>').replace(/• /g, '• ')}</p>
      <small style="color: var(--text-light); display:block; margin-top:8px; font-size: 0.72rem;">${escapeHtml(data.verified_note)}</small>
    `;
    stream.scrollTop = stream.scrollHeight;
  } catch {
    loadingMsg.querySelector(".msg-content").innerHTML = `<p style="color: red;">The decision assistant is temporarily unavailable. Please retry.</p>`;
  }
}

// ==============================================================================
// 9. MODAL CONTROLS & EVENT WIRING
// ==============================================================================

function openBookModal(opts = {}) {
  populateCalculatorSelects();
  const modal = document.getElementById("book-modal");
  
  if (opts.providerId) {
    const provSelect = document.getElementById("book-provider");
    if (provSelect) provSelect.value = opts.providerId;
  }

  // Set default appointment date to tomorrow
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
  // Search Form Submit & Live Typing
  const treatmentInput = document.getElementById("treatment-input");
  treatmentInput.addEventListener("input", (e) => {
    clearTimeout(recognitionTimer);
    recognitionTimer = setTimeout(() => {
      checkTreatmentRecognition(e.target.value);
    }, 250);
  });

  treatmentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchClinics();
    }
  });

  document.getElementById("zip-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchClinics();
    }
  });

  document.getElementById("search-btn").addEventListener("click", searchClinics);
  document.getElementById("category-select").addEventListener("change", searchClinics);
  document.getElementById("insurance-select").addEventListener("change", searchClinics);
  document.getElementById("sort-select").addEventListener("change", searchClinics);

  // Clear treatment input button
  document.getElementById("clear-treatment").addEventListener("click", () => {
    treatmentInput.value = "";
    checkTreatmentRecognition("");
    searchClinics();
  });

  // Quick Chips
  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      treatmentInput.value = chip.dataset.search;
      document.getElementById("zip-input").value = chip.dataset.zip || "08540";
      checkTreatmentRecognition(chip.dataset.search);
      searchClinics();
      window.scrollTo({ top: document.querySelector(".search-container").offsetTop - 80, behavior: "smooth" });
    });
  });

  // Open Compare Modal
  document.getElementById("open-compare-btn").addEventListener("click", openCompareModal);
  document.getElementById("close-compare-modal").addEventListener("click", closeModals);
  document.getElementById("close-provider-modal").addEventListener("click", closeModals);
  document.getElementById("close-book-modal").addEventListener("click", closeModals);
  document.getElementById("cancel-book-modal").addEventListener("click", closeModals);
  document.getElementById("close-bill-modal").addEventListener("click", closeModals);
  document.getElementById("cancel-bill-modal").addEventListener("click", closeModals);

  // Close modals on clicking backdrop
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModals();
    });
  });

  // Open Book Modal from tab
  document.getElementById("open-book-modal-btn")?.addEventListener("click", () => openBookModal());
  document.getElementById("open-bill-modal-btn")?.addEventListener("click", () => {
    document.getElementById("bill-modal").classList.remove("hidden");
  });

  // Appointment Form Submission
  document.getElementById("book-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      treatment_id: document.getElementById("book-treatment").value,
      provider_id: document.getElementById("book-provider").value,
      date: document.getElementById("book-date").value,
      time: document.getElementById("book-time").value,
      insurance_company: document.getElementById("book-insurance").value,
      insurance_plan: document.getElementById("book-plan").value,
      order_on_file: document.getElementById("book-order").checked,
      notes: document.getElementById("book-notes").value
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        closeModals();
        showToast("✓ Appointment confirmed and linked with Horizon BCBS!");
        // Switch to appointments tab
        document.getElementById("nav-appointments-tab").click();
      } else {
        alert(data.error || "Failed to schedule appointment");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  // Bill Form Submission
  document.getElementById("bill-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      service_name: document.getElementById("bill-service").value,
      provider_name: document.getElementById("bill-provider").value,
      service_date: document.getElementById("bill-date").value,
      cpt_code: document.getElementById("bill-cpt").value || "CPT 76700",
      estimated_amount: parseFloat(document.getElementById("bill-estimate").value),
      billed_charge: parseFloat(document.getElementById("bill-charged").value),
      patient_responsibility: parseFloat(document.getElementById("bill-patient-paid").value),
      insurance_paid: parseFloat(document.getElementById("bill-plan-paid").value || "0")
    };

    try {
      const res = await fetch("/api/bills/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeModals();
        showToast("✓ Medical bill successfully reconciled against estimate!");
        loadBills();
      }
    } catch (err) {
      alert("Error submitting bill: " + err.message);
    }
  });

  // Calculator Form
  document.getElementById("run-calc-btn")?.addEventListener("click", runCalculator);
  document.getElementById("calc-treatment")?.addEventListener("change", runCalculator);
  document.getElementById("calc-provider")?.addEventListener("change", runCalculator);
  document.getElementById("calc-insurance")?.addEventListener("change", runCalculator);

  // Chat Form & Prompt Buttons
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("chat-user-input").value;
    askAssistant(q);
  });

  document.querySelectorAll(".prompt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      askAssistant(btn.dataset.query);
    });
  });

  // Reset search button
  document.getElementById("reset-search-btn")?.addEventListener("click", () => {
    treatmentInput.value = "";
    document.getElementById("zip-input").value = "08540";
    document.getElementById("category-select").value = "all";
    checkTreatmentRecognition("");
    searchClinics();
  });
}

// ==============================================================================
// INITIALIZATION
// ==============================================================================

// Expose to window scope for inline HTML handlers
window.openBookModal = openBookModal;
window.closeModals = closeModals;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initEventHandlers();
  searchClinics();
  populateCalculatorSelects();
});
