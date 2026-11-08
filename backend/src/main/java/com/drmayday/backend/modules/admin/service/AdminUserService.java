package com.drmayday.backend.modules.admin.service;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.admin.dto.UserDtos.*;
import com.drmayday.backend.modules.admin.model.AdminDataStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AdminDataStore dataStore;
    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * admin02: Lấy danh sách người dùng có phân trang (page, limit, role_id)
     */
    public UserListResponse getListUsers(Integer page, Integer limit, Long roleId) {
        int pageNum = (page != null && page > 0) ? page : 1;
        int pageSize = (limit != null && limit > 0) ? limit : 20;

        List<UserDetailDto> all = new ArrayList<>(dataStore.users.values());

        // Lọc theo roleId nếu có
        if (roleId != null) {
            all = all.stream()
                    .filter(u -> roleId.equals(u.getRoleId()))
                    .collect(Collectors.toList());
        }

        long total = all.size();

        // Phân trang
        int fromIndex = (pageNum - 1) * pageSize;
        List<UserSummaryDto> pagedData;
        if (fromIndex >= all.size()) {
            pagedData = new ArrayList<>();
        } else {
            int toIndex = Math.min(fromIndex + pageSize, all.size());
            pagedData = all.subList(fromIndex, toIndex).stream()
                    .map(u -> UserSummaryDto.builder()
                            .userId(u.getUserId())
                            .ffullName(u.getFfullName())
                            .phone(u.getPhone())
                            .roleId(u.getRoleId())
                            .isActive(u.getIsActive())
                            .build())
                    .collect(Collectors.toList());
        }

        return UserListResponse.builder()
                .total(total)
                .data(pagedData)
                .build();
    }

    /**
     * admin03: Lấy chi tiết một người dùng
     */
    public UserDetailDto getUserDetails(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        UserDetailDto user = dataStore.users.get(id);
        if (user == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    /**
     * admin01: Tạo người dùng mới, kiểm tra trùng SĐT (mã 3006)
     */
    public UserDetailDto createUser(CreateUserRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }

        String phone = request.getPhone() != null ? request.getPhone().trim() : "";
        if (phone.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Số điện thoại là bắt buộc");
        }

        // Kiểm tra định dạng SĐT (10 chữ số)
        if (!phone.matches("^[0-9]{10}$")) {
            throw new AppException(ErrorCode.INVALID_FORMAT, "Số điện thoại phải gồm đúng 10 chữ số");
        }

        // Kiểm tra trùng SĐT (Mã 3006: User phone already exists)
        boolean exists = dataStore.users.values().stream()
                .anyMatch(u -> phone.equals(u.getPhone()));
        if (exists) {
            throw new AppException(ErrorCode.USER_PHONE_EXISTS);
        }

        // Kiểm tra vai trò role_id
        if (request.getRoleId() == null || !dataStore.roles.containsKey(request.getRoleId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Vai trò không hợp lệ");
        }

        long newId = dataStore.userIdGen.incrementAndGet();
        String name = request.getEffectiveFullName();

        UserDetailDto newUser = UserDetailDto.builder()
                .userId(newId)
                .ffullName(name)
                .phone(phone)
                .roleId(request.getRoleId())
                .isActive(request.getIsActive() != null ? request.getIsActive() : 1)
                .gender(request.getGender() != null ? request.getGender() : "Nam")
                .firstVisit(LocalDateTime.now().format(formatter))
                .build();

        dataStore.users.put(newId, newUser);
        dataStore.saveToFile();
        return newUser;
    }

    /**
     * admin04: Chỉnh sửa người dùng
     */
    public UserDetailDto editUser(Long id, EditUserRequest request) {
        if (id == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        UserDetailDto existing = dataStore.users.get(id);
        if (existing == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        if (request.getEffectiveFullName() != null) {
            existing.setFfullName(request.getEffectiveFullName());
        }
        if (request.getGender() != null) {
            existing.setGender(request.getGender());
        }
        if (request.getRoleId() != null) {
            if (!dataStore.roles.containsKey(request.getRoleId())) {
                throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Vai trò không hợp lệ");
            }
            existing.setRoleId(request.getRoleId());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }

        dataStore.users.put(id, existing);
        dataStore.saveToFile();
        return existing;
    }

    /**
     * admin05: Xóa người dùng (Bảo vệ dữ liệu y tế, medical_records giữ nguyên)
     */
    public void deleteUser(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        UserDetailDto removed = dataStore.users.remove(id);
        if (removed == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        dataStore.saveToFile();
    }

    /**
     * admin06: Phân công công tác nhân viên vào chi nhánh, khoa, phòng
     */
    public AssignmentResponse assignUser(Long id, AssignUserRequest request) {
        if (id == null || request == null) {
            throw new AppException(ErrorCode.INVALID_PARAM);
        }
        UserDetailDto user = dataStore.users.get(id);
        if (user == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        // Kiểm tra branch_id
        if (!dataStore.branches.containsKey(request.getBranchId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Chi nhánh không tồn tại");
        }

        // Kiểm tra department_id trực thuộc branch_id
        var dept = dataStore.departments.get(request.getDepartmentId());
        if (dept == null || !request.getBranchId().equals(dept.getBranchId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Khoa không trực thuộc chi nhánh này");
        }

        // Nếu có room_id, kiểm tra room_id trực thuộc department_id
        if (request.getRoomId() != null) {
            var room = dataStore.rooms.get(request.getRoomId());
            if (room == null || !request.getDepartmentId().equals(room.getDepartmentId())) {
                throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Phòng khám không trực thuộc khoa này");
            }
        }

        // Cập nhật vị trí công tác
        user.setBranchId(request.getBranchId());
        user.setDepartmentId(request.getDepartmentId());
        user.setRoomId(request.getRoomId());

        dataStore.users.put(id, user);
        dataStore.saveToFile();

        return AssignmentResponse.builder()
                .userId(id)
                .branchId(request.getBranchId())
                .departmentId(request.getDepartmentId())
                .roomId(request.getRoomId())
                .build();
    }
}
