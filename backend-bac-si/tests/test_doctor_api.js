/**
 * Automated Test Suite for DrMayDay Doctor Backend (In-Process Express Pipeline)
 */
process.env.USE_EMBEDDED_PG = 'true';
const http = require('http');
const assert = require('assert');
const { Duplex } = require('stream');
const { app } = require('../src/server');
const { initDatabase } = require('../src/config/database');

async function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      }
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = (options.method || 'GET').toUpperCase();
    req.url = endpoint;
    req.headers = {
      host: 'localhost:8080',
      'content-type': 'application/json',
      ...(options.headers || {})
    };
    // Normalize header keys to lowercase for Node IncomingMessage
    for (const k of Object.keys(req.headers)) {
      if (k !== k.toLowerCase()) {
        req.headers[k.toLowerCase()] = req.headers[k];
        delete req.headers[k];
      }
    }

    const bodyStr =
      options.body !== undefined && options.body !== null && req.method !== 'GET'
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : '';
    if (bodyStr) {
      req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
    }

    const res = new http.ServerResponse(req);
    let statusCode = 200;

    res.status = function (code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    };

    res.json = function (obj) {
      resolve({ status: this.statusCode || statusCode, headers: this.getHeaders(), body: obj });
      return this;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });

    if (bodyStr) req.push(bodyStr);
    req.push(null);
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('  BẮT ĐẦU CHẠY BỘ KIỂM THỬ BACKEND BÁC SĨ (DRMAYDAY DOCTOR)     ');
  console.log('================================================================');

  await initDatabase();

  let passed = 0;
  let total = 0;

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] TC${String(total).padStart(2, '0')}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] TC${String(total).padStart(2, '0')}: ${name}`, err.message);
    }
  }

  // TC01: Health check endpoint
  await testAsync('Health check trả về UP và mã 1000', async () => {
    const res = await request('/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(String(res.body.code), '1000');
    assert.strictEqual(res.body.data.status, 'UP');
  });

  // TC02: Doctor Queue without JWT -> 3003 Not Authenticated
  await testAsync('Gọi API /doctor/queue không có JWT trả về 3003', async () => {
    const res = await request('/api/v1/doctor/queue');
    assert.strictEqual(String(res.body.code), '3003');
  });

  // TC03: Doctor Search Patients without JWT -> 3003
  await testAsync('Gọi API /doctor/patients/search không có JWT trả về 3003', async () => {
    const res = await request('/api/v1/doctor/patients/search?q=test');
    assert.strictEqual(String(res.body.code), '3003');
  });

  // TC04: Doctor Accept Record without JWT -> 3003
  await testAsync('Gọi API /doctor/medical-records/1/accept không có JWT trả về 3003', async () => {
    const res = await request('/api/v1/doctor/medical-records/1/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(String(res.body.code), '3003');
  });

  // TC05: Invalid JWT Token format -> 3001
  await testAsync('Gửi JWT sai định dạng trả về mã 3001 (Invalid token)', async () => {
    const res = await request('/api/v1/doctor/queue', {
      headers: { Authorization: 'Bearer this_is_invalid_jwt_token' }
    });
    assert.strictEqual(String(res.body.code), '3001');
  });

  // TC06: Nonexistent Endpoint -> 2003 with helpful message
  await testAsync('Gọi Endpoint không tồn tại trả về mã lỗi 2003', async () => {
    const res = await request('/api/v1/doctor/unknown-route');
    assert.strictEqual(String(res.body.code), '2003');
  });

  console.log('================================================================');
  console.log(`  KẾT QUẢ KIỂM THỬ: ${passed}/${total} PASS (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (passed < total) process.exit(1);
}

runTests().catch((err) => {
  console.error('Lỗi thực thi test runner:', err);
  process.exit(1);
});
