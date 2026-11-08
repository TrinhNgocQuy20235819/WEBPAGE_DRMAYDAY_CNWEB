const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { initDatabase, closeDatabase } = require('./config/database');
const { RESPONSE_CODES, sendResponse } = require('./config/responseCodes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.get('/api/v1/health', (_req, res) => sendResponse(res, RESPONSE_CODES.OK, {
  service: 'DrMayDay Doctor Backend', status: 'UP'
}));
app.use('/api/v1', doctorRoutes);
app.use('/api', doctorRoutes);
app.use((req, res) => sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, `Endpoint not found: ${req.method} ${req.originalUrl}`));
app.use((err, _req, res, _next) => {
  console.error('[DoctorBackend]', err);
  return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
});

async function startServer() {
  await initDatabase();
  const port = Number(process.env.PORT || 3001);
  const server = app.listen(port, () => console.log(`[DoctorBackend] Listening on http://localhost:${port}`));
  return server;
}

if (require.main === module) {
  startServer().catch(async (err) => {
    console.error('[DoctorBackend] Startup failed:', err.message);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
}

module.exports = { app, startServer };
