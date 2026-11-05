/**
 * @file src/config/runtimeStore.js
 * @description Bộ lưu trữ trạng thái bổ trợ (Runtime & JSON-persisted Store).
 *
 * Lý do thiết kế:
 * Yêu cầu đề bài quy định: "không được chỉnh sửa database" (`mayday-database/final_restructured.sql`).
 * Trong khi đó:
 * - CSDL `final_restructured.sql` đã chuẩn hóa toàn bộ các bảng lâm sàng chuyên sâu bằng tiếng Việt
 *   (`nguoi`, `benhnhan`, `taikhoan`, `vaitro`, `sanglocbaodongdo`, `hosobenhan`, `benhanmaydaycap`,
 *   `benhanmaydayman`, `tiensubanthan`, `hoancanhkhoiphatdiung`, `tinhtrangnhiemtrung`,
 *   `benhsucacdotbenhtruoc`, `chukytheodoiuas7`, `nhatkyuashangngay`, `dottonthuongda`,
 *   `vitritonthuong`, `anhchuptonthuong`, `tepdinhkem`, ...).
 * - Một số cấu trúc kỹ thuật thuộc tầng ứng dụng trong Slide 2, 5, 8, 11 (như `token_blacklist` khi
 *   logout, `reset_token` khi quên mật khẩu, định nghĩa cây biểu mẫu động 4 tầng `templates` ->
 *   `sections` -> `questions` -> `options` và bảng nối `answer_images`) không tạo bảng riêng trong
 *   `final_restructured.sql`.
 *
 * Module này quản lý các cấu trúc bổ trợ đó trong bộ nhớ (kèm đồng bộ ra file JSON cục bộ),
 * đồng thời ánh xạ (mapping) 2 chiều trực tiếp giữa hệ thống câu hỏi động (`answers`) và
 * các bảng lâm sàng thực tế trong PostgreSQL (`hosobenhan`, `tiensubanthan`, `hoancanhkhoiphatdiung`,
 * `benhanmaydaycap`, `benhanmaydayman`, `tinhtrangnhiemtrung`, `benhsucacdotbenhtruoc`).
 */

const fs = require('fs');
const path = require('path');

const STORE_FILE_PATH = path.resolve(__dirname, '../../data/runtime_store.json');

/**
 * Danh sách câu hỏi sàng lọc & phân loại bệnh án (API medrec01 & medrec02 - Slide 5)
 * Kết hợp sàng lọc báo động đỏ (`public.sanglocbaodongdo`) và phân loại Cấp/Mạn (`CAP`/`MAN`).
 */
const DEFAULT_CLASSIFY_QUESTIONS = [
  {
    question_id: 'CLS_DURATION_WEEKS',
    question_text: 'Triệu chứng nổi sẩn phù / mề đay hoặc phù mạch của bạn đã kéo dài bao lâu?',
    type_question: 'radio',
    options: [
      { id: 1, option_text: 'Dưới 6 tuần (Mề đay cấp tính)', option_value: 'UNDER_6_WEEKS' },
      { id: 2, option_text: 'Từ 6 tuần trở lên (Mề đay mạn tính)', option_value: 'OVER_6_WEEKS' }
    ]
  },
  {
    question_id: 'CLS_VISIT_TYPE',
    question_text: 'Đây là lần khám đầu tiên hay tái khám tại phòng khám mề đay?',
    type_question: 'radio',
    options: [
      { id: 3, option_text: 'Khám lần đầu', option_value: 'FIRST_VISIT' },
      { id: 4, option_text: 'Tái khám', option_value: 'FOLLOW_UP' }
    ]
  },
  {
    question_id: 'CLS_RED_FLAG_BREATHING',
    question_text: 'Bạn có đang bị khó thở, thở khò khè hoặc cảm giác nghẹn họng không?',
    type_question: 'radio',
    options: [
      { id: 5, option_text: 'Không', option_value: 'false' },
      { id: 6, option_text: 'Có (Dấu hiệu báo động đỏ)', option_value: 'true' }
    ]
  },
  {
    question_id: 'CLS_RED_FLAG_DIZZINESS',
    question_text: 'Bạn có bị chóng mặt, xây xẩm mặt mày, tức ngực hoặc cảm thấy sắp ngất không?',
    type_question: 'radio',
    options: [
      { id: 7, option_text: 'Không', option_value: 'false' },
      { id: 8, option_text: 'Có (Dấu hiệu báo động đỏ)', option_value: 'true' }
    ]
  },
  {
    question_id: 'CLS_RED_FLAG_SWELLING',
    question_text: 'Bạn có bị sưng nề nhanh ở môi, lưỡi hoặc cổ họng không?',
    type_question: 'radio',
    options: [
      { id: 9, option_text: 'Không', option_value: 'false' },
      { id: 10, option_text: 'Có (Dấu hiệu báo động đỏ)', option_value: 'true' }
    ]
  },
  {
    question_id: 'CLS_RED_FLAG_ABDOMINAL',
    question_text: 'Bạn có bị đau bụng quặn hoặc nôn mửa liên tục không?',
    type_question: 'radio',
    options: [
      { id: 11, option_text: 'Không', option_value: 'false' },
      { id: 12, option_text: 'Có (Dấu hiệu báo động đỏ)', option_value: 'true' }
    ]
  }
];

/**
 * Cây biểu mẫu động 4 tầng (Template -> Sections -> Questions -> Options)
 * Tương thích hoàn toàn với Slide 5 & Slide 11 và ánh xạ trực tiếp vào các bảng lâm sàng PostgreSQL.
 */
const DEFAULT_TEMPLATES = {
  TMPL_URT_ACUTE: {
    template_id: 'TMPL_URT_ACUTE',
    code_template: 'TMPL_URT_ACUTE',
    name: 'Bệnh án Mề đay Cấp tính (< 6 tuần)',
    loai_benh_an: 'CAP',
    version: '1.0',
    is_active: 1,
    sections: [
      {
        section_id: 101,
        name: 'Phần 1: Bệnh sử & Hoàn cảnh khởi phát mề đay cấp',
        filled_by: 'patient',
        order: 1,
        questions: [
          {
            question_id: 'Q_DURATION_WEEKS',
            question_text: 'Thời gian khởi phát triệu chứng tính theo tuần (VD: 1.5)',
            type_question: 'number',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_TREATED_BEFORE',
            question_text: 'Bạn đã điều trị thuốc gì trước khi đến khám đợt này chưa?',
            type_question: 'radio',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 101, option_text: 'Có', option_value: 'true' },
              { id: 102, option_text: 'Không', option_value: 'false' }
            ]
          },
          {
            question_id: 'Q_SUSPECTED_FACTOR_GROUP',
            question_text: 'Nhóm yếu tố nghi ngờ gây khởi phát đợt cấp này',
            type_question: 'radio',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 103, option_text: 'Thức ăn', option_value: 'Thuc an' },
              { id: 104, option_text: 'Thuốc', option_value: 'Thuoc' },
              { id: 105, option_text: 'Côn trùng đốt', option_value: 'Con trung' },
              { id: 106, option_text: 'Nhiễm trùng / Khác', option_value: 'Khac' }
            ]
          },
          {
            question_id: 'Q_SUSPECTED_FOOD_DETAIL',
            question_text: 'Tên thức ăn nghi ngờ gây dị ứng',
            type_question: 'text',
            parent_question_id: 'Q_SUSPECTED_FACTOR_GROUP',
            show_if_answer: JSON.stringify({ equals: 'Thuc an' }),
            options: []
          },
          {
            question_id: 'Q_SUSPECTED_DRUG_DETAIL',
            question_text: 'Tên thuốc nghi ngờ gây dị ứng',
            type_question: 'text',
            parent_question_id: 'Q_SUSPECTED_FACTOR_GROUP',
            show_if_answer: JSON.stringify({ equals: 'Thuoc' }),
            options: []
          }
        ]
      },
      {
        section_id: 102,
        name: 'Phần 2: Tiền sử bản thân & Gia đình',
        filled_by: 'patient',
        order: 2,
        questions: [
          {
            question_id: 'Q_FAMILY_HISTORY',
            question_text: 'Trong gia đình có ai mắc bệnh mề đay hoặc cơ địa dị ứng không?',
            type_question: 'radio',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 107, option_text: 'Có', option_value: 'Co' },
              { id: 108, option_text: 'Không', option_value: 'Khong' },
              { id: 109, option_text: 'Không rõ', option_value: 'Khong ro' }
            ]
          },
          {
            question_id: 'Q_FAMILY_HISTORY_DETAIL',
            question_text: 'Ghi rõ tiền sử dị ứng/mề đay của gia đình',
            type_question: 'text',
            parent_question_id: 'Q_FAMILY_HISTORY',
            show_if_answer: JSON.stringify({ equals: 'Co' }),
            options: []
          },
          {
            question_id: 'Q_ATOPY_HISTORY',
            question_text: 'Tiền sử bệnh cơ địa (Viêm mũi dị ứng, Hen phế quản, Viêm da cơ địa)',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_DRUG_FOOD_ALLERGY_HISTORY',
            question_text: 'Tiền sử dị ứng thuốc hoặc thức ăn trước đây (nếu có ghi rõ)',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_INFECTION_SYMPTOMS',
            question_text: 'Tình trạng nhiễm trùng kèm theo (Ho, đau họng, sốt, tiểu buốt...)',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          }
        ]
      }
    ]
  },

  TMPL_URT_CHRONIC: {
    template_id: 'TMPL_URT_CHRONIC',
    code_template: 'TMPL_URT_CHRONIC',
    name: 'Bệnh án Mề đay Mạn tính (>= 6 tuần)',
    loai_benh_an: 'MAN',
    version: '1.0',
    is_active: 1,
    sections: [
      {
        section_id: 201,
        name: 'Phần 1: Đặc điểm lâm sàng & Diễn tiến Mề đay mạn tính',
        filled_by: 'patient',
        order: 1,
        questions: [
          {
            question_id: 'Q_DURATION_WEEKS',
            question_text: 'Tổng thời gian khởi phát bệnh tính theo tuần (>= 6 tuần)',
            type_question: 'number',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_DISEASE_MANIFESTATION',
            question_text: 'Biểu hiện trong quá trình bệnh mề đay mạn tính của bạn',
            type_question: 'radio',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 201, option_text: 'Chỉ có sẩn phù', option_value: 'Chi san phu' },
              { id: 202, option_text: 'Chỉ có phù mạch (sưng môi, mi mắt...)', option_value: 'Chi phu mach' },
              { id: 203, option_text: 'Cả sẩn phù và phù mạch', option_value: 'San phu + phu mach' }
            ]
          },
          {
            question_id: 'Q_INDUCIBLE_FACTORS',
            question_text: 'Các yếu tố kích thích vật lý làm xuất hiện mề đay (Da vẽ nổi, lạnh, nóng, vận động, nước, ánh sáng...)',
            type_question: 'checkbox',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 204, option_text: 'Chứng da vẽ nổi (Gãi/chà xát nổi sẩn)', option_value: 'chung_da_ve_noi' },
              { id: 205, option_text: 'Mề đay Cholinergic (Vận động, ra mồ hôi, nóng)', option_value: 'may_day_cholinergic' },
              { id: 206, option_text: 'Mề đay do lạnh', option_value: 'may_day_do_lanh' },
              { id: 207, option_text: 'Mề đay do nước', option_value: 'may_day_do_nuoc' },
              { id: 208, option_text: 'Mề đay do ánh sáng', option_value: 'may_day_do_anh_sang' }
            ]
          },
          {
            question_id: 'Q_AGE_FIRST_ONSET',
            question_text: 'Tuổi khởi phát lần đầu tiên bị mề đay',
            type_question: 'number',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_PREVIOUS_EPISODES_COUNT',
            question_text: 'Số đợt bị mề đay tương tự trước đây',
            type_question: 'number',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          }
        ]
      },
      {
        section_id: 202,
        name: 'Phần 2: Tiền sử Bản thân & Gia đình',
        filled_by: 'patient',
        order: 2,
        questions: [
          {
            question_id: 'Q_FAMILY_HISTORY',
            question_text: 'Tiền sử gia đình mắc bệnh mề đay hoặc dị ứng',
            type_question: 'radio',
            parent_question_id: null,
            show_if_answer: null,
            options: [
              { id: 209, option_text: 'Có', option_value: 'Co' },
              { id: 210, option_text: 'Không', option_value: 'Khong' },
              { id: 211, option_text: 'Không rõ', option_value: 'Khong ro' }
            ]
          },
          {
            question_id: 'Q_FAMILY_HISTORY_DETAIL',
            question_text: 'Ghi rõ thành viên và bệnh lý gia đình mắc phải',
            type_question: 'text',
            parent_question_id: 'Q_FAMILY_HISTORY',
            show_if_answer: JSON.stringify({ equals: 'Co' }),
            options: []
          },
          {
            question_id: 'Q_THYROID_HISTORY',
            question_text: 'Tiền sử bệnh lý tuyến giáp (nếu có ghi rõ)',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_AUTOIMMUNE_HISTORY',
            question_text: 'Tiền sử bệnh tự miễn (Lupus, viêm khớp dạng thấp... nếu có ghi rõ)',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          },
          {
            question_id: 'Q_OTHER_HISTORY',
            question_text: 'Tiền sử bệnh lý khác hoặc ghi chú bổ sung',
            type_question: 'text',
            parent_question_id: null,
            show_if_answer: null,
            options: []
          }
        ]
      }
    ]
  }
};

// Khởi tạo đối tượng trạng thái trong bộ nhớ
const state = {
  tokenBlacklist: {},      // { [tokenOrJti]: expiredAtTimestamp }
  resetTokens: {},         // { [phone]: { reset_token, created_at, expires_at } }
  userExtraProfile: {},    // { [userId]: { work_place, next_of_kin_name } }
  recordMeta: {},          // { [maHoSo]: { template_id, created_by, assigned_doctor_id, instructions, created_at, completed_at } }
  dynamicAnswers: {},      // { [maHoSo]: { [question_id]: { id, medical_record_id, question_id, question_option_id, answer_text, answer_value, answered_by, created_at, updated_at } } }
  answerSeq: 1,            // Bộ đếm ID tự tăng cho câu trả lời động
  answerImages: [],        // Mảng liên kết { id, answer_id, medical_record_id, attachment_id, option_value, created_at }
  answerImageSeq: 1,
  uas7Notes: {},           // { [`${patientId}_${scoreDate}`]: { note, medical_record_id, created_at } }
  lesionEpisodeMeta: {},   // { [episodeId]: { medical_record_id, context_tags, context_other } }
  lesionLocationMeta: {}   // { [locationId]: { context_tags, context_other } }
};

/**
 * Nạp dữ liệu từ file JSON nếu tồn tại
 */
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    }
  } catch (err) {
    console.warn('[Store] Không thể đọc file runtime_store.json, dùng trạng thái mới:', err.message);
  }
}

/**
 * Lưu trạng thái hiện tại ra file JSON
 */
function saveStore() {
  try {
    const dir = path.dirname(STORE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Không thể ghi file runtime_store.json:', err.message);
  }
}

loadStore();

module.exports = {
  state,
  saveStore,
  DEFAULT_CLASSIFY_QUESTIONS,
  DEFAULT_TEMPLATES
};

