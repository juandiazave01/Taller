/* =========================================================================
   scheduler.js — availability logic
   -------------------------------------------------------------------------
   A start time is offered only if, for the whole duration of the job:
     1. a spot of the right type is free (lift or ground), and
     2. a technician is free (max CONFIG.capacity.technicians jobs at once).
   Times are minutes after midnight (480 = 8:00 AM). Dates are "YYYY-MM-DD".
   ========================================================================= */

const Scheduler = (() => {
  const pad = (n) => String(n).padStart(2, "0");

  function toDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fromDateStr(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const hm = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

  function hoursFor(dateStr) {
    const h = CONFIG.hours[fromDateStr(dateStr).getDay()];
    return h ? { open: hm(h.open), close: hm(h.close) } : null;
  }

  function nowMinutes() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

  /** Next n dates the shop is open. */
  function nextOpenDates(n, opts = {}) {
    const out = [];
    const d = new Date();
    if (opts.includeToday === false) d.setDate(d.getDate() + 1);
    let guard = 0;
    while (out.length < n && guard++ < 120) {
      const s = toDateStr(d);
      if (hoursFor(s)) out.push(s);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  /** Total time and spot type for a set of services. Any lift service puts the whole job on a lift. */
  function planFor(serviceIds) {
    const list = CONFIG.services.filter((s) => serviceIds.includes(s.id));
    const minutes = list.reduce((sum, s) => sum + s.minutes, 0);
    const resource = list.some((s) => s.resource === "lift") ? "lift" : "ground";
    return { minutes, resource };
  }

  const active = (a) => a.status !== "cancelled";

  /** Does a job of this plan fit at this start time, given the day's appointments? */
  function fits(start, plan, dayAppts) {
    const end = start + plan.minutes;
    const jobs = dayAppts.filter(active);
    const cap = CONFIG.capacity;
    // Check every 5 minutes inside the window (covers any overlap pattern)
    for (let t = start; t < end; t += 5) {
      const running = jobs.filter((a) => a.start <= t && t < a.start + a.minutes);
      if (running.length >= cap.technicians) return false;
      const sameType = running.filter((a) => a.resource === plan.resource).length;
      if (sameType >= cap[plan.resource]) return false;
    }
    return true;
  }

  /**
   * Bookable start times for a date and set of services.
   * opts.leadMinutes overrides the booking lead time (walk-ins use 0).
   */
  function availableSlots(dateStr, serviceIds, dayAppts, opts = {}) {
    const hours = hoursFor(dateStr);
    if (!hours || !serviceIds.length) return [];
    const plan = planFor(serviceIds);
    const step = CONFIG.booking.slotStepMinutes;
    const lead = opts.leadMinutes ?? CONFIG.booking.leadTimeMinutes;
    const isToday = dateStr === toDateStr(new Date());
    const earliest = isToday ? nowMinutes() + lead - (lead === 0 ? step - 1 : 0) : -1;

    const slots = [];
    for (let t = hours.open; t + plan.minutes <= hours.close; t += step) {
      if (isToday && t < earliest) continue;
      if (fits(t, plan, dayAppts)) slots.push(t);
    }
    return slots;
  }

  function fmtTime(min) {
    const h = Math.floor(min / 60), m = min % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return h12 + ":" + pad(m) + " " + ampm;
  }

  function fmtDate(dateStr, style = "short") {
    const d = fromDateStr(dateStr);
    return style === "long"
      ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function daysBetween(aStr, bStr) {
    return Math.round((fromDateStr(bStr) - fromDateStr(aStr)) / 86400000);
  }

  return { toDateStr, fromDateStr, hoursFor, nextOpenDates, planFor, fits, availableSlots, fmtTime, fmtDate, daysBetween };
})();
