/**
 * Automated Test Suite for DrMayDay Doctor Backend
 */
const http = require('http');
const assert = require('assert');
const { app } = require('../src/server');

async function runTests() {
  console.log('================================================================');
  console.log('  BẮT ĐẦU CHẠY BỘ KIỂM THỬ BACKEND BÁC SĨ (DRMAYDAY DOCTOR)     ');
  console.log('================================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[✅ PASS] TC${String(total).padStart(2, '0')}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[❌ FAIL] TC${String(total).padStart(2, '0')}: ${name}`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[✅ PASS] TC${String(total).padStart(2, '0')}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[❌ FAIL] TC${String(total).padStart(2, '0')}: ${name}`, err.message);
    }
  }

  async function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
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

  server.close();

  console.log('================================================================');
  console.log(`  KẾT QUẢ KIỂM THỬ: ${passed}/${total} PASS (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (passed < total) process.exit(1);
}

runTests().catch((err) => {
  console.error('Lỗi thực thi test runner:', err);
  process.exit(1);
});
