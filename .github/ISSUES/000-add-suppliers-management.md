# Aggiungere gestione fornitori (backend + frontend + integrazione costi)

## Sommario

Aggiungere una funzionalità per censire e gestire i fornitori dell'evento. Include:

- Modelli database per `SupplierType` e `Supplier` (con campo `cost`).
- API admin per CRUD e list/filter.
- Pagine `frontend-admin` per gestire tipi di fornitore e fornitori (lista, crea, modifica, elimina).
- Integrazione del costo totale dei fornitori nel Dashboard (totale evento e breakdown dettagliato).

## Motivazione

Permettere agli sposi / wedding planner di tenere traccia dei fornitori e dei relativi costi, visualizzando il contributo dei fornitori al costo totale dell'evento in Dashboard e nel breakdown.

## Scope

- Backend: Modelli, serializers, viewsets (admin API), migrazione DB, tests.
- Frontend Admin: due pagine (Supplier Types, Suppliers) con CRUD completo, validazione costi, UX di conferma eliminazione, e visualizzazione nei dettagli evento/dashboard.
- Dashboard: sommare i costi dei fornitori al totale evento e mostrare un breakdown "Fornitori" con singoli voci e subtotale.
- Documentazione: aggiornare `docs/06-BACKEND-CORE.md` e `docs/09-FRONTEND-ADMIN-COMPONENTS.md` con le nuove entità e pagine.

## Requisiti tecnici (Backend)

1. Nuovi modelli (suggestion):
   - `SupplierType`
     - `id`: UUID primary key
     - `name`: string unique, required
     - `description`: text optional
     - `created_at`, `updated_at`

   - `Supplier`
     - `id`: UUID primary key
     - `name`: string required
     - `type`: FK -> `SupplierType` (on_delete=PROTECT)
     - `cost`: Decimal(12,2) required default 0.00
     - `currency`: CharField(3) default `EUR` (or use GlobalConfig)
     - `contact`: JSON/text optional (telefono/email)
     - `notes`: text optional
     - `event` or relation to `Invitation` if costs are per-invito (clarify) — default: global costs per-event; implement as nullable FK to `Invitation` if needed in future
     - `created_at`, `updated_at`

2. DB constraints & indices:
   - `unique_together` if needed (e.g. same name+type)
   - Index on `type` and `cost` for filtering/sort

3. Serializers & ViewSets:
   - `SupplierTypeSerializer` (ModelSerializer)
   - `SupplierSerializer` (ModelSerializer) — validate `cost >= 0`
   - Admin viewsets under `/api/admin/supplier-types/` and `/api/admin/suppliers/` (ModelViewSet, staff-only)
   - Filters: `?type=<id>`, `?min_cost=`, `?max_cost=`, `?search=`
   - Actions: bulk-delete, optionally bulk-import CSV (future)

4. Business logic:
   - When calculating `total_event_cost`, include sum of `Supplier.cost` (respect currency conversion if multiple currencies — MVP: assume single currency)
   - Expose aggregated endpoint for dashboard: `/api/admin/aggregates/cost-breakdown/` returning totals per category (e.g., suppliers, accommodations, other)

5. Tests (pytest):
   - Model creation and validation
   - API CRUD (permission checks, filters)
   - Aggregation endpoint correctness

## Requisiti tecnici (Frontend Admin)

1. Pagine nuove (React, Tailwind):
   - `SuppliersList` (`/dashboard/suppliers`)
     - Tabella paginata con colonne: `Name, Type, Cost, Currency, Contact, Actions` (edit/delete)
     - Bulk selection + delete
     - Search & filters
   - `SupplierTypesList` (`/dashboard/supplier-types`)
     - CRUD semplice con `name` e `description`
   - `SupplierForm` (create/edit) con validazione client-side per `cost`

2. Integrazione API:
   - Usare `fetchClient` (admin) per tutte le chiamate
   - Toasts per success/error (usare `ToastContext` già presente)

3. Dashboard changes:
   - Aggiornare la card `Total cost` per includere `sum(Suppliers.cost)`
   - Nuova sezione `Cost Breakdown` con tabella/lista dove appare la voce `Fornitori` e il dettaglio per singolo fornitore

4. Tests (Vitest/React Testing Library):
   - Component smoke tests
   - API mocks e verifica UI per CRUD flows

## Acceptance Criteria

- [ ] Modelli creati con migrazione e test verde
- [ ] Admin API disponibili e protette (solo staff)
- [ ] Pagine admin implementate con UX concordata
- [ ] Dashboard mostra il totale aggiornato che include supplier costs
- [ ] Documentazione aggiornata (docs backend + frontend)
- [ ] Test backend e frontend aggiunti

## Migrazione & Rollout

- Creare migrazione Django per nuovi modelli
- Se il campo `cost` entra in calcoli finanziari, aggiungere fallback per eventuali `NULL` (assumere 0.00)
- Deployment: rebuild backend container e applicare `python manage.py migrate`

## Note / Open Questions

- I costi sono legati a singoli `Invitation` o globali per evento? (qui assumiamo globali per evento; se necessario, aggiungere FK a `Invitation`)
- Gestire multi-currency ora o nel prossimo step? (MVP: single currency)

## Tasks suggerite (proposta di lavoro)

- Backend: implementare modelli + serializers + viewsets + migrazioni + tests
- Frontend Admin: implementare `SupplierTypes` + `Suppliers` pages, integrarle nella sidebar
- Dashboard: aggiungere call aggregata e UI breakdown
- Docs: aggiornare `docs/06-BACKEND-CORE.md` e `docs/09-FRONTEND-ADMIN-COMPONENTS.md`

## Labels

`enhancement`, `backend`, `frontend-admin`, `documentation`, `testing`

---

Se vuoi, procedo creando branch e PR iniziale con la sola issue o posso partire direttamente implementando i modelli backend (step successivo consigliato).
