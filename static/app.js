const providerGrid = document.getElementById("provider-grid");
const resultCount = document.getElementById("result-count");
const resultSubtitle = document.getElementById("result-subtitle");
const emptyState = document.getElementById("empty-state");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function providerCard(p) {
  const icon = p.category === "Imaging" ? "⌁" : "✚";
  const booking = /^https:\/\/(?!example\.com)/i.test(p.booking_url || "");
  const bookingLink = booking
    ? `<a href="${escapeHtml(p.booking_url)}" target="_blank" rel="noopener noreferrer">Official booking page ↗</a>`
    : `<a href="#" class="booking-placeholder" data-provider="${escapeHtml(p.name)}">Booking details unavailable ↗</a>`;
  return `<article class="provider-card">
    <div class="provider-head">
      <div class="provider-icon">${icon}</div>
      <div><div class="provider-name">${escapeHtml(p.name)}</div><div class="provider-meta">${escapeHtml(p.category)} · ${escapeHtml(p.city)}</div></div>
      <span class="status-tag">${escapeHtml(p.cost_status)}</span>
    </div>
    <div class="price-row"><div><div class="price-label">Illustrative estimated range</div><div class="price-value">$${p.cost_min}–$${p.cost_max} <small>/ service</small></div></div><div class="source-note">${escapeHtml(p.cost_source)}<br>${escapeHtml(p.updated)}</div></div>
    <div class="provider-details">
      <div><div class="detail-label">INSURANCE NETWORK</div><div class="detail-value muted">${escapeHtml(p.network_status)}</div></div>
      <div><div class="detail-label">APPOINTMENT TIMING</div><div class="detail-value muted">${p.appointment ? escapeHtml(p.appointment) : "Not available to verify"}</div></div>
      <div><div class="detail-label">DISTANCE</div><div class="detail-value">${p.distance_miles} miles (sample)</div></div>
      <div><div class="detail-label">ORDER / REFERRAL</div><div class="detail-value muted">Confirm with provider</div></div>
    </div>
    <div class="provider-footer"><span class="verification">ⓘ Not verified for your plan</span>${bookingLink}</div>
  </article>`;
}

async function loadProviders() {
  const params = new URLSearchParams({
    q: document.getElementById("query").value.trim(),
    category: document.getElementById("category").value,
    sort: document.getElementById("sort").value,
    insurance: document.getElementById("insurance").value,
    plan: document.getElementById("plan").value.trim()
  });
  providerGrid.innerHTML = '<div class="loading">Finding matching sample providers…</div>';
  emptyState.classList.add("hidden");
  try {
    const response = await fetch(`/api/providers?${params.toString()}`);
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    providerGrid.innerHTML = data.results.map(providerCard).join("");
    resultCount.textContent = `${data.results.length} sample provider${data.results.length === 1 ? "" : "s"}`;
    resultSubtitle.textContent = "Demo data · Not verified";
    if (!data.results.length) emptyState.classList.remove("hidden");
    providerGrid.querySelectorAll(".booking-placeholder").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        alert(`No verified booking link is configured for ${link.dataset.provider}. Please search for the provider's official website.`);
      });
    });
  } catch (error) {
    providerGrid.innerHTML = '<div class="loading">Could not load providers. Check that the Flask server is running, then refresh.</div>';
    resultCount.textContent = "Unable to load";
  }
}

document.getElementById("search-form").addEventListener("submit", event => {
  event.preventDefault();
  loadProviders();
});
["category", "sort", "insurance"].forEach(id => document.getElementById(id).addEventListener("change", loadProviders));
document.getElementById("plan").addEventListener("change", loadProviders);

const chatMessages = document.getElementById("chat-messages");
function addMessage(text, who) {
  const message = document.createElement("div");
  message.className = `message ${who === "user" ? "user-message" : "bot-message"}`;
  if (who !== "user") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = "✳";
    message.appendChild(avatar);
  }
  const body = document.createElement("div");
  body.textContent = text;
  message.appendChild(body);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askAssistant(question) {
  addMessage(question, "user");
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({question})
    });
    const data = await response.json();
    addMessage(data.answer || "I couldn't prepare an answer just now.", "bot");
  } catch {
    addMessage("The assistant is temporarily unavailable. Please try again.", "bot");
  }
}
document.getElementById("chat-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  askAssistant(question);
});
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => askAssistant(button.dataset.prompt));
});
loadProviders();
