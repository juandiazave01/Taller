# JM Automotive — Website (Phase 1)

Single-page website for an independent auto repair shop in Oxford, NC.
"JM Automotive" is a placeholder name.

Customers can:
- See services with estimated price ranges
- Get an online estimate for their vehicle
- Book a service from real-time availability (only open times are shown)
- Contact the shop on WhatsApp in Spanish

Staff can (admin.html):
- See the day's schedule and capacity, mark jobs completed or cancelled
- Register walk-ins (they block the public calendar immediately)
- Browse customers, vehicles and service history
- See which vehicles are due for maintenance reminders

## Phase 1 status: demo only

Everything runs in the browser. There is no server or database yet.

- Data is stored in the browser's localStorage, so it exists only on the
  device and browser where it was entered. **Do not enter real customer data.**
- The staff password is in `js/config.js` and is visible to anyone. It is a
  placeholder, not security.
- Prices, contact details, reviews and images are samples (see the
  placeholder list below).

Phase 2 will connect a real backend (database, staff login, automated
reminders). All data access is isolated in `js/dataService.js`, so only that
file needs to change.

## Project structure

```
index.html               Public single-page site
admin.html               Staff panel (demo)
privacy.html             Privacy policy (draft placeholder text)
style.css                All styles
js/config.js             EDIT HERE: business info, hours, capacity, services, prices
js/scheduler.js          Availability logic (hours, lifts, ground spots, technicians)
js/dataService.js        Data layer (mock now, real backend in Phase 2)
js/reminders.js          Maintenance reminder calculation
js/main.js               Public page behavior
js/admin.js              Staff panel behavior
assets/img/              Sample images (replace with real photos)
.github/workflows/static.yml   Deploys to GitHub Pages on push to main
```

## How booking availability works

Capacity (in `js/config.js`): 2 lifts, 4 ground spots, 2 technicians,
Monday to Friday 8:00 AM to 5:00 PM.

Each service has a duration and a spot type (lift or ground). A start time
is offered only if, for the whole job, a spot of the right type is free and
a technician is free. With 2 technicians, at most 2 jobs run at once. If a
booking includes any lift service, the whole job is placed on a lift. Jobs
must finish by closing time.

## How reminders work

Each completed job stores its date and mileage. The next service is due
after 180 days or 5,000 miles, whichever comes first (sample values in
`CONFIG.reminders`).

Mileage between visits isn't known, so it's estimated:
- 1 completed visit: time-based reminder only.
- 2+ visits: average miles per day from the history, projected to today.

Phase 2 adds automatic sending (and an AI step to tune the rule per customer).
Reminders go only to customers who gave consent.

## Common edits

| To change | Edit |
|---|---|
| Name, phone, email, address, WhatsApp | `CONFIG.business` in `js/config.js` |
| Opening hours | `CONFIG.hours` |
| Lifts, spots, technicians | `CONFIG.capacity` |
| Services, durations, prices | `CONFIG.services` |
| Price factor by vehicle type | `CONFIG.vehicleTypes` |
| Turn on NC State Inspection | remove `comingSoon: true` from `stateinsp` and set a price |
| Hide the demo banner | `CONFIG.demoMode = false` (only after all placeholders are replaced) |

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

then open http://localhost:8000. Staff panel: http://localhost:8000/admin.html.
To start over with fresh demo data, use "Reset demo data" in the staff panel.

## Deploy (GitHub Pages)

1. Upload these files to the repository root (keep the folder structure,
   including `.github/workflows/static.yml`).
2. Settings > Pages > Source: **GitHub Actions**.
3. Each push to `main` redeploys the site.

## Placeholders to replace before launch

- [ ] Business name (if it changes from JM Automotive)
- [ ] Phone, WhatsApp number, email, street address
- [ ] All service prices and durations
- [ ] Free vehicle check scope
- [ ] Reviews: replace with real customer reviews or remove the section.
      Publishing invented reviews as real is not allowed.
- [ ] Images in `assets/img/`
- [ ] About section text
- [ ] Privacy policy text (have it reviewed)
- [ ] NC State Inspection: enable once the NCDMV license is granted
- [ ] Staff login and database (Phase 2), then remove the demo password
