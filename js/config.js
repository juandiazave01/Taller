/* =========================================================================
   JM Automotive — site configuration
   -------------------------------------------------------------------------
   This is the ONE file to edit for business details, hours, capacity,
   services, durations and prices. Everything marked PLACEHOLDER must be
   replaced with real data before launch.
   ========================================================================= */

const CONFIG = {
  // Demo mode shows a small banner and labels sample content.
  // Set to false only when all placeholders are replaced with real data.
  demoMode: true,

  business: {
    name: "JM Automotive",                       // PLACEHOLDER (name not final)
    tagline: "Honest auto repair in Oxford, NC",  // PLACEHOLDER
    phoneDisplay: "(919) 555-0100",              // PLACEHOLDER
    phoneLink: "+19195550100",                   // PLACEHOLDER
    whatsappNumber: "19195550100",               // PLACEHOLDER (digits only, with country code)
    email: "service@jmautomotive.example",       // PLACEHOLDER
    addressLine1: "123 Main Street",             // PLACEHOLDER
    addressLine2: "Oxford, NC 27565",
    mapQuery: "Oxford, NC 27565",                // Used for the embedded map
  },

  // Opening hours. Days: 0 = Sunday ... 6 = Saturday. Times in 24h "HH:MM".
  hours: {
    1: { open: "08:00", close: "17:00" },
    2: { open: "08:00", close: "17:00" },
    3: { open: "08:00", close: "17:00" },
    4: { open: "08:00", close: "17:00" },
    5: { open: "08:00", close: "17:00" },
    // Saturday (6) and Sunday (0) closed
  },

  // Shop capacity
  capacity: {
    lift: 2,         // vehicles on a lift at the same time
    ground: 4,       // parking-lot spots for work that doesn't need a lift
    technicians: 2,  // max jobs in progress at the same time
  },

  booking: {
    slotStepMinutes: 30,   // spacing between bookable start times
    leadTimeMinutes: 60,   // customers can't book a slot starting sooner than this
    daysAhead: 21,         // how far ahead customers can book
  },

  // Price adjustment by vehicle type (multiplies labor + parts estimate)
  vehicleTypes: [
    { id: "sedan",   label: "Sedan",              factor: 1.0  },
    { id: "coupe",   label: "Coupe / Hatchback",  factor: 1.0  },
    { id: "suv",     label: "SUV / Crossover",    factor: 1.15 },
    { id: "pickup",  label: "Pickup truck",       factor: 1.2  },
    { id: "van",     label: "Minivan / Van",      factor: 1.15 },
    { id: "hybrid",  label: "Hybrid",             factor: 1.1  },
    { id: "ev",      label: "Electric (EV)",      factor: 1.1  },
  ],

  // Services. resource: "lift" or "ground".
  // priceMin / priceMax in USD — ALL PRICES ARE PLACEHOLDER SAMPLES.
  // priceMax: null means "from $X" (final price after inspection).
  services: [
    { id: "oil",        name: "Oil change",                  group: "maintenance", resource: "lift",   minutes: 30,  priceMin: 45,  priceMax: 95,
      desc: "Conventional or synthetic oil, new filter, fluid top-off." },
    { id: "brakes",     name: "Brake service",               group: "repair",      resource: "lift",   minutes: 120, priceMin: 150, priceMax: 350,
      desc: "Pads and rotors per axle, caliper check, brake fluid inspection." },
    { id: "tires",      name: "Tire service",                group: "maintenance", resource: "lift",   minutes: 60,  priceMin: 40,  priceMax: 120,
      desc: "Mount, balance, rotation and flat repair." },
    { id: "alignment",  name: "Wheel alignment",             group: "maintenance", resource: "lift",   minutes: 60,  priceMin: 90,  priceMax: 150,
      desc: "Computerized four-wheel alignment on our own machine." },
    { id: "mechanical", name: "General mechanical repair",   group: "repair",      resource: "lift",   minutes: 120, priceMin: 110, priceMax: null,
      desc: "Suspension, steering, belts, hoses, cooling system and more." },
    { id: "diagnostic", name: "Diagnostics",                 group: "repair",      resource: "ground", minutes: 60,  priceMin: 90,  priceMax: 150,
      desc: "Check-engine light and electrical faults, with a clear report." },
    { id: "ac",         name: "A/C service",                 group: "repair",      resource: "ground", minutes: 90,  priceMin: 150, priceMax: 300,
      desc: "Leak check, performance test and refrigerant recharge." },
    { id: "hybridBatt", name: "Hybrid battery check",        group: "hybrid",      resource: "ground", minutes: 60,  priceMin: 90,  priceMax: 150,
      desc: "Health test of the high-voltage battery and its cooling system." },
    { id: "hybridFilt", name: "Hybrid battery cooling filter", group: "hybrid",    resource: "ground", minutes: 30,  priceMin: 60,  priceMax: 120,
      desc: "Replace the battery cooling filter so the pack doesn't overheat." },
    { id: "multipoint", name: "Multi-point inspection",      group: "maintenance", resource: "ground", minutes: 45,  priceMin: 40,  priceMax: 60,
      desc: "Full visual inspection with a written report." },
    { id: "freecheck",  name: "Free vehicle check",          group: "free",        resource: "ground", minutes: 30,  priceMin: 0,   priceMax: 0,
      desc: "Brakes, tires, fluids, battery and lights. No charge, no obligation." }, // PLACEHOLDER scope
    { id: "stateinsp",  name: "NC State Inspection",         group: "maintenance", resource: "ground", minutes: 30,  priceMin: null, priceMax: null,
      desc: "Safety and emissions inspection.", comingSoon: true }, // Enable when NCDMV license is granted
  ],

  // Maintenance reminder rules (sample values — adjust per service later)
  reminders: {
    intervalDays: 180,     // remind 6 months after last service...
    intervalMiles: 5000,   // ...or after 5,000 estimated miles, whichever comes first
    dueSoonDays: 14,       // flag as "due soon" this many days before
  },

  // Sample reviews — PLACEHOLDER. Must be replaced with real customer
  // reviews (or removed) before launch. Publishing invented reviews as
  // real ones is not allowed under US consumer protection rules.
  reviews: [
    { name: "Maria G.", text: "They explained exactly what my car needed and the price matched the online estimate.", rating: 5 },
    { name: "Robert L.", text: "Booked an oil change online, was in and out in under an hour.", rating: 5 },
    { name: "Carlos R.", text: "Me atendieron en español por WhatsApp y me ayudaron con la batería de mi híbrido.", rating: 5 },
  ],

  admin: {
    // DEMO ONLY. This password is visible in the page source and gives NO
    // real protection. Replace with real authentication in Phase 2.
    demoPassword: "jm-demo",
  },
};
