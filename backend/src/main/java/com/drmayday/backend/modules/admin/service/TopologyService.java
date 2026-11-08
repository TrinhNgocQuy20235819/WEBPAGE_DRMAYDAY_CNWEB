package com.drmayday.backend.modules.admin.service;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.admin.dto.TopologyDtos.*;
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
public class TopologyService {

    private final AdminDataStore dataStore;
    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ==========================================
    // 1. CHI NHÁNH (BRANCHES)
    // ==========================================

    /**
     * branch01: set_branch - Tạo mới chi nhánh
     */
    public BranchResponse createBranch(CreateBranchRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên chi nhánh là bắt buộc");
        }
        if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Địa chỉ chi nhánh là bắt buộc");
        }
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Số điện thoại là bắt buộc");
        }

        long newId = dataStore.branchIdGen.incrementAndGet();
        String now = LocalDateTime.now().format(formatter);

        BranchResponse branch = BranchResponse.builder()
                .id(newId)
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .phone(request.getPhone().trim())
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        dataStore.branches.put(newId, branch);
        dataStore.saveToFile();
        return branch;
    }

    /**
     * branch02: get_list_branches - Lấy danh sách tất cả chi nhánh
     */
    public List<BranchResponse> getBranches() {
        return new ArrayList<>(dataStore.branches.values());
    }

    /**
     * branch03: get_branch_detail - Lấy chi tiết chi nhánh
     */
    public BranchResponse getBranchDetail(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        BranchResponse b = dataStore.branches.get(id);
        if (b == null) throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
        return b;
    }

    /**
     * branch04: edit_branch - Chỉnh sửa thông tin chi nhánh
     */
    public BranchResponse editBranch(Long id, EditBranchRequest request) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        BranchResponse existing = dataStore.branches.get(id);
        if (existing == null) throw new AppException(ErrorCode.BRANCH_NOT_FOUND);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getAddress() != null && !request.getAddress().trim().isEmpty()) {
            existing.setAddress(request.getAddress().trim());
        }
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            existing.setPhone(request.getPhone().trim());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }
        existing.setUpdatedAt(LocalDateTime.now().format(formatter));

        dataStore.branches.put(id, existing);
        dataStore.saveToFile();
        return existing;
    }

    /**
     * branch05: delete_branch - Xóa chi nhánh (RESTRICT nếu đang có khoa hoặc nhân sự trực thuộc)
     */
    public void deleteBranch(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        if (!dataStore.branches.containsKey(id)) throw new AppException(ErrorCode.BRANCH_NOT_FOUND);

        // Kiểm tra xem có khoa trực thuộc không
        boolean hasDept = dataStore.departments.values().stream()
                .anyMatch(d -> id.equals(d.getBranchId()));
        if (hasDept) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Không thể xóa chi nhánh đang có khoa phòng trực thuộc (RESTRICT)");
        }

        // Kiểm tra xem có nhân sự nào trực thuộc chi nhánh không
        boolean hasStaff = dataStore.users.values().stream()
                .anyMatch(u -> id.equals(u.getBranchId()));
        if (hasStaff) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "Không thể xóa chi nhánh đang có nhân sự công tác (RESTRICT)");
        }

        dataStore.branches.remove(id);
        dataStore.saveToFile();
    }

    // ==========================================
    // 2. KHOA CHUYÊN MÔN (DEPARTMENTS)
    // ==========================================

    /**
     * dept01: set_department - Tạo mới chuyên khoa trực thuộc chi nhánh
     */
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên khoa không được để trống");
        }
        if (request.getBranchId() == null || !dataStore.branches.containsKey(request.getBranchId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "branch_id không tồn tại");
        }

        long newId = dataStore.departmentIdGen.incrementAndGet();
        String now = LocalDateTime.now().format(formatter);

        DepartmentResponse dept = DepartmentResponse.builder()
                .id(newId)
                .name(request.getName().trim())
                .description(request.getDescription())
                .branchId(request.getBranchId())
                .createdAt(now)
                .build();

        dataStore.departments.put(newId, dept);
        dataStore.saveToFile();
        return dept;
    }

    /**
     * dept02: get_list_departments - Lấy danh sách chuyên khoa
     */
    public List<DepartmentResponse> getDepartments(Long branchId) {
        if (branchId != null) {
            return dataStore.departments.values().stream()
                    .filter(d -> branchId.equals(d.getBranchId()))
                    .collect(Collectors.toList());
        }
        return new ArrayList<>(dataStore.departments.values());
    }

    /**
     * dept03: get_department_detail - Chi tiết chuyên khoa
     */
    public DepartmentResponse getDepartmentDetail(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        DepartmentResponse d = dataStore.departments.get(id);
        if (d == null) throw new AppException(ErrorCode.DEPARTMENT_NOT_FOUND);
        return d;
    }

    /**
     * dept04: edit_department - Chỉnh sửa thông tin khoa
     */
    public DepartmentResponse editDepartment(Long id, EditDepartmentRequest request) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        DepartmentResponse existing = dataStore.departments.get(id);
        if (existing == null) throw new AppException(ErrorCode.DEPARTMENT_NOT_FOUND);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getBranchId() != null) {
            if (!dataStore.branches.containsKey(request.getBranchId())) {
                throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "branch_id không tồn tại");
            }
            existing.setBranchId(request.getBranchId());
        }

        dataStore.departments.put(id, existing);
        dataStore.saveToFile();
        return existing;
    }

    /**
     * dept05: delete_department - Xóa khoa (Tự động chuyển các phòng trực thuộc về department_id = null theo ON DELETE SET NULL)
     */
    public void deleteDepartment(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        DepartmentResponse removed = dataStore.departments.remove(id);
        if (removed == null) throw new AppException(ErrorCode.DEPARTMENT_NOT_FOUND);

        // ON DELETE SET NULL: Cập nhật các phòng khám trực thuộc khoa này về null
        for (RoomResponse room : dataStore.rooms.values()) {
            if (id.equals(room.getDepartmentId())) {
                room.setDepartmentId(null);
            }
        }
        dataStore.saveToFile();
    }

    // ==========================================
    // 3. PHÒNG KHÁM / PHÒNG CHỨC NĂNG (ROOMS)
    // ==========================================

    /**
     * room01: set_room - Thêm mới một phòng khám trực thuộc khoa
     */
    public RoomResponse createRoom(CreateRoomRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PARAM, "Tên phòng khám không được để trống");
        }
        if (request.getDepartmentId() == null || !dataStore.departments.containsKey(request.getDepartmentId())) {
            throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "department_id không tồn tại");
        }

        long newId = dataStore.roomIdGen.incrementAndGet();
        String now = LocalDateTime.now().format(formatter);

        RoomResponse room = RoomResponse.builder()
                .id(newId)
                .name(request.getName().trim())
                .description(request.getDescription())
                .departmentId(request.getDepartmentId())
                .createdAt(now)
                .build();

        dataStore.rooms.put(newId, room);
        dataStore.saveToFile();
        return room;
    }

    /**
     * room02: get_list_rooms - Lấy danh sách phòng khám
     */
    public List<RoomResponse> getRooms(Long departmentId) {
        if (departmentId != null) {
            return dataStore.rooms.values().stream()
                    .filter(r -> departmentId.equals(r.getDepartmentId()))
                    .collect(Collectors.toList());
        }
        return new ArrayList<>(dataStore.rooms.values());
    }

    /**
     * room03: get_room_detail - Chi tiết phòng khám
     */
    public RoomResponse getRoomDetail(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        RoomResponse r = dataStore.rooms.get(id);
        if (r == null) throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        return r;
    }

    /**
     * room04: edit_room - Chỉnh sửa phòng khám
     */
    public RoomResponse editRoom(Long id, EditRoomRequest request) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        RoomResponse existing = dataStore.rooms.get(id);
        if (existing == null) throw new AppException(ErrorCode.ROOM_NOT_FOUND);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getDepartmentId() != null) {
            if (!dataStore.departments.containsKey(request.getDepartmentId())) {
                throw new AppException(ErrorCode.INVALID_PARAM_VALUE, "department_id không tồn tại");
            }
            existing.setDepartmentId(request.getDepartmentId());
        }

        dataStore.rooms.put(id, existing);
        dataStore.saveToFile();
        return existing;
    }

    /**
     * room05: delete_room - Xóa phòng khám (RESTRICT nếu đang có nhân sự công tác)
     */
    public void deleteRoom(Long id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_PARAM);
        if (!dataStore.rooms.containsKey(id)) throw new AppException(ErrorCode.ROOM_NOT_FOUND);

        boolean hasStaff = dataStore.users.values().stream()
                .anyMatch(u -> id.equals(u.getRoomId()));
        if (hasStaff) {
            throw new AppException(ErrorCode.ROOM_IN_USE);
        }

        dataStore.rooms.remove(id);
        dataStore.saveToFile();
    }
}
