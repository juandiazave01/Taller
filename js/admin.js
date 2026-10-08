/* =========================================================================
   admin.js — staff panel (Phase 1 demo)
   SECURITY NOTE: the password check below runs in the browser and is NOT
   real protection. Phase 2 must replace it with server-side authentication.
   ========================================================================= */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svcName = (id) => (CONFIG.services.find((s) => s.id === id) || { name: id }).name;
  const typeLabel = (id) => (CONFIG.vehicleTypes.find((v) => v.id === id) || { label: id }).label;
  const today = () => Scheduler.toDateStr(new Date());
  const fmtPhone = (p) => { const d = String(p).replace(/\D/g, "").slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };
  const SESSION = "jm_staff_session";

  $$("[data-biz]").forEach((el) => (el.textContent = CONFIG.business[el.dataset.biz] || el.textContent));

  // ---------- Login (demo) ----------
  function renderTools() {
    $("#staffTools").innerHTML = (CONFIG.admin.tools || []).map((t) => `
      <a class="btn btn-small" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" title="${esc(t.desc)}">${esc(t.label)} ↗</a>
      <span class="muted">${esc(t.desc)}</span>`).join("");
  }
  function showApp() {
    $("#loginForm").hidden = true; $("#app").hidden = false; $("#logout").hidden = false;
    renderTools();
    initApp();
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let ok = false;
    try { ok = (await sha256(e.target.pw.value)) === CONFIG.admin.passwordSha256; } catch (_) {}
    if (ok) {
      try { sessionStorage.setItem(SESSION, "1"); } catch (_) {}
      showApp();
    } else { $("#loginError").hidden = false; }
  });
  $("#logout").addEventListener("click", () => { try { sessionStorage.removeItem(SESSION); } catch (_) {} location.reload(); });

  // ---------- Tabs ----------
  function showTab(name) {
    $$(".tab").forEach((t) => { const on = t.dataset.tab === name; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on); });
    $$(".tab-panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
    ({ schedule: renderSchedule, walkin: renderWalkinSlots, customers: renderCustomers, reminders: renderReminders })[name]();
  }

  // ---------- Schedule ----------
  async function renderSchedule() {
    const date = $("#schedDate").value || today();
    const [appts, customers, vehicles] = await Promise.all([DataService.getAppointments(date), DataService.getCustomers(), DataService.getVehicles()]);
    const hours = Scheduler.hoursFor(date);
    const active = appts.filter((a) => a.status !== "cancelled");
    const freeLift = Scheduler.availableSlots(date, ["oil"], appts, { leadMinutes: 0 }).length;
    const freeGround = Scheduler.availableSlots(date, ["multipoint"], appts, { leadMinutes: 0 }).length;

    $("#capacity").innerHTML = hours
      ? `<span><strong>${active.length}</strong> jobs</span>
         <span><strong>${active.filter((a) => a.resource === "lift").length}</strong> on lifts</span>
         <span><strong>${freeLift}</strong> open lift starts</span>
         <span><strong>${freeGround}</strong> open quick-check starts</span>`
      : "<span>Shop closed this day</span>";

    if (!appts.length) { $("#apptList").innerHTML = '<p class="muted">No appointments this day. Walk-ins can be added from the Walk-in tab.</p>'; return; }

    $("#apptList").innerHTML = appts.sort((a, b) => a.start - b.start).map((a) => {
      const c = customers.find((x) => x.id === a.customerId) || {};
      const v = vehicles.find((x) => x.id === a.vehicleId) || {};
      return `
        <article class="appt status-${a.status}">
          <div class="appt-time">${Scheduler.fmtTime(a.start)}<span>to ${Scheduler.fmtTime(a.start + a.minutes)}</span></div>
          <div class="appt-body">
            <strong>${esc(c.name)}</strong> <a href="tel:${esc(c.phone)}">${esc(fmtPhone(c.phone))}</a>
            <div>${esc(v.year)} ${esc(v.make)} ${esc(v.model)} · ${esc(typeLabel(v.type))}</div>
            <div class="muted">${a.serviceIds.map(svcName).map(esc).join(", ")}</div>
            ${a.notes ? `<div class="muted">Note: ${esc(a.notes)}</div>` : ""}
          </div>
          <div class="appt-tags">
            <span class="tag">${a.resource === "lift" ? "Lift" : "Ground"}</span>
            <span class="tag">${a.source === "walk-in" ? "Walk-in" : "Online"}</span>
            <span class="tag tag-status">${a.status}${a.completedMileage ? " · " + Number(a.completedMileage).toLocaleString() + " mi" : ""}</span>
          </div>
          <div class="appt-actions">
            ${a.status === "scheduled" ? `
              <button class="btn btn-small" data-complete="${a.id}" data-miles="${esc(v.mileage)}">Mark completed</button>
              <button class="btn btn-ghost btn-small" data-cancel="${a.id}">Cancel</button>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  async function onScheduleClick(e) {
    const done = e.target.closest("[data-complete]");
    const cancel = e.target.closest("[data-cancel]");
    if (done) {
      const miles = prompt("Mileage at completion (miles):", done.dataset.miles || "");
      if (miles === null) return;
      const n = Number(String(miles).replace(/\D/g, ""));
      if (!n) { alert("Enter the mileage as a number."); return; }
      await DataService.updateAppointment(done.dataset.complete, { status: "completed", completedMileage: n });
      renderSchedule();
    }
    if (cancel && confirm("Cancel this appointment? The time will open up on the public calendar.")) {
      await DataService.updateAppointment(cancel.dataset.cancel, { status: "cancelled" });
      renderSchedule();
    }
  }

  // ---------- Walk-in ----------
  const walkin = { start: null };
  const walkinIds = () => $$('input[name="walk-svc"]:checked').map((i) => i.value);

  async function renderWalkinSlots() {
    const form = $("#walkinForm");
    const ids = walkinIds();
    const date = form.date.value || today();
    walkin.start = null;
    $("#walkinPlan").textContent = ids.length ? "Estimated time: " + Scheduler.planFor(ids).minutes + " min" : "";
    if (!ids.length) { $("#walkinSlots").innerHTML = '<p class="muted">Choose services to see open start times.</p>'; return; }
    const slots = Scheduler.availableSlots(date, ids, await DataService.getAppointments(date), { leadMinutes: 0 });
    $("#walkinSlots").innerHTML = slots.length
      ? slots.map((t) => `<button type="button" class="slot" data-t="${t}">${Scheduler.fmtTime(t)}</button>`).join("")
      : '<p class="muted">No capacity left for these services on this day.</p>';
  }

  async function onWalkinSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const err = $("#walkinError");
    const ids = walkinIds();
    const v = (n) => f[n].value.trim();
    const errs = [];
    if (!ids.length) errs.push("Choose at least one service.");
    if (walkin.start == null) errs.push("Pick a start time.");
    if (!v("name")) errs.push("Enter the customer's name.");
    if (v("phone").replace(/\D/g, "").length < 10) errs.push("Enter a 10-digit phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) errs.push("Enter a valid email.");
    if (!v("type") || !v("make") || !v("model") || !v("year") || v("mileage") === "") errs.push("Complete all vehicle fields.");
    if (errs.length) { err.innerHTML = "<ul>" + errs.map((x) => `<li>${esc(x)}</li>`).join("") + "</ul>"; err.hidden = false; return; }
    err.hidden = true;
    try {
      await DataService.createBooking({
        customer: { name: v("name"), phone: v("phone"), email: v("email"), consent: f.consent.checked },
        vehicle: { type: v("type"), make: v("make"), model: v("model"), year: +v("year"), mileage: +v("mileage") },
        serviceIds: ids, date: v("date") || today(), start: walkin.start, source: "walk-in", notes: v("notes"),
      });
    } catch (ex) { err.textContent = ex.message; err.hidden = false; renderWalkinSlots(); return; }
    const ok = $("#walkinOk");
    ok.textContent = `Walk-in saved for ${v("name")} at ${Scheduler.fmtTime(walkin.start)}. The public calendar is updated.`;
    ok.hidden = false;
    f.reset(); f.date.value = today();
    renderWalkinSlots();
  }

  // ---------- Customers ----------
  async function renderCustomers() {
    const q = $("#custSearch").value.trim().toLowerCase();
    const [customers, vehicles, appts] = await Promise.all([DataService.getCustomers(), DataService.getVehicles(), DataService.getAppointments()]);
    const rows = customers.filter((c) => {
      if (!q) return true;
      const vs = vehicles.filter((v) => v.customerId === c.id).map((v) => v.make + " " + v.model).join(" ");
      return (c.name + " " + c.phone + " " + c.email + " " + vs).toLowerCase().includes(q);
    });
    if (!rows.length) { $("#custList").innerHTML = '<p class="muted">No customers match that search.</p>'; return; }
    $("#custList").innerHTML = rows.map((c) => {
      const vs = vehicles.filter((v) => v.customerId === c.id);
      return `
        <article class="cust">
          <header>
            <h3>${esc(c.name)}</h3>
            <span><a href="tel:${esc(c.phone)}">${esc(fmtPhone(c.phone))}</a> · <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span>
            <span class="tag">${c.consent ? "Reminders allowed" : "No reminders"}</span>
          </header>
          ${vs.map((v) => {
            const hist = appts.filter((a) => a.vehicleId === v.id && a.status !== "cancelled").sort((a, b) => (a.date < b.date ? 1 : -1));
            return `
              <div class="veh">
                <strong>${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</strong>
                <span class="muted">${esc(typeLabel(v.type))} · ${Number(v.mileage || 0).toLocaleString()} mi</span>
                <ul>${hist.map((a) => `<li>${Scheduler.fmtDate(a.date)}: ${a.serviceIds.map(svcName).map(esc).join(", ")} <span class="muted">(${a.status}${a.completedMileage ? ", " + Number(a.completedMileage).toLocaleString() + " mi" : ""})</span></li>`).join("") || '<li class="muted">No services yet</li>'}</ul>
              </div>`;
          }).join("")}
        </article>`;
    }).join("");
  }

  // ---------- Reminders ----------
  async function renderReminders() {
    const R = CONFIG.reminders;
    $("#reminderRule").textContent =
      `Rule: next service ${R.intervalDays} days or ${R.intervalMiles.toLocaleString()} miles after the last one, whichever comes first. ` +
      `Mileage is estimated from each vehicle's history (needs 2+ completed visits). Automatic sending comes in Phase 2.`;
    const [customers, vehicles, appts] = await Promise.all([DataService.getCustomers(), DataService.getVehicles(), DataService.getAppointments()]);
    const list = Reminders.compute(vehicles, customers, appts);
    if (!list.length) { $("#reminderList").innerHTML = '<p class="muted">No completed services yet. Reminders appear after a job is marked completed.</p>'; return; }
    const statusText = { overdue: "Overdue", "due-soon": "Due soon", ok: "On track" };
    $("#reminderList").innerHTML = `
      <div class="table-wrap"><table class="rem-table">
        <thead><tr><th>Status</th><th>Customer</th><th>Vehicle</th><th>Last service</th><th>Based on</th><th>Due</th></tr></thead>
        <tbody>${list.map((r) => `
          <tr class="rem-${r.status}">
            <td><span class="tag tag-${r.status}">${statusText[r.status]}</span></td>
            <td>${esc(r.customer.name)}<br><a href="tel:${esc(r.customer.phone)}">${esc(fmtPhone(r.customer.phone))}</a>${r.customer.consent ? "" : '<br><span class="muted">No consent: call only</span>'}</td>
            <td>${esc(r.vehicle.year)} ${esc(r.vehicle.make)} ${esc(r.vehicle.model)}</td>
            <td>${Scheduler.fmtDate(r.lastService.date)}<br><span class="muted">${Number(r.lastService.completedMileage).toLocaleString()} mi</span></td>
            <td>${r.basis === "mileage"
                ? `Mileage<br><span class="muted">~${Math.round(r.milesPerDay)} mi/day, now ~${r.projectedMiles.toLocaleString()} mi</span>`
                : `Time<br><span class="muted">${r.milesPerDay ? "~" + Math.round(r.milesPerDay) + " mi/day" : "1 visit, no mileage trend yet"}</span>`}</td>
            <td>${r.daysUntil <= 0 ? Math.abs(r.daysUntil) + " days ago" : "in " + r.daysUntil + " days"}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>`;
  }

  // ---------- Init ----------
  let started = false;
  function initApp() {
    if (started) return; started = true;
    $("#schedDate").value = today();
    $("#schedDate").addEventListener("change", renderSchedule);
    $("#apptList").addEventListener("click", onScheduleClick);
    $$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

    const wf = $("#walkinForm");
    $("#walkinServices").insertAdjacentHTML("beforeend", CONFIG.services.filter((s) => !s.comingSoon).map((s) => `
      <label class="pick"><input type="checkbox" name="walk-svc" value="${s.id}"><span class="pick-box"><span class="pick-name">${esc(s.name)}</span><span class="pick-meta">${s.minutes} min · ${s.resource === "lift" ? "Lift" : "Ground"}</span></span></label>`).join(""));
    wf.type.innerHTML = '<option value="">Select…</option>' + CONFIG.vehicleTypes.map((v) => `<option value="${v.id}">${esc(v.label)}</option>`).join("");
    wf.date.value = today();
    $("#walkinServices").addEventListener("change", renderWalkinSlots);
    wf.date.addEventListener("change", renderWalkinSlots);
    $("#walkinSlots").addEventListener("click", (e) => {
      const b = e.target.closest(".slot"); if (!b) return;
      walkin.start = +b.dataset.t;
      $$("#walkinSlots .slot").forEach((x) => x.classList.toggle("is-on", x === b));
    });
    wf.addEventListener("submit", onWalkinSubmit);

    $("#custSearch").addEventListener("input", renderCustomers);
    $("#resetDemo").addEventListener("click", async () => {
      if (!confirm("Reset all demo data in this browser? Test bookings will be erased.")) return;
      await DataService.resetDemo(); showTab("schedule");
    });

    renderSchedule();
  }

  let signedIn = false;
  try { signedIn = sessionStorage.getItem(SESSION) === "1"; } catch (_) {}
  if (signedIn) showApp();
})();
