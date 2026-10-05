/* =========================================================================
   reminders.js — when is each vehicle due for its next service?
   -------------------------------------------------------------------------
   Mileage between visits is unknown, so it is ESTIMATED:
   - 1 completed visit  -> time-based reminder only.
   - 2+ completed visits -> average miles/day from the history, project the
     current mileage, and use whichever trigger (time or miles) comes first.
   Phase 2: an AI step can refine this per customer and send the reminders.
   ========================================================================= */

const Reminders = (() => {
  function compute(vehicles, customers, appointments) {
    const today = Scheduler.toDateStr(new Date());
    const R = CONFIG.reminders;
    const out = [];

    vehicles.forEach((v) => {
      const history = appointments
        .filter((a) => a.vehicleId === v.id && a.status === "completed" && a.completedMileage)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!history.length) return;

      const first = history[0];
      const last = history[history.length - 1];
      const daysSince = Scheduler.daysBetween(last.date, today);
      const daysUntilTime = R.intervalDays - daysSince;

      let basis = "time";
      let daysUntil = daysUntilTime;
      let milesPerDay = null;
      let projectedMiles = null;

      const spanDays = Scheduler.daysBetween(first.date, last.date);
      const spanMiles = last.completedMileage - first.completedMileage;
      if (history.length >= 2 && spanDays > 0 && spanMiles > 0) {
        milesPerDay = spanMiles / spanDays;
        projectedMiles = Math.round(last.completedMileage + milesPerDay * daysSince);
        const daysUntilMiles = Math.round((R.intervalMiles - milesPerDay * daysSince) / milesPerDay);
        if (daysUntilMiles < daysUntil) { daysUntil = daysUntilMiles; basis = "mileage"; }
      }

      const status = daysUntil <= 0 ? "overdue" : daysUntil <= R.dueSoonDays ? "due-soon" : "ok";
      const customer = customers.find((c) => c.id === v.customerId) || {};
      out.push({ vehicle: v, customer, lastService: last, daysSince, daysUntil, basis, milesPerDay, projectedMiles, status });
    });

    const rank = { overdue: 0, "due-soon": 1, ok: 2 };
    return out.sort((a, b) => rank[a.status] - rank[b.status] || a.daysUntil - b.daysUntil);
  }

  return { compute };
})();
