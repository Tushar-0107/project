# Fieldwise — Farm Decision Intelligence

A public smallholder farm decision-support prototype backed by an authenticated Cloudflare Worker and D1 database. It is designed for readable, low-bandwidth use and keeps a browser cache for offline work.

## Run

Open the hosted public Site. Visitors can view the demonstration; sign-in is required for account-scoped cloud records. Without a signed-in account, edits stay in that browser. For a UI-only local preview, serve `web/` over HTTP; the API and D1 database are provided by the hosted Worker. Calculations and cached records remain available in the browser while offline; edits sync when connectivity returns. Farmers can set a crop stage, review a short stage-specific checklist, and record actual costs, water use, harvest weights and notes in a field journal. Fieldwise compares those entries with the full-season example plan and labels partial records clearly. Farm analysis exports as PDF; the bill ledger exports as CSV. The billing ledger records payments made elsewhere and does not process payments. Read-aloud and larger-text controls support quick use on phones.

## Build and validate

Run `npm install`, then `npm run db:generate` after schema changes. Build and validate with `npm run build:worker` and `npm run test:worker`. The Worker embeds the UI assets and packages the D1 migration.

## Prototype workflow

Context inputs → hard land, water and budget feasibility → crop-mix grid enumeration in 5% increments → deterministic 240-draw uncertainty evaluation → risk-weighted objective → trade-off views across a connected season plan. Three crops are provided for the Maharashtra Rabi demonstration. The fixed seed makes outputs repeatable.

## Backend and privacy

D1 records are partitioned by the signed-in Site account ID. The API accepts only the five known Fieldwise record types, rejects unsigned requests, bounds record size, and never trusts a client-supplied account ID. A server-checked session endpoint exposes operator controls only to the configured owner account. Public access does not create independent farmer accounts; the guided profile is available to guests, who use browser-local storage until they sign in to the host. Shared-device users should avoid entering sensitive records. The prototype does not process payments or activate paid plans. The ₹300/year Season Support price is an untested hypothesis. Live weather and market feeds, independent farmer signup and subscription checkout are not connected.

## Model card: synthetic demonstration only

Yield, price, water-use and cost coefficients are illustrative assumptions, not official district data or calibrated agronomy. Climate noise, yield noise and triangular price shocks are simplified. This is not a crop suitability, disease, pesticide or irrigation prescription system. There is no live weather, market feed or measured impact. Long-term soil, rotation, labor conditions, debt, transport and household cash flows are not modeled. A feasible mix is not proof of agronomic feasibility. Validate assumptions with a local agronomist, farmer organization, current advisory and actual quotations before real decisions.

## Validation path

Collect consented farm histories with FPOs and agronomists; compare against farmer practice and simple baselines on held-out villages and seasons. Evaluate yield and net-margin calibration, downside coverage, water use, affordability, adoption and subgroup error. Report data provenance, missingness, confidence intervals and failure cases before production use.
