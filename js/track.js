/* =========================================================================
   track.js — customer repair status page
   Shows only the vehicle, services and stage for a ticket code.
   ========================================================================= */

(() => {
  const $ = (sel) => document.querySelector(sel);
  const B = CONFIG.business;
  const STAGES = CONFIG.repairStages;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svcName = (id) => (CONFIG.services.find((s) => s.id === id) || { name: id }).name;
  const stageText = (s) => s.label + (s.id.startsWith("work-") ? " " + s.pct + "%" : "");
  const when = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  document.querySelectorAll("[data-biz]").forEach((el) => { if (B[el.dataset.biz]) el.textContent = B[el.dataset.biz]; });
  document.querySelectorAll("[data-biz-tel]").forEach((a) => (a.href = "tel:" + B.phoneLink));
  document.querySelectorAll("[data-wa]").forEach((a) => (a.href = "https://wa.me/" + B.whatsappNumber));
  $("#year").textContent = new Date().getFullYear();
  if (CONFIG.demoMode) $("#demoBanner").hidden = false;

  async function show(code) {
    const err = $("#trackError");
    err.hidden = true;
    const st = code ? await DataService.getPublicStatus(code) : null;
    if (!st) {
      $("#trackResult").hidden = true;
      err.textContent = code
        ? "We couldn't find that code. Check the letters on your ticket and try again, or call the shop."
        : "Enter the code printed on your ticket.";
      err.hidden = false;
      return;
    }
    const idx = Math.max(0, STAGES.findIndex((s) => s.id === st.stage));
    const cur = STAGES[idx];
    const reached = {};
    st.history.forEach((h) => { reached[h.stage] = h.at; });

    $("#trVehicle").textContent = [st.vehicle.year, st.vehicle.make, st.vehicle.model].filter(Boolean).join(" ");
    $("#trCode").textContent = "Ticket " + st.code;
    $("#trPct").textContent = st.closed ? "Done" : cur.pct + "%";
    $("#trLabel").textContent = st.closed ? "Picked up. Thank you!" : stageText(cur);
    $("#trBar").style.width = (st.closed ? 100 : cur.pct) + "%";
    $("#trStages").innerHTML = STAGES.map((s, i) => `
      <li class="${i < idx || st.closed ? "is-done" : i === idx ? "is-now" : ""}">
        <span class="dot" aria-hidden="true"></span>
        <span>${esc(stageText(s))}</span>
        <time>${i <= idx && reached[s.id] ? esc(when(reached[s.id])) : ""}</time>
      </li>`).join("");
    $("#trServices").textContent = st.serviceIds.length ? "Services: " + st.serviceIds.map(svcName).join(", ") : "";
    $("#staffLink").href = "admin.html?t=" + encodeURIComponent(st.code);
    $("#trackResult").hidden = false;
  }

  $("#trackForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = DataService.normCode($("#trackCode").value);
    if (code) { $("#trackCode").value = code; history.replaceState(null, "", "?t=" + encodeURIComponent(code)); }
    show(code);
  });

  const fromUrl = new URLSearchParams(location.search).get("t");
  if (fromUrl) { $("#trackCode").value = DataService.normCode(fromUrl); show(DataService.normCode(fromUrl)); }
})();
