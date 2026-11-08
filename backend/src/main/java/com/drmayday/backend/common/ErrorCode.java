package com.drmayday.backend.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Standardized Response & Error Codes for DrMayDay System.
 * Aligned with Slide 1 - 11 Specifications.
 */
@Getter
public enum ErrorCode {
    // 1000 - 1999: Success
    SUCCESS(1000, "OK", HttpStatus.OK),
    CREATED(1001, "Created successfully", HttpStatus.CREATED),

    // 2000 - 2999: Validation & Parameter Errors
    INVALID_PARAM(2001, "Missing required parameter", HttpStatus.BAD_REQUEST),
    INVALID_FORMAT(2002, "Invalid parameter format", HttpStatus.BAD_REQUEST),
    INVALID_PARAM_VALUE(2003, "Invalid parameter value", HttpStatus.BAD_REQUEST),
    INVALID_DATE(2004, "Invalid date format", HttpStatus.BAD_REQUEST),

    // 3000 - 3999: Authentication, User & RBAC Errors (Slide 2 & 3)
    INVALID_TOKEN(3001, "Invalid token", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(3002, "Token has expired or been revoked", HttpStatus.UNAUTHORIZED),
    NOT_AUTHENTICATED(3003, "User not authenticated", HttpStatus.UNAUTHORIZED),
    USER_PHONE_EXISTS(3006, "User phone already exists", HttpStatus.CONFLICT),
    USER_NOT_FOUND(3007, "User not found", HttpStatus.NOT_FOUND),
    INVALID_PASSWORD(3008, "Invalid password", HttpStatus.UNAUTHORIZED),
    OLD_PASSWORD_MISMATCH(3009, "Old password does not match", HttpStatus.BAD_REQUEST),
    FORBIDDEN_ADMIN_REQUIRED(3102, "Admin access required", HttpStatus.FORBIDDEN),
    FORBIDDEN_DOCTOR_REQUIRED(3103, "Doctor role required", HttpStatus.FORBIDDEN),
    FORBIDDEN_DOCTOR_NOT_ASSIGNED(3105, "Doctor is not assigned to this medical record", HttpStatus.FORBIDDEN),
    FORBIDDEN_PATIENT_ACCESS(3106, "Unauthorized access to patient data", HttpStatus.FORBIDDEN),
    ROLE_NOT_FOUND(3201, "Role not found", HttpStatus.NOT_FOUND),
    ROLE_NAME_EXISTS(3202, "Role name already exists", HttpStatus.CONFLICT),
    PERMISSION_NOT_FOUND(3203, "Permission not found", HttpStatus.NOT_FOUND),
    PERMISSION_NAME_EXISTS(3204, "Permission name already exists", HttpStatus.CONFLICT),

    // Topology Errors (Slide 4)
    BRANCH_NOT_FOUND(3301, "Branch not found", HttpStatus.NOT_FOUND),
    BRANCH_IN_USE(3302, "Cannot delete branch with active departments or assigned staff", HttpStatus.BAD_REQUEST),
    DEPARTMENT_NOT_FOUND(3303, "Department not found", HttpStatus.NOT_FOUND),
    ROOM_NOT_FOUND(3304, "Room not found", HttpStatus.NOT_FOUND),
    ROOM_IN_USE(3305, "Cannot delete room with assigned staff", HttpStatus.BAD_REQUEST),

    // 4000 - 4999: Medical Record & Dynamic Form Errors (Slide 5 & 11)
    MEDICAL_RECORD_NOT_FOUND(4001, "Medical record not found", HttpStatus.NOT_FOUND),
    MEDICAL_RECORD_INVALID_STATE(4002, "Invalid medical record status", HttpStatus.BAD_REQUEST),
    MEDICAL_RECORD_ALREADY_COMPLETED(4003, "Medical record is already completed and cannot be modified", HttpStatus.BAD_REQUEST),
    TEMPLATE_NOT_FOUND(4101, "Template not found", HttpStatus.NOT_FOUND),
    TEMPLATE_CODE_EXISTS(4102, "Template code already exists", HttpStatus.CONFLICT),
    SECTION_NOT_FOUND(4103, "Section not found", HttpStatus.NOT_FOUND),
    QUESTION_NOT_FOUND(4104, "Question not found", HttpStatus.NOT_FOUND),
    TEMPLATE_IN_USE(4105, "Cannot delete template already attached to medical records", HttpStatus.BAD_REQUEST),

    // 5000 - 5999: UAS7 Score Errors (Slide 6)
    UAS7_ALREADY_SCORED_TODAY(5002, "UAS7 score for today has already been submitted", HttpStatus.CONFLICT),
    UAS7_INVALID_ISS_SCORE(5003, "ISS7 score must be between 0 and 3", HttpStatus.BAD_REQUEST),
    UAS7_INVALID_HSS_SCORE(5004, "HSS7 score must be between 0 and 3", HttpStatus.BAD_REQUEST),

    // 6000 - 6999: Media & Storage Errors (Slide 8)
    MEDIA_FILE_MISSING(6001, "Media file is required", HttpStatus.BAD_REQUEST),
    MEDIA_FILE_TOO_LARGE(6003, "Media file size exceeds limit (5MB)", HttpStatus.PAYLOAD_TOO_LARGE),

    // 7000 - 7999: Lesion Tracking Errors (Slide 9)
    LESION_EPISODE_NOT_FOUND(7001, "Lesion episode not found", HttpStatus.NOT_FOUND),
    LESION_LOCATION_NOT_FOUND(7002, "Lesion location not found", HttpStatus.NOT_FOUND),
    LESION_PHOTO_NOT_FOUND(7003, "Lesion photo not found", HttpStatus.NOT_FOUND),

    // 8000 - 8999: Prescriptions & Lab Requests Errors (Slide 7)
    PRESCRIPTION_ITEMS_EMPTY(8001, "Prescription items list cannot be empty", HttpStatus.BAD_REQUEST),
    PRESCRIPTION_ITEM_MISSING_DRUG_NAME(8002, "Drug name is required for all items", HttpStatus.BAD_REQUEST),
    LAB_REQUEST_ITEMS_EMPTY(8101, "Lab request items list cannot be empty", HttpStatus.BAD_REQUEST),

    // 9000 - 9999: Notifications & System Errors (Slide 10)
    FCM_TOKEN_MISSING(9101, "FCM token is required", HttpStatus.BAD_REQUEST),
    NOTIFICATION_NOT_FOUND(9102, "Notification not found or access denied", HttpStatus.NOT_FOUND),
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized system error", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(int code, String message, HttpStatus statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
