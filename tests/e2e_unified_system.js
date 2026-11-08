/**
 * @file tests/e2e_unified_system.js
 * @description End-to-End Integration Test Suite for the Complete Unified DrMayDay System.
 * Verifies all 4 merged subsystems (Admin, Patient, Doctor, Shared Infra & AI) on the single
 * Express Gateway + Embedded PostgreSQL (`final_restructured.sql` unmodified).
 */

process.env.USE_EMBEDDED_PG = 'true';
process.env.SEED_DEMO_DATA = 'true';

const http = require('http');
const assert = require('assert');
const { Duplex } = require('stream');
const { app } = require('../backend-benh-nhan/src/server');
const { initDatabase } = require('../backend-benh-nhan/src/config/database');

async function apiCall(method, endpoint, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({
      read() {},
      write(_chunk, _enc, cb) {
        cb();
      }
    });
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = endpoint;
    req.headers = {
      host: 'localhost:8080',
      'content-type': 'application/json'
    };
    if (token) {
      req.headers.authorization = `Bearer ${token}`;
    }

    const bodyStr = body !== null && req.method !== 'GET' ? JSON.stringify(body) : '';
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
      resolve({ status: this.statusCode || statusCode, body: obj });
      return this;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });

    if (bodyStr) req.push(bodyStr);
    req.push(null);
  });
}

async function runUnifiedE2E() {
  console.log('================================================================');
  console.log('  KIỂM THỬ TÍCH HỢP TOÀN HỆ THỐNG HỢP NHẤT (DRMAYDAY COMPLETE)  ');
  console.log('================================================================');

  await initDatabase();

  let passed = 0;
  let total = 0;

  async function step(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] E2E-${String(total).padStart(2, '0')}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] E2E-${String(total).padStart(2, '0')}: ${name} ->`, err.message);
    }
  }

  let adminToken = '';
  let patientToken = '';
  let patientId = null;
  let doctorToken = '';
  let newScreeningRecordId = null;

  // 1. Unified Health Check
  await step('Unified Gateway Healthcheck (/api/v1/health)', async () => {
    const res = await apiCall('GET', '/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(String(res.body.code), '1000');
    assert.strictEqual(res.body.data.status, 'UP');
  });

  // 2. Public Red-Flag Emergency Triage
  await step('Public Emergency Red-Flag Triage (/api/v1/red-flag-screening)', async () => {
    const res = await apiCall('POST', '/api/v1/red-flag-screening', null, {
      co_kho_tho_kho_khe_nghen_hong: true,
      co_chong_mat_tuc_nguc_sap_ngat: false,
      co_sung_moi_luoi_co_hong: true,
      co_dau_bung_non_lien_tuc: false,
      xac_nhan_muon_goi_cap_cuu: true,
      da_nhan_nut_goi_cap_cuu: true,
      so_dien_thoai_cap_cuu: '115'
    });
    assert.strictEqual(String(res.body.code), '1001');
    assert.strictEqual(res.body.data.co_nguy_co_phan_ve, true);
  });

  // 3. Admin Login + Dashboard + Topology + Form Builder
  await step('Admin Subsystem (Login, Dashboard KPI, Topology, 4-Tier Form Templates)', async () => {
    const loginRes = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: '0903000999',
      password: 'password123'
    });
    assert.strictEqual(String(loginRes.body.code), '1000');
    adminToken = loginRes.body.data.token;
    assert.ok(adminToken);

    const dashRes = await apiCall('GET', '/api/v1/admin/dashboard', adminToken);
    assert.strictEqual(String(dashRes.body.code), '1000');
    assert.ok(
      Number(dashRes.body.data.kpis.staff_count) + Number(dashRes.body.data.kpis.patient_count) >= 6
    );

    const branchRes = await apiCall('GET', '/api/v1/branches', adminToken);
    assert.strictEqual(String(branchRes.body.code), '1000');
    assert.ok(Array.isArray(branchRes.body.data) && branchRes.body.data.length >= 1);

    const tmplRes = await apiCall('GET', '/api/v1/templates/all', adminToken);
    assert.strictEqual(String(tmplRes.body.code), '1000');
    assert.ok(Array.isArray(tmplRes.body.data) && tmplRes.body.data.length >= 2);
  });

  // 4. Patient Login + Profile + UAS7 + AAS7
  await step('Patient Subsystem (Login, Profile, Daily UAS7 & AAS7 Logging)', async () => {
    const loginRes = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: '0912345678',
      password: 'password123'
    });
    assert.strictEqual(String(loginRes.body.code), '1000');
    patientToken = loginRes.body.data.token;
    patientId = loginRes.body.data.user.user_id;

    const profRes = await apiCall('GET', '/api/v1/profile', patientToken);
    assert.strictEqual(String(profRes.body.code), '1000');
    assert.strictEqual(profRes.body.data.phone, '0912345678');

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const uasRes = await apiCall('POST', '/api/v1/uas7-scores', patientToken, {
      score_date: todayIso,
      hss7: 2,
      iss7: 2
    });
    assert.ok(['1000', '1001'].includes(String(uasRes.body.code)));

    const aasRes = await apiCall('POST', '/api/v1/aas-scores', patientToken, {
      ngay_theo_doi: todayIso,
      co_dot_sung_phu: true,
      muc_kho_chiu: 1,
      han_che_hoat_dong: 1,
      anh_huong_ngoai_hinh: 2,
      do_nang_tong_the: 1
    });
    assert.ok(['1000', '1001'].includes(String(aasRes.body.code)));
  });

  // 5. Patient Screening -> Creates Pending Record for Doctor Queue
  await step('Patient Screening Flow (Classify + Create Pending Medical Record)', async () => {
    const clsRes = await apiCall('POST', '/api/v1/medical_records/classify', patientToken, {
      is_chronic: true,
      duration_weeks: 10
    });
    assert.strictEqual(String(clsRes.body.code), '1000');
    assert.strictEqual(clsRes.body.data.template_id, 'TMPL_URT_CHRONIC');

    const createRes = await apiCall('POST', '/api/v1/medical_records', patientToken, {
      template_id: 'TMPL_URT_CHRONIC',
      diagnosis: 'Sàng lọc E2E: Theo dõi Mày đay mạn tính tự phát',
      answers: [
        { question_id: 'Q_DURATION_WEEKS', answer_value: 10 },
        { question_id: 'Q_DISEASE_MANIFESTATION', answer_text: 'San phu + phu mach' }
      ]
    });
    assert.strictEqual(String(createRes.body.code), '1001');
    newScreeningRecordId = createRes.body.data.medical_record_id;
    assert.ok(newScreeningRecordId);
  });

  // 6. Patient Lesion Photo + AI Wheal Counter
  await step('Patient Lesion Upload + 3-Milestone Photo + AI Wheal Counter (/ai/inference)', async () => {
    const upRes = await apiCall('POST', '/api/v1/image-attachments/upload', patientToken, {
      file_name: 'e2e_wheal_photo.jpg',
      file_size: 24500,
      mime_type: 'image/jpeg',
      file_url: '/images/clinic/clinic-urticaria-rash.jpg'
    });
    assert.strictEqual(String(upRes.body.code), '1001');
    const attId = Number(upRes.body.data.attachment_id);

    const epRes = await apiCall('GET', '/api/v1/lesion-episodes/my', patientToken);
    assert.strictEqual(String(epRes.body.code), '1000');
    const epId = Number(epRes.body.data[0].episode_id);

    const locRes = await apiCall('POST', '/api/v1/lesion-locations', patientToken, {
      episode_id: epId,
      body_part: 'Cẳng tay phải (E2E)'
    });
    assert.strictEqual(String(locRes.body.code), '1001');
    const locId = Number(locRes.body.data.location_id);

    const photoRes = await apiCall('POST', '/api/v1/lesion-photos', patientToken, {
      episode_id: epId,
      location_id: locId,
      attachment_id: attId,
      milestone: 'peak',
      itch_score: 7
    });
    assert.strictEqual(String(photoRes.body.code), '1001');
    const photoId = Number(photoRes.body.data.photo_id);

    const aiRes = await apiCall('POST', '/api/v1/ai/inference', patientToken, {
      photo_id: photoId
    });
    assert.strictEqual(String(aiRes.body.code), '1000');
    assert.ok(Number(aiRes.body.data.hives_count) >= 0);
  });

  // 7. Doctor Login + Queue + Walk-in Patient Creation
  await step('Doctor Subsystem (Login, Queue Retrieval & Walk-in Patient Intake)', async () => {
    const loginRes = await apiCall('POST', '/api/v1/auth/login', null, {
      phone: '0988765432',
      password: 'password123'
    });
    assert.strictEqual(String(loginRes.body.code), '1000');
    doctorToken = loginRes.body.data.token;

    const qRes = await apiCall(
      'GET',
      '/api/v1/doctor/queue?status=all&include_completed=true',
      doctorToken
    );
    assert.strictEqual(String(qRes.body.code), '1000');
    assert.ok(Array.isArray(qRes.body.data));
    assert.ok(
      qRes.body.data.some((r) => Number(r.medical_record_id) === Number(newScreeningRecordId)),
      'New patient screening record must appear in Doctor Queue'
    );

    const walkInRes = await apiCall('POST', '/api/v1/doctor/patients', doctorToken, {
      full_name: 'Phạm Văn Trực Tiếp',
      phone: '0939888777',
      gender: 'male',
      clinical_type: 'acute',
      diagnosis: 'Mày đay cấp tính do dị ứng thức ăn'
    });
    assert.strictEqual(String(walkInRes.body.code), '1001');
    assert.ok(walkInRes.body.data.medical_record_id);
  });

  // 8. Doctor End-to-End Clinical Workflow: Accept -> Lab Request & Result -> Prescription -> Complete
  await step('Doctor Full Clinical Loop (Accept -> Lab Order -> Prescription -> Complete)', async () => {
    const accRes = await apiCall(
      'POST',
      `/api/v1/doctor/medical-records/${newScreeningRecordId}/accept`,
      doctorToken
    );
    assert.ok(['1000', '1001'].includes(String(accRes.body.code)));

    const labCreateRes = await apiCall(
      'POST',
      `/api/v1/doctor/medical-records/${newScreeningRecordId}/lab-results`,
      doctorToken,
      {
        tests: ['Định lượng IgE toàn phần huyết thanh'],
        note: 'Chỉ định tầm soát CSU bậc 2'
      }
    );
    assert.strictEqual(String(labCreateRes.body.code), '1001');
    const labId = labCreateRes.body.data.lab_result_id;

    const labUpdRes = await apiCall(
      'PATCH',
      `/api/v1/doctor/lab-results/${labId}`,
      doctorToken,
      {
        ige_toan_phan: 285.4,
        can_lam_sang_khac_ghi_chu: 'Tăng IgE toàn phần'
      }
    );
    assert.strictEqual(String(labUpdRes.body.code), '1000');

    const rxRes = await apiCall(
      'POST',
      `/api/v1/doctor/medical-records/${newScreeningRecordId}/prescriptions`,
      doctorToken,
      {
        diagnosis: 'Mày đay mạn tính tự phát (CSU) đáp ứng kém liều chuẩn',
        treatment_note: 'Tăng liều Bilastine 20mg x 2 viên/ngày theo EAACI/GA2LEN',
        items: [
          {
            drug_name: 'Bilastine 20mg',
            dosage: 'Uống 1 viên sáng, 1 viên tối xa bữa ăn',
            duration: '28 ngày'
          }
        ]
      }
    );
    assert.strictEqual(String(rxRes.body.code), '1001');

    const compRes = await apiCall(
      'POST',
      `/api/v1/doctor/medical-records/${newScreeningRecordId}/complete`,
      doctorToken,
      {
        diagnosis: 'Mày đay mạn tính tự phát (CSU) bậc 2',
        summary: 'Đã chỉ định IgE và kê đơn kháng H1 thế hệ 2 liều gấp đôi.',
        instructions: 'Chấm điểm UAS7 mỗi tối, tái khám sau 4 tuần.'
      }
    );
    assert.strictEqual(String(compRes.body.code), '1000');
  });

  // 9. Cross-Role Notifications & Patient Views Prescription + Lab Result
  await step('Cross-Role Notifications & Patient Reads Doctor Prescription + Lab Result', async () => {
    const notifRes = await apiCall('GET', '/api/v1/notifications', patientToken);
    assert.strictEqual(String(notifRes.body.code), '1000');
    assert.ok(Number(notifRes.body.data.unread_count) >= 1);

    const rxReadRes = await apiCall(
      'GET',
      `/api/v1/prescriptions/${newScreeningRecordId}`,
      patientToken
    );
    assert.strictEqual(String(rxReadRes.body.code), '1000');
    assert.ok(rxReadRes.body.data.length >= 1);

    const labReadRes = await apiCall(
      'GET',
      `/api/v1/lab-results/${newScreeningRecordId}`,
      patientToken
    );
    assert.strictEqual(String(labReadRes.body.code), '1000');
    assert.strictEqual(Number(labReadRes.body.data[0].ige_toan_phan), 285.4);
  });

  // 10. Shared Token Blacklist across Auth & Doctor Middlewares
  await step('Shared JWT Blacklist on Logout Invalidates Subsequent Doctor Requests', async () => {
    const outRes = await apiCall('POST', '/api/v1/auth/logout', doctorToken);
    assert.strictEqual(String(outRes.body.code), '1000');

    const afterLogoutRes = await apiCall('GET', '/api/v1/doctor/queue', doctorToken);
    assert.ok(['3001', '3002'].includes(String(afterLogoutRes.body.code)));
  });

  console.log('================================================================');
  console.log(`  KẾT QUẢ E2E HỆ THỐNG HỢP NHẤT: ${passed}/${total} PASS (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (passed < total) process.exit(1);
}

runUnifiedE2E().catch((err) => {
  console.error('Lỗi thực thi E2E:', err);
  process.exit(1);
});
