/**
 * @file src/config/responseCodes.js
 * @description Bộ mã phản hồi chuẩn hóa toàn hệ thống DrMayDay (Theo Slide 1, 2, 5, 6, 8, 9).
 * Tất cả các API trong Phân hệ Bệnh nhân đều trả về cấu trúc JSON thống nhất:
 * {
 *   code: "1000",
 *   message: "OK",
 *   data: { ... }
 * }
 */

const RESPONSE_CODES = {
  // 1xxx: Thành công
  OK: { code: '1000', message: 'OK', httpStatus: 200 },
  CREATED: { code: '1001', message: 'Created successfully', httpStatus: 201 },

  // 2xxx: Lỗi tham số đầu vào (Validation Errors)
  MISSING_PARAM: { code: '2001', message: 'Missing required parameter', httpStatus: 400 },
  INVALID_PARAM_TYPE: { code: '2002', message: 'Invalid parameter type', httpStatus: 400 },
  INVALID_PARAM_VALUE: { code: '2003', message: 'Invalid parameter value', httpStatus: 400 },
  INVALID_PHONE_FORMAT: { code: '2004', message: 'Invalid phone number format', httpStatus: 400 },

  // 3xxx: Lỗi Xác thực & Phân quyền RBAC (Authentication & Authorization)
  INVALID_TOKEN: { code: '3001', message: 'Invalid token', httpStatus: 401 },
  TOKEN_EXPIRED: { code: '3002', message: 'Token has expired or been revoked', httpStatus: 401 },
  NOT_AUTHENTICATED: { code: '3003', message: 'User not authenticated', httpStatus: 401 },
  PHONE_ALREADY_EXISTS: { code: '3006', message: 'User phone already exists', httpStatus: 409 },
  USER_NOT_FOUND: { code: '3007', message: 'User account not found', httpStatus: 404 },
  PASSWORD_INCORRECT: { code: '3008', message: 'Password incorrect', httpStatus: 401 },
  OLD_PASSWORD_INCORRECT: { code: '3009', message: 'Old password incorrect', httpStatus: 400 },
  ADMIN_ROLE_REQUIRED: { code: '3102', message: 'Admin role required', httpStatus: 403 },
  DOCTOR_ROLE_REQUIRED: { code: '3103', message: 'Doctor role required', httpStatus: 403 },
  DOCTOR_NOT_ASSIGNED: { code: '3105', message: 'Doctor not assigned to this record', httpStatus: 403 },
  FORBIDDEN_OTHER_USER_DATA: { code: '3106', message: "Cannot access another user's data", httpStatus: 403 },
  ROLE_NOT_FOUND: { code: '3201', message: 'Role not found', httpStatus: 404 },
  ROLE_NAME_EXISTS: { code: '3202', message: 'Role name already exists', httpStatus: 409 },
  PERMISSION_NOT_FOUND: { code: '3203', message: 'Permission not found', httpStatus: 404 },
  PERMISSION_NAME_EXISTS: { code: '3204', message: 'Permission name already exists', httpStatus: 409 },
  BRANCH_NOT_FOUND: { code: '3301', message: 'Branch not found', httpStatus: 404 },
  BRANCH_IN_USE: { code: '3302', message: 'Cannot delete branch with active departments or assigned staff', httpStatus: 400 },
  DEPARTMENT_NOT_FOUND: { code: '3303', message: 'Department not found', httpStatus: 404 },
  ROOM_NOT_FOUND: { code: '3304', message: 'Room not found', httpStatus: 404 },
  ROOM_IN_USE: { code: '3305', message: 'Cannot delete room with assigned staff', httpStatus: 400 },

  // 4xxx: Lỗi Hồ sơ Bệnh án & Biểu mẫu động (Medical Records & Templates)
  MEDICAL_RECORD_NOT_FOUND: { code: '4001', message: 'Medical record not found', httpStatus: 404 },
  ACTIVE_RECORD_REQUIRED: { code: '4002', message: 'Active medical record required', httpStatus: 400 },
  MEDICAL_RECORD_COMPLETED: { code: '4003', message: 'Medical record already completed', httpStatus: 400 },
  RECORD_NOT_PENDING: { code: '4004', message: 'Medical record not in pending status', httpStatus: 400 },
  ALREADY_ACCEPTED: { code: '4005', message: 'Already accepted by another doctor', httpStatus: 409 },
  CLASSIFY_INCOMPLETE: { code: '4006', message: 'Classification options incomplete', httpStatus: 400 },
  TEMPLATE_NOT_FOUND: { code: '4101', message: 'Template not found', httpStatus: 404 },
  TEMPLATE_CODE_EXISTS: { code: '4102', message: 'Template code already exists', httpStatus: 409 },
  SECTION_NOT_FOUND: { code: '4103', message: 'Section not found', httpStatus: 404 },
  QUESTION_NOT_FOUND: { code: '4104', message: 'Question not found', httpStatus: 404 },
  TEMPLATE_IN_USE: { code: '4105', message: 'Template in use cannot be deleted', httpStatus: 400 },

  // 5xxx: Lỗi Thang điểm UAS7 / AAS (UAS7 Scoring)
  UAS7_ALREADY_SUBMITTED: { code: '5002', message: 'Score for date already submitted', httpStatus: 409 },
  INVALID_ISS7_VALUE: { code: '5003', message: 'Invalid ISS7 value (must be between 0 and 3)', httpStatus: 400 },
  INVALID_HSS7_VALUE: { code: '5004', message: 'Invalid HSS7 value (must be between 0 and 3)', httpStatus: 400 },

  // 6xxx: Lỗi Kho ảnh & Tệp đính kèm (Media & Answer Images)
  IMAGE_FILE_REQUIRED: { code: '6001', message: 'Image file is required', httpStatus: 400 },
  FILE_SIZE_EXCEEDS_LIMIT: { code: '6003', message: 'File size exceeds limit (max 5MB)', httpStatus: 400 },
  ATTACHMENT_NOT_FOUND: { code: '6005', message: 'Attachment not found', httpStatus: 404 },
  IMAGE_ALREADY_MAPPED: { code: '6006', message: 'Image already mapped to answer', httpStatus: 409 },

  // 7xxx: Lỗi Theo dõi Tổn thương da (Lesion Tracking)
  LESION_EPISODE_NOT_FOUND: { code: '7001', message: 'Lesion episode not found', httpStatus: 404 },
  LESION_LOCATION_NOT_FOUND: { code: '7002', message: 'Lesion location not found', httpStatus: 404 },
  LESION_PHOTO_NOT_FOUND: { code: '7003', message: 'Lesion photo not found', httpStatus: 404 },
  LESION_NAME_EMPTY: { code: '7004', message: 'Lesion name cannot be empty', httpStatus: 400 },
  BODY_PART_EMPTY: { code: '7005', message: 'Body part cannot be empty', httpStatus: 400 },
  INVALID_MILESTONE: { code: '7006', message: 'Invalid milestone value (must be start, peak, or normal)', httpStatus: 400 },
  SYMPTOM_SCORE_OUT_OF_RANGE: { code: '7007', message: 'Symptom score out of range (must be between 0 and 10)', httpStatus: 400 },

  // 9xxx: Lỗi hệ thống nội bộ
  INTERNAL_ERROR: { code: '9999', message: 'Internal server error', httpStatus: 500 }
};

/**
 * Hàm gửi phản hồi JSON chuẩn hóa cho mọi API.
 * @param {import('express').Response} res - Đối tượng Response của Express
 * @param {object} statusDef - Định nghĩa mã phản hồi từ RESPONSE_CODES
 * @param {any} [data={}] - Dữ liệu trả về trong trường data
 * @param {string} [customMessage] - Thông điệp tùy chỉnh (nếu muốn ghi đè mặc định)
 */
function sendResponse(res, statusDef, data = {}, customMessage = null) {
  return res.status(statusDef.httpStatus || 200).json({
    code: String(statusDef.code),
    message: customMessage || statusDef.message,
    data: data !== undefined ? data : {}
  });
}

module.exports = {
  RESPONSE_CODES,
  sendResponse
};

