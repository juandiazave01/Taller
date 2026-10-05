/* =========================================================================
   dataService.js — the ONLY place the site reads or writes data.
   -------------------------------------------------------------------------
   PHASE 1: mock data kept in the browser's localStorage, so the site works
   on GitHub Pages with no server. Data is per-browser and per-device: a
   booking made on your phone will NOT show up in the admin panel on your
   laptop. This is for demo and testing only — never enter real customer
   data here.

   PHASE 2: replace the bodies of these functions with calls to the real
   backend (database + API). The function names and return shapes stay the
   same, so the rest of the site doesn't change.
   ========================================================================= */

const DataService = (() => {
  const KEY = "jm_demo_db_v1";

  const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);

  // Date `days` from today, moved back to the nearest day the shop is open
  function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    while (!Scheduler.hoursFor(Scheduler.toDateStr(d))) d.setDate(d.getDate() - 1);
    return Scheduler.toDateStr(d);
  }

  // Fake demo records so the admin panel and reminders have something to show.
  function seed() {
    const c1 = { id: "cus_demo1", name: "Maria Gonzalez", phone: "9195550111", email: "maria@example.com", consent: true };
    const c2 = { id: "cus_demo2", name: "Robert Lee", phone: "9195550122", email: "robert@example.com", consent: true };
    const c3 = { id: "cus_demo3", name: "Ana Torres", phone: "9195550133", email: "ana@example.com", consent: false };
    const v1 = { id: "veh_demo1", customerId: c1.id, type: "suv", make: "Toyota", model: "RAV4", year: 2019, mileage: 46800 };
    const v2 = { id: "veh_demo2", customerId: c2.id, type: "pickup", make: "Ford", model: "F-150", year: 2016, mileage: 88000 };
    const v3 = { id: "veh_demo3", customerId: c3.id, type: "hybrid", make: "Toyota", model: "Prius", year: 2015, mileage: 132500 };

    const appt = (o) => Object.assign({ id: uid("apt"), status: "scheduled", source: "online", notes: "" }, o);
    const nextOpen = Scheduler.nextOpenDates(2, { includeToday: false });

    return {
      customers: [c1, c2, c3],
      vehicles: [v1, v2, v3],
      appointments: [
        // History (completed) — drives the reminder calculation
        appt({ customerId: c1.id, vehicleId: v1.id, serviceIds: ["oil"], date: dateOffset(-150), start: 540, minutes: 30, resource: "lift", status: "completed", completedMileage: 41200 }),
        appt({ customerId: c1.id, vehicleId: v1.id, serviceIds: ["tires"], date: dateOffset(-20), start: 600, minutes: 60, resource: "lift", status: "completed", completedMileage: 46800 }),
        appt({ customerId: c2.id, vehicleId: v2.id, serviceIds: ["oil", "multipoint"], date: dateOffset(-176), start: 480, minutes: 75, resource: "lift", status: "completed", completedMileage: 88000, source: "walk-in" }),
        appt({ customerId: c3.id, vehicleId: v3.id, serviceIds: ["hybridBatt"], date: dateOffset(-60), start: 780, minutes: 60, resource: "ground", status: "completed", completedMileage: 132500 }),
        // Upcoming — shows capacity being used on the calendar
        appt({ customerId: c3.id, vehicleId: v3.id, serviceIds: ["hybridFilt"], date: nextOpen[0], start: 540, minutes: 30, resource: "ground" }),
        appt({ customerId: c2.id, vehicleId: v2.id, serviceIds: ["brakes"], date: nextOpen[0], start: 480, minutes: 120, resource: "lift" }),
        appt({ customerId: c1.id, vehicleId: v1.id, serviceIds: ["alignment"], date: nextOpen[1], start: 600, minutes: 60, resource: "lift" }),
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable or corrupted: fall through to seed */ }
    const db = seed();
    save(db);
    return db;
  }

  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore in demo */ }
  }

  const digits = (s) => String(s || "").replace(/\D/g, "");

  // ---- Public API (all async, to match a future network backend) ----------

  async function getAppointments(dateStr) {
    const db = load();
    return dateStr ? db.appointments.filter((a) => a.date === dateStr) : db.appointments.slice();
  }

  async function getCustomers() { return load().customers.slice(); }
  async function getVehicles() { return load().vehicles.slice(); }

  /**
   * Create a booking (online or walk-in).
   * payload: { customer:{name,phone,email,consent}, vehicle:{type,make,model,year,mileage},
   *            serviceIds, date, start, source, notes }
   * Re-checks availability before saving so two bookings can't take the same slot.
   */
  async function createBooking(payload) {
    const db = load();
    const sameDay = db.appointments.filter((a) => a.date === payload.date);
    const plan = Scheduler.planFor(payload.serviceIds);
    if (!Scheduler.fits(payload.start, plan, sameDay)) {
      throw new Error("That time was just taken. Please pick another slot.");
    }

    // Match existing customer by phone, otherwise create one
    let customer = db.customers.find((c) => digits(c.phone) === digits(payload.customer.phone));
    if (customer) {
      Object.assign(customer, payload.customer);
    } else {
      customer = Object.assign({ id: uid("cus") }, payload.customer);
      db.customers.push(customer);
    }

    // Match existing vehicle for this customer by make/model/year
    const pv = payload.vehicle;
    let vehicle = db.vehicles.find((v) => v.customerId === customer.id &&
      v.make.toLowerCase() === pv.make.toLowerCase() &&
      v.model.toLowerCase() === pv.model.toLowerCase() &&
      Number(v.year) === Number(pv.year));
    if (vehicle) {
      Object.assign(vehicle, pv);
    } else {
      vehicle = Object.assign({ id: uid("veh"), customerId: customer.id }, pv);
      db.vehicles.push(vehicle);
    }

    const appointment = {
      id: uid("apt"),
      customerId: customer.id,
      vehicleId: vehicle.id,
      serviceIds: payload.serviceIds.slice(),
      date: payload.date,
      start: payload.start,
      minutes: plan.minutes,
      resource: plan.resource,
      status: "scheduled",
      source: payload.source || "online",
      notes: payload.notes || "",
    };
    db.appointments.push(appointment);
    save(db);
    return appointment;
  }

  async function updateAppointment(id, changes) {
    const db = load();
    const a = db.appointments.find((x) => x.id === id);
    if (!a) throw new Error("Appointment not found.");
    Object.assign(a, changes);
    if (changes.completedMileage) {
      const v = db.vehicles.find((x) => x.id === a.vehicleId);
      if (v && Number(changes.completedMileage) > Number(v.mileage || 0)) v.mileage = Number(changes.completedMileage);
    }
    save(db);
    return a;
  }

  async function resetDemo() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return load();
  }

  return { getAppointments, getCustomers, getVehicles, createBooking, updateAppointment, resetDemo };
})();
