/* =========================================================================
   main.js — public page behavior
   ========================================================================= */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const B = CONFIG.business;
  const services = CONFIG.services;
  const svc = (id) => services.find((s) => s.id === id);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Service list shows no prices: only a "Free" or "Coming soon" tag where it applies
  function boardTag(s) {
    if (s.comingSoon) return "Coming soon";
    if (s.priceMin === 0 && s.priceMax === 0) return "Free";
    return "";
  }
  const duration = (m) => (m < 60 ? m + " min" : (m / 60) + (m === 60 ? " hr" : " hrs"));

  // ---------- Business info, hours, WhatsApp, map ----------
  function fillBusiness() {
    $$("[data-biz]").forEach((el) => { if (B[el.dataset.biz]) el.textContent = B[el.dataset.biz]; });
    $$("[data-biz-tel]").forEach((a) => (a.href = "tel:" + B.phoneLink));
    $$("[data-biz-mail]").forEach((a) => (a.href = "mailto:" + B.email));
    const waText = encodeURIComponent("Hola, quisiera información sobre un servicio para mi vehículo.");
    $$("[data-wa]").forEach((a) => (a.href = "https://wa.me/" + B.whatsappNumber + "?text=" + waText));
    $("#mapFrame").src = "https://www.google.com/maps?q=" + encodeURIComponent(B.mapQuery) + "&output=embed";
    $("#year").textContent = new Date().getFullYear();
    if (CONFIG.demoMode) { $("#demoBanner").hidden = false; $("#reviewsSampleTag").hidden = false; }

    // Hours text (groups consecutive days with the same hours)
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const t = (s) => Scheduler.fmtTime(+s.split(":")[0] * 60 + +s.split(":")[1]);
    const groups = [];
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
      const h = CONFIG.hours[d];
      const label = h ? t(h.open) + " – " + t(h.close) : "Closed";
      const g = groups[groups.length - 1];
      if (g && g.label === label) g.days.push(d); else groups.push({ label, days: [d] });
    });
    const lines = groups.map((g) => {
      const span = g.days.length > 1 ? names[g.days[0]] + " – " + names[g.days[g.days.length - 1]] : names[g.days[0]];
      return span + ": " + g.label;
    });
    $("#hoursFull").innerHTML = lines.map(esc).join("<br>");
    $("#hoursShort").textContent = lines[0];
  }

  // ---------- Service boards ----------
  function boardRow(s) {
    return `
      <div class="board-row${s.comingSoon ? " is-soon" : ""}">
        <div class="board-name"><strong>${esc(s.name)}</strong><span>${esc(s.desc)}</span></div>
        <div class="board-time">${s.comingSoon ? "" : duration(s.minutes)}</div>
        <div class="board-tag">${boardTag(s)}</div>
        <div class="board-act">${s.comingSoon ? "" : `<a href="#schedule" class="link-book" data-preselect="${s.id}">Book</a>`}</div>
      </div>`;
  }

  function renderBoards() {
    const groups = [
      { key: "maintenance", title: "Maintenance" },
      { key: "repair", title: "Repair" },
    ];
    $("#serviceBoard").innerHTML = groups.map((g) => `
      <div class="board-group">
        <h3>${g.title}</h3>
        ${services.filter((s) => s.group === g.key).map(boardRow).join("")}
      </div>`).join("");
    $("#hybridBoard").innerHTML = services.filter((s) => s.group === "hybrid").map(boardRow).join("");
  }

  // ---------- Shared form helpers ----------
  function fillVehicleTypes() {
    $$('select[name="type"]').forEach((sel) => {
      sel.innerHTML = '<option value="">Select…</option>' +
        CONFIG.vehicleTypes.map((v) => `<option value="${v.id}">${esc(v.label)}</option>`).join("");
    });
  }

  function servicePicks(container, name) {
    container.insertAdjacentHTML("beforeend", services.filter((s) => !s.comingSoon).map((s) => `
      <label class="pick">
        <input type="checkbox" name="${name}" value="${s.id}">
        <span class="pick-box">
          <span class="pick-name">${esc(s.name)}</span>
          ${boardTag(s) ? `<span class="pick-meta">${boardTag(s)}</span>` : ""}
        </span>
      </label>`).join(""));
  }

  const checked = (name) => $$(`input[name="${name}"]:checked`).map((i) => i.value);

  // ---------- Estimate ----------
  function updateEstimate() {
    const form = $("#estimateForm");
    const ids = checked("est-svc");
    const out = $("#estimateResult");
    if (!ids.length) { out.innerHTML = '<p class="muted">Select at least one service.</p>'; return; }

    const typeId = form.type.value;
    const factor = (CONFIG.vehicleTypes.find((v) => v.id === typeId) || { factor: 1 }).factor;
    let min = 0, max = 0, openEnded = false;
    const rows = ids.map((id) => {
      const s = svc(id);
      const lo = s.priceMin * factor;
      const hi = s.priceMax == null ? null : s.priceMax * factor;
      min += lo;
      if (hi == null) openEnded = true; else max += hi;
      const label = s.priceMin === 0 && s.priceMax === 0 ? "Free" : hi == null ? "From " + money(lo) : money(lo) + " – " + money(hi);
      return `<li><span>${esc(s.name)}</span><span>${label}</span></li>`;
    }).join("");

    const total = min === 0 && max === 0 && !openEnded ? "Free" : openEnded ? "From " + money(min) : money(min) + " – " + money(max);
    const vehicle = [form.year.value, form.make.value, form.model.value].filter(Boolean).join(" ");
    out.innerHTML = `
      <ul class="estimate-lines">${rows}</ul>
      <div class="estimate-total">
        <span>Estimated total${vehicle ? " for your " + esc(vehicle) : ""}</span>
        <strong>${total}</strong>
      </div>
      ${typeId ? "" : '<p class="muted">Choose your vehicle type for a more accurate range.</p>'}
      ${openEnded ? '<p class="muted">Repairs marked "from" are priced after we inspect the vehicle.</p>' : ""}
      <button type="button" class="btn" id="bookEstimate">Book these services</button>`;
    $("#bookEstimate").onclick = () => {
      preselect(ids);
      const bf = $("#bookingForm");
      ["type", "year", "make", "model"].forEach((f) => { if (form[f].value) bf[f].value = form[f].value; });
      $("#schedule").scrollIntoView({ behavior: "smooth" });
    };
  }

  // ---------- Booking ----------
  const state = { date: null, start: null };

  function preselect(ids) {
    $$('input[name="book-svc"]').forEach((i) => (i.checked = ids.includes(i.value)));
    onServicesChanged();
  }

  function onServicesChanged() {
    const ids = checked("book-svc");
    const sum = $("#planSummary");
    if (!ids.length) { sum.textContent = ""; }
    else {
      const p = Scheduler.planFor(ids);
      sum.textContent = "Estimated time: " + duration(p.minutes) + (p.resource === "lift" ? " (on a lift)" : "");
    }
    state.start = null;
    renderSlots();
  }

  function renderDays() {
    const days = Scheduler.nextOpenDates(Math.min(CONFIG.booking.daysAhead, 15));
    if (!state.date) state.date = days[0];
    $("#dayStrip").innerHTML = days.map((d) => {
      const dt = Scheduler.fromDateStr(d);
      return `<button type="button" role="radio" class="day${d === state.date ? " is-on" : ""}" aria-checked="${d === state.date}" data-date="${d}">
        <span>${dt.toLocaleDateString("en-US", { weekday: "short" })}</span>
        <strong>${dt.getDate()}</strong>
        <span>${dt.toLocaleDateString("en-US", { month: "short" })}</span>
      </button>`;
    }).join("");
    $$("#dayStrip .day").forEach((b) => b.addEventListener("click", () => {
      state.date = b.dataset.date; state.start = null; renderDays(); renderSlots();
    }));
  }

  async function renderSlots() {
    const grid = $("#slotGrid");
    const ids = checked("book-svc");
    if (!ids.length) { grid.innerHTML = '<p class="muted">Choose a service to see open times.</p>'; return; }
    const appts = await DataService.getAppointments(state.date);
    const slots = Scheduler.availableSlots(state.date, ids, appts);
    if (!slots.length) {
      grid.innerHTML = '<p class="muted">No open times this day for the selected services. Try another day.</p>';
      return;
    }
    grid.innerHTML = slots.map((t) =>
      `<button type="button" role="radio" class="slot${t === state.start ? " is-on" : ""}" aria-checked="${t === state.start}" data-t="${t}">${Scheduler.fmtTime(t)}</button>`).join("");
    $$("#slotGrid .slot").forEach((b) => b.addEventListener("click", () => {
      state.start = +b.dataset.t;
      $$("#slotGrid .slot").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", x === b); });
    }));
  }

  function validate(form) {
    const errs = [];
    const ids = checked("book-svc");
    if (!ids.length) errs.push("Choose at least one service.");
    if (state.start == null) errs.push("Pick a day and time.");
    const v = (n) => form[n].value.trim();
    if (!v("name")) errs.push("Enter your full name.");
    if (v("phone").replace(/\D/g, "").length < 10) errs.push("Enter a 10-digit phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) errs.push("Enter a valid email address.");
    if (!v("type")) errs.push("Choose your vehicle type.");
    if (!v("make") || !v("model")) errs.push("Enter your vehicle's make and model.");
    const y = +v("year"), maxY = new Date().getFullYear() + 1;
    if (!(y >= 1980 && y <= maxY)) errs.push("Enter a vehicle year between 1980 and " + maxY + ".");
    if (v("mileage") === "" || +v("mileage") < 0) errs.push("Enter your current mileage.");
    if (!form.consent.checked) errs.push("Check the box to agree to confirmations and reminders.");
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const errBox = $("#bookingError");
    const errs = validate(form);
    if (errs.length) {
      errBox.innerHTML = "<ul>" + errs.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
      errBox.hidden = false;
      return;
    }
    errBox.hidden = true;
    const ids = checked("book-svc");
    try {
      await DataService.createBooking({
        customer: { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(), consent: true },
        vehicle: { type: form.type.value, make: form.make.value.trim(), model: form.model.value.trim(), year: +form.year.value, mileage: +form.mileage.value },
        serviceIds: ids, date: state.date, start: state.start, source: "online", notes: form.notes.value.trim(),
      });
    } catch (err) {
      errBox.textContent = err.message; errBox.hidden = false; state.start = null; renderSlots(); return;
    }
    $("#confirmText").textContent =
      `${ids.map((id) => svc(id).name).join(", ")} on ${Scheduler.fmtDate(state.date, "long")} at ${Scheduler.fmtTime(state.start)}. ` +
      `We'll confirm by text or email. Need to change it? Call ${B.phoneDisplay}.`;
    form.hidden = true;
    const conf = $("#bookingConfirm");
    conf.hidden = false; conf.focus();
    form.reset(); state.start = null;
    renderNextOpenings();
  }

  // ---------- Hero: next openings ----------
  async function nextFor(resource) {
    const probe = resource === "lift" ? ["oil"] : ["multipoint"];
    for (const d of Scheduler.nextOpenDates(CONFIG.booking.daysAhead)) {
      const slots = Scheduler.availableSlots(d, probe, await DataService.getAppointments(d));
      if (slots.length) {
        const today = Scheduler.toDateStr(new Date());
        const dayLabel = d === today ? "Today" : Scheduler.fmtDate(d);
        return dayLabel + ", " + Scheduler.fmtTime(slots[0]);
      }
    }
    return "Call us";
  }

  async function renderNextOpenings() {
    $("#nextLift").textContent = await nextFor("lift");
    $("#nextGround").textContent = await nextFor("ground");
  }

  // ---------- Reviews ----------
  function renderReviews() {
    $("#reviewList").innerHTML = CONFIG.reviews.map((r) => `
      <figure class="review">
        <div class="stars" aria-label="${r.rating} out of 5 stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <blockquote>${esc(r.text)}</blockquote>
        <figcaption>${esc(r.name)}</figcaption>
      </figure>`).join("");
  }

  // ---------- Init ----------
  function init() {
    fillBusiness();
    renderBoards();
    fillVehicleTypes();
    renderReviews();

    servicePicks($("#estimateServices"), "est-svc");
    $("#estimateForm").addEventListener("input", updateEstimate);
    $("#estimateForm").addEventListener("change", updateEstimate);

    servicePicks($("#bookingServices"), "book-svc");
    $("#bookingServices").addEventListener("change", onServicesChanged);
    renderDays();
    renderSlots();
    $("#bookingForm").addEventListener("submit", onSubmit);
    $("#bookAnother").addEventListener("click", () => {
      $("#bookingConfirm").hidden = true; $("#bookingForm").hidden = false; onServicesChanged();
    });

    // "Book" links preselect a service
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-preselect]");
      if (a) preselect([a.dataset.preselect]);
    });

    renderNextOpenings();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
