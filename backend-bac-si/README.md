# DrMayDay Doctor Backend

Standalone Express service for doctor APIs. It runs on port `3001` and reads/writes the existing DrMayDay PostgreSQL schema. It does not mount patient, admin, or shared-service routes and does not run schema migrations.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the same PostgreSQL database used by the patient backend.
3. Set the same `JWT_SECRET` used by the service that issues login tokens.
4. Configure the patient backend to use that PostgreSQL server too (`USE_EMBEDDED_PG=false`). Its default PGlite mode is an isolated embedded database and cannot be shared across services.
5. Run `npm install`, then `npm start`.

The doctor service verifies the shared `hosobenhan` table during startup and fails fast if the database is unavailable or the schema is missing. It reads the patient's token blacklist JSON file without writing to it; set `PATIENT_RUNTIME_STORE_PATH` if that file is stored elsewhere.

Health check: `GET http://localhost:3001/api/v1/health`.

## Doctor API routes

All routes require a valid JWT for a user with role `bac_si`.

- `GET /api/v1/doctor/patients/search?q=...`
- `GET /api/v1/doctor/queue?status=pending|in_progress|all`
- `GET /api/v1/doctor/patients/:patientId/history`
- `POST /api/v1/doctor/medical-records/:id/accept`
- `POST /api/v1/doctor/medical-records/:id/complete`
- `POST /api/v1/doctor/medical-records/:id/prescriptions`
- `POST /api/v1/doctor/medical-records/:id/lab-results`
- `GET /api/v1/doctor/medical-records/:id/lab-results`
- `PATCH /api/v1/doctor/lab-results/:labId`
- `GET /api/v1/doctor/medical-records/:id/lesion-images`

The current schema has no standalone lab-order table. Ordered tests are recorded in `ketquacanlamsang.xet_nghiem_khac`, and result values use the existing CAP/MAN result tables.
