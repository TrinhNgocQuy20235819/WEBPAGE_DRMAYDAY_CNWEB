package com.drmayday.backend.common;
import java.util.LinkedHashMap;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.dao.DataAccessException;
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(AppException.class)
    public ResponseEntity<Object> app(AppException ex) { return error(ex.getErrorCode()); }
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> authentication(AuthenticationException ex) { return error(ErrorCode.UNAUTHENTICATED); }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> denied(AccessDeniedException ex) { return error(ErrorCode.ACCESS_DENIED); }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Object> conflict(org.springframework.dao.DataIntegrityViolationException ex) { return error(ErrorCode.RBAC_CONFLICT); }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Object> storage(DataAccessException ex) { return error(ErrorCode.SECURITY_UNAVAILABLE); }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> argument(IllegalArgumentException ex) { return error(ErrorCode.INVALID_PARAM); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> unexpected(Exception ex) {
        // Log only the exception type: SQL/driver messages may contain credentials or request data.
        LoggerFactory.getLogger(getClass()).error("Unhandled request failure: {}", ex.getClass().getName());
        return error(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }
    @Override protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var fields = new LinkedHashMap<String, String>();
        ex.getBindingResult().getFieldErrors().forEach(e -> fields.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiResponse.builder().code(2001)
                .message(ErrorCode.INVALID_PARAM.getMessage()).data(fields).build());
    }
    @Override protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ErrorCode code = switch (status.value()) {
            case 400 -> ex instanceof org.springframework.web.bind.ServletRequestBindingException
                    ? ErrorCode.INVALID_PARAM : ErrorCode.INVALID_FORMAT;
            case 401 -> ErrorCode.UNAUTHENTICATED;
            case 403 -> ErrorCode.ACCESS_DENIED;
            case 404 -> ErrorCode.ENDPOINT_NOT_FOUND;
            case 405 -> ErrorCode.METHOD_NOT_ALLOWED;
            case 415 -> ErrorCode.UNSUPPORTED_MEDIA;
            default -> status.is5xxServerError() ? ErrorCode.UNCATEGORIZED_EXCEPTION : ErrorCode.INVALID_FORMAT;
        };
        return ResponseEntity.status(status).headers(headers).body(ApiResponse.error(code));
    }
    private ResponseEntity<Object> error(ErrorCode code) {
        return ResponseEntity.status(code.getStatusCode()).body(ApiResponse.error(code));
    }
}
