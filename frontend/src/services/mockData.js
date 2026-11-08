// Mock Clinical Datasets for DrMayDay Hospital System
// Conforming to Ministry of Health & National Hospital of Dermatology & Venereology specs

export const INITIAL_STAFFS = [
  { id: "s1", employee_code: "BS-01", full_name: "TS.BS. Nguyễn Văn Hùng", title: "TS.BS. Nguyễn Văn Hùng", specialty: "Dị ứng & Miễn dịch lâm sàng", room: "Phòng 302 - Khám Mày đay Mạn", is_active: true },
  { id: "s2", employee_code: "BS-02", full_name: "ThS.BS. Lê Thị Mai", title: "ThS.BS. Lê Thị Mai", specialty: "Da liễu tổng quát", room: "Phòng 301 - Khám Ban đầu", is_active: true },
  { id: "s3", employee_code: "BS-03", full_name: "BSCKII. Trần Đình Trọng", title: "BSCKII. Trần Đình Trọng", specialty: "Cận lâm sàng & Sinh hóa", room: "Phòng Xét nghiệm Miễn dịch", is_active: true },
  { id: "s4", employee_code: "ĐD-01", full_name: "ĐD. Phạm Thùy Linh", title: "ĐD. Phạm Thùy Linh", specialty: "Điều dưỡng trưởng", room: "Phòng Tiếp đón BN", is_active: true },
];

export const INITIAL_BRANCHES = [
  { id: "b1", code: "CS1-TW", name: "Cơ sở 1 - Trung Tâm Da Liễu TW", address: "15A Phương Mai, Đống Đa, Hà Nội", phone: "024.3223.8888", is_active: true },
  { id: "b2", code: "CS2-QUOCTE", name: "Cơ sở 2 - Trung Tâm Kỹ Thuật Cao", address: "Đường Giải Phóng, Hai Bà Trưng, Hà Nội", phone: "024.3223.9999", is_active: true }
];

export const INITIAL_DEPARTMENTS = [
  { id: "d1", branch_id: "b1", code: "KKB", name: "Khoa Khám Bệnh Chuyên Sâu", head_name: "PGS.TS. Trần Hậu Khang" },
  { id: "d2", branch_id: "b1", code: "KMD", name: "Khoa Miễn Dịch & Dị Ứng Da", head_name: "TS.BS. Nguyễn Văn Hùng" },
  { id: "d3", branch_id: "b2", code: "KTDC", name: "Khoa Tự Miễn & Tế Bào Gốc", head_name: "TS.BS. Vũ Tuấn Anh" }
];

export const INITIAL_ROOMS = [
  { id: "r1", department_id: "d1", code: "P301", name: "Phòng Khám Tiếp Đón Ban Đầu", room_type: "clinic" },
  { id: "r2", department_id: "d2", code: "P302", name: "Phòng Khám Chuyên Đề Mày Đay", room_type: "clinic" },
  { id: "r3", department_id: "d2", code: "PXN-MD", name: "Phòng Xét Nghiệm Dị Ứng & IgE", room_type: "lab" },
  { id: "r4", department_id: "d3", code: "PTT", name: "Phòng Test Áp & Kích Thích Lạnh", room_type: "procedure" }
];

export const INITIAL_RECORDS = [
  {
    id: "rec1",
    medical_record_id: 1042,
    record_code: "BA-2026-1042",
    patient_name: "Nguyễn Thị Mai",
    patient_phone: "0912 345 678",
    patient_gender: "female",
    patient_age: 32,
    bhyt_code: "DN4010123456789",
    status: "in_progress", // pending, in_progress, completed
    clinical_type: "chronic", // chronic (>=6w), acute (<6w)
    assigned_doctor_name: "TS.BS. Nguyễn Văn Hùng",
    room_name: "Phòng 302 - Chuyên đề Mày đay",
    uas7_today: 4,
    created_at: "2026-03-08T08:30:00",
    diagnosis: "Mày đay mạn tính tự phát (CSU) mức độ vừa",
    symptoms: "Nổi sẩn phù rải rác toàn thân kèm ngứa dữ dội về đêm, kéo dài hơn 8 tuần.",
    prescriptions: [
      { drug_name: "Fexofenadine 180mg", dosage: "Uống 1 viên / ngày sau ăn sáng", quantity: "30 viên", note: "Kháng histamine H1 thế hệ 2 không gây buồn ngủ" },
      { drug_name: "Montelukast 10mg", dosage: "Uống 1 viên vào buổi tối", quantity: "30 viên", note: "Kháng leukotriene phối hợp" }
    ]
  },
  {
    id: "rec2",
    medical_record_id: 1043,
    record_code: "BA-2026-1043",
    patient_name: "Trần Văn Nam",
    patient_phone: "0988 765 432",
    patient_gender: "male",
    patient_age: 28,
    bhyt_code: "GD4010987654321",
    status: "pending",
    clinical_type: "acute",
    assigned_doctor_name: "ThS.BS. Lê Thị Mai",
    room_name: "Phòng 301 - Tiếp đón",
    uas7_today: null,
    created_at: "2026-03-08T09:15:00",
    diagnosis: "Mày đay cấp tính nghi do dị ứng hải sản",
    symptoms: "Xuất hiện sẩn phù cấp tính 2 ngày sau khi ăn tôm, ngứa nhiều ở tay chân và bụng.",
    prescriptions: []
  },
  {
    id: "rec3",
    medical_record_id: 1040,
    record_code: "BA-2026-1040",
    patient_name: "Lê Hoàng Yến",
    patient_phone: "0903 112 233",
    patient_gender: "female",
    patient_age: 45,
    bhyt_code: "HT4010112233445",
    status: "completed",
    clinical_type: "chronic",
    assigned_doctor_name: "TS.BS. Nguyễn Văn Hùng",
    room_name: "Phòng 302 - Chuyên đề Mày đay",
    uas7_today: 1,
    created_at: "2026-03-07T14:00:00",
    diagnosis: "Mày đay mạn tính đã kiểm soát tốt",
    symptoms: "Tái khám định kỳ, triệu chứng thuyên giảm trên 80% sau 4 tuần dùng phác đồ liều chuẩn.",
    prescriptions: [
      { drug_name: "Levocetirizine 5mg", dosage: "Uống 1 viên / ngày", quantity: "15 viên", note: "Duy trì kiểm soát sẩn phù" }
    ]
  }
];

export const INITIAL_UAS7_SCORES = [
  { score_date: "2026-03-02", daily_score: 4, hss7: 2, iss7: 2 },
  { score_date: "2026-03-03", daily_score: 3, hss7: 2, iss7: 1 },
  { score_date: "2026-03-04", daily_score: 5, hss7: 3, iss7: 2 },
  { score_date: "2026-03-05", daily_score: 2, hss7: 1, iss7: 1 },
  { score_date: "2026-03-06", daily_score: 4, hss7: 2, iss7: 2 },
  { score_date: "2026-03-07", daily_score: 3, hss7: 2, iss7: 1 },
  { score_date: "2026-03-08", daily_score: 3, hss7: 1, iss7: 2 }
];

export const INITIAL_TEMPLATES = [
  {
    id: "tmpl-01",
    code: "TMPL_CSU_STANDARD",
    name: "Phiếu Khai Thác Bệnh Sử Mày Đay Mạn Tính Chuẩn",
    description: "Bộ câu hỏi tiêu chuẩn phục vụ phân loại thể bệnh, nguyên nhân khởi phát và thang điểm hoạt tính.",
    is_active: true,
    sections: [
      {
        id: "sec-01",
        title: "I. Thông tin khởi phát & thời gian bệnh",
        questions: [
          { id: "q1", content: "Các nốt sẩn phù đã xuất hiện liên tục hay tái phát trong bao lâu?", type: "radio", options: ["Dưới 6 tuần (Cấp tính)", "Từ 6 tuần trở lên (Mạn tính)"] },
          { id: "q2", content: "Mỗi nốt sẩn phù đơn lẻ thường biến mất hoàn toàn trong thời gian nào?", type: "radio", options: ["Dưới 1 giờ", "Từ 1 đến 24 giờ (Điển hình)", "Kéo dài trên 24 giờ"] }
        ]
      },
      {
        id: "sec-02",
        title: "II. Triệu chứng phù mạch đi kèm (Angioedema)",
        questions: [
          { id: "q3", content: "Bạn có bị sưng môi, mí mắt, lưỡi hoặc bàn tay bàn chân không?", type: "radio", options: ["Không bao giờ", "Thỉnh thoảng có sưng", "Thường xuyên sưng nề"] }
        ]
      }
    ]
  }
];
