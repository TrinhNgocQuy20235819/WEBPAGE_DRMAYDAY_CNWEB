package com.drmayday.backend.modules.admin.model;

import com.drmayday.backend.modules.admin.dto.FormBuilderDtos.*;
import com.drmayday.backend.modules.admin.dto.RbacDtos.*;
import com.drmayday.backend.modules.admin.dto.TopologyDtos.*;
import com.drmayday.backend.modules.admin.dto.UserDtos.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class AdminDataStore {

    private final ObjectMapper objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    private final File storeFile = new File("data/admin_store.json");

    // Slide 3 Stores
    public final Map<Long, UserDetailDto> users = new ConcurrentHashMap<>();
    public final Map<Long, RoleResponse> roles = new ConcurrentHashMap<>();
    public final Map<Long, PermissionResponse> permissions = new ConcurrentHashMap<>();
    public final Map<Long, Set<Long>> rolePermissions = new ConcurrentHashMap<>(); // roleId -> Set<permissionId>
    public final Map<String, Long> rolePermissionLinkIds = new ConcurrentHashMap<>(); // "roleId:permId" -> linkId

    // Slide 4 Stores
    public final Map<Long, BranchResponse> branches = new ConcurrentHashMap<>();
    public final Map<Long, DepartmentResponse> departments = new ConcurrentHashMap<>();
    public final Map<Long, RoomResponse> rooms = new ConcurrentHashMap<>();

    // Slide 11 Stores
    public final Map<String, TemplateDetailResponse> templates = new ConcurrentHashMap<>(); // key is code_template

    // ID Generators
    public final AtomicLong userIdGen = new AtomicLong(100);
    public final AtomicLong roleIdGen = new AtomicLong(10);
    public final AtomicLong permIdGen = new AtomicLong(20);
    public final AtomicLong rolePermLinkIdGen = new AtomicLong(100);
    public final AtomicLong branchIdGen = new AtomicLong(10);
    public final AtomicLong departmentIdGen = new AtomicLong(10);
    public final AtomicLong roomIdGen = new AtomicLong(10);
    public final AtomicLong sectionIdGen = new AtomicLong(10);
    public final AtomicLong questionIdGen = new AtomicLong(10);
    public final AtomicLong optionIdGen = new AtomicLong(10);

    // Track medical records linked to templates (Slide 11 rule: cannot delete template if in use)
    public final Set<String> templatesInUse = ConcurrentHashMap.newKeySet();

    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @PostConstruct
    public synchronized void init() {
        if (storeFile.exists() && storeFile.length() > 0) {
            try {
                loadFromFile();
                return;
            } catch (Exception e) {
                System.err.println("[AdminDataStore] Warning: Could not load store from file, loading defaults: " + e.getMessage());
            }
        }
        loadDefaultSeedData();
        saveToFile();
    }

    public synchronized void saveToFile() {
        try {
            storeFile.getParentFile().mkdirs();
            Map<String, Object> state = new HashMap<>();
            state.put("users", users);
            state.put("roles", roles);
            state.put("permissions", permissions);
            state.put("rolePermissions", rolePermissions);
            state.put("branches", branches);
            state.put("departments", departments);
            state.put("rooms", rooms);
            state.put("templates", templates);
            state.put("templatesInUse", templatesInUse);
            objectMapper.writeValue(storeFile, state);
        } catch (IOException e) {
            System.err.println("[AdminDataStore] Error saving store to file: " + e.getMessage());
        }
    }

    private synchronized void loadFromFile() throws IOException {
        Map<String, Object> state = objectMapper.readValue(storeFile, new TypeReference<>() {});
        // If needed, deserialize into collections or fallback
        if (state.isEmpty()) {
            loadDefaultSeedData();
        }
    }

    public void loadDefaultSeedData() {
        String now = LocalDateTime.now().format(formatter);

        // 1. Roles
        RoleResponse adminRole = RoleResponse.builder().id(1L).name("Admin").description("Quản trị viên toàn hệ thống").build();
        RoleResponse doctorRole = RoleResponse.builder().id(2L).name("Bác sĩ").description("Bác sĩ khám và điều trị mề đay").build();
        RoleResponse nurseRole = RoleResponse.builder().id(3L).name("Điều dưỡng").description("Điều dưỡng tiếp đón và đo dấu hiệu sinh tồn").build();
        RoleResponse patientRole = RoleResponse.builder().id(4L).name("Bệnh nhân").description("Người bệnh theo dõi tiến triển mề đay").build();

        roles.put(1L, adminRole);
        roles.put(2L, doctorRole);
        roles.put(3L, nurseRole);
        roles.put(4L, patientRole);

        // 2. Permissions
        PermissionResponse p1 = PermissionResponse.builder().id(1L).name("manage_users").description("Quản lý tài khoản người dùng").createdAt(now).updatedAt(now).build();
        PermissionResponse p2 = PermissionResponse.builder().id(2L).name("manage_roles").description("Quản lý vai trò và phân quyền").createdAt(now).updatedAt(now).build();
        PermissionResponse p3 = PermissionResponse.builder().id(3L).name("manage_topology").description("Quản lý hạ tầng cơ sở, khoa, phòng").createdAt(now).updatedAt(now).build();
        PermissionResponse p4 = PermissionResponse.builder().id(4L).name("manage_templates").description("Thiết kế và cấu hình biểu mẫu khám động").createdAt(now).updatedAt(now).build();
        PermissionResponse p5 = PermissionResponse.builder().id(5L).name("view_medical_records").description("Xem hồ sơ bệnh án").createdAt(now).updatedAt(now).build();

        permissions.put(1L, p1);
        permissions.put(2L, p2);
        permissions.put(3L, p3);
        permissions.put(4L, p4);
        permissions.put(5L, p5);

        // Role - Permissions mapping
        rolePermissions.put(1L, new HashSet<>(Arrays.asList(1L, 2L, 3L, 4L, 5L)));
        rolePermissions.put(2L, new HashSet<>(Arrays.asList(4L, 5L)));
        rolePermissions.put(3L, new HashSet<>(Collections.singletonList(5L)));
        rolePermissions.put(4L, new HashSet<>());

        // 3. Branches
        BranchResponse b1 = BranchResponse.builder().id(1L).name("Cơ sở 1 - Trung Tâm Da Liễu TW").address("15A Phương Mai, Đống Đa, Hà Nội").phone("02432238888").isActive(true).createdAt(now).updatedAt(now).build();
        BranchResponse b2 = BranchResponse.builder().id(2L).name("Cơ sở 2 - Trung Tâm Kỹ Thuật Cao").address("Đường Giải Phóng, Hai Bà Trưng, Hà Nội").phone("02432239999").isActive(true).createdAt(now).updatedAt(now).build();

        branches.put(1L, b1);
        branches.put(2L, b2);

        // 4. Departments
        DepartmentResponse d1 = DepartmentResponse.builder().id(1L).name("Khoa Khám Bệnh Chuyên Sâu").description("Khám ban đầu và tiếp nhận phân loại").branchId(1L).createdAt(now).build();
        DepartmentResponse d2 = DepartmentResponse.builder().id(2L).name("Khoa Miễn Dịch & Dị Ứng Da").description("Chuyên sâu mày đay mạn và phù mạch").branchId(1L).createdAt(now).build();
        DepartmentResponse d3 = DepartmentResponse.builder().id(3L).name("Khoa Tự Miễn & Tế Bào Gốc").description("Điều trị ca khó, kháng Histamine H1 liều cao").branchId(2L).createdAt(now).build();

        departments.put(1L, d1);
        departments.put(2L, d2);
        departments.put(3L, d3);

        // 5. Rooms
        RoomResponse r1 = RoomResponse.builder().id(1L).name("Phòng Khám Tiếp Đón Ban Đầu").departmentId(1L).description("Tiếp đón và sàng lọc báo động đỏ").createdAt(now).build();
        RoomResponse r2 = RoomResponse.builder().id(2L).name("Phòng Khám Chuyên Đề Mày Đay").departmentId(2L).description("Khám chuyên sâu mề đay mạn").createdAt(now).build();
        RoomResponse r3 = RoomResponse.builder().id(3L).name("Phòng Xét Nghiệm Dị Ứng & IgE").departmentId(2L).description("Xét nghiệm cận lâm sàng").createdAt(now).build();
        RoomResponse r4 = RoomResponse.builder().id(4L).name("Phòng Test Áp & Kích Thích Lạnh").departmentId(3L).description("Nghiệm pháp kích thích vật lý").createdAt(now).build();

        rooms.put(1L, r1);
        rooms.put(2L, r2);
        rooms.put(3L, r3);
        rooms.put(4L, r4);

        // 6. Users (Admin, Doctors, Patients)
        UserDetailDto adminUser = UserDetailDto.builder()
                .userId(1L)
                .ffullName("Quản Trị Viên Hệ Thống")
                .phone("0900000001")
                .roleId(1L)
                .isActive(1)
                .gender("Nam")
                .yearOfBirth(1985)
                .career("Quản trị hệ thống")
                .ethnic("Kinh")
                .cityAddress("Hà Nội")
                .branchId(1L)
                .departmentId(1L)
                .roomId(1L)
                .build();

        UserDetailDto doctor1 = UserDetailDto.builder()
                .userId(2L)
                .ffullName("TS.BS. Nguyễn Văn Hùng")
                .phone("0900000002")
                .roleId(2L)
                .isActive(1)
                .gender("Nam")
                .yearOfBirth(1978)
                .career("Bác sĩ Da liễu")
                .ethnic("Kinh")
                .cityAddress("Hà Nội")
                .branchId(1L)
                .departmentId(2L)
                .roomId(2L)
                .build();

        UserDetailDto patient1 = UserDetailDto.builder()
                .userId(3L)
                .ffullName("Nguyễn Thị Mai")
                .phone("0912345678")
                .roleId(4L)
                .isActive(1)
                .gender("Nu")
                .yearOfBirth(1994)
                .career("Can bo cong chuc")
                .ethnic("Kinh")
                .cityAddress("Hà Nội")
                .healthInsuranceCode("DN4010123456789")
                .firstVisit(now)
                .build();

        users.put(1L, adminUser);
        users.put(2L, doctor1);
        users.put(3L, patient1);

        // 7. Dynamic Form Templates (Slide 11)
        TemplateDetailResponse tmplAcute = TemplateDetailResponse.builder()
                .codeTemplate("TMPL_URT_ACUTE")
                .name("Phiếu Khai Thác Bệnh Sử Mề Đay Cấp Tính (< 6 tuần)")
                .description("Mẫu phiếu chuyên môn chuẩn hóa Bệnh viện Da liễu Trung ương cho mề đay cấp")
                .version("1.0")
                .isActive("1")
                .createdAt(now)
                .updatedAt(now)
                .sections(new ArrayList<>(Collections.singletonList(
                        SectionResponse.builder()
                                .sectionId("SEC_ACUTE_01")
                                .title("I. Thời gian khởi phát & Biểu hiện sẩn phù")
                                .order("1")
                                .filledBy("both")
                                .questions(new ArrayList<>(Arrays.asList(
                                        QuestionResponse.builder()
                                                .questionId("Q_DURATION")
                                                .questionText("Triệu chứng nổi sẩn phù mề đay đã xuất hiện trong bao lâu?")
                                                .typeQuestion("radio")
                                                .order("1")
                                                .isRequired("1")
                                                .options(Arrays.asList(
                                                        QuestionOptionDto.builder().id("OPT_D1").optionText("Dưới 24 giờ").optionValue("UNDER_24H").order("1").build(),
                                                        QuestionOptionDto.builder().id("OPT_D2").optionText("Từ 1 đến 6 tuần").optionValue("1_TO_6_WEEKS").order("2").build()
                                                ))
                                                .build(),
                                        QuestionResponse.builder()
                                                .questionId("Q_ITCH_LEVEL")
                                                .questionText("Mức độ ngứa ngáy khó chịu (Thang điểm NRS 0-10)")
                                                .typeQuestion("number")
                                                .order("2")
                                                .isRequired("1")
                                                .placeholder("Nhập điểm từ 0 đến 10")
                                                .build()
                                )))
                                .build()
                )))
                .build();

        TemplateDetailResponse tmplChronic = TemplateDetailResponse.builder()
                .codeTemplate("TMPL_URT_CHRONIC")
                .name("Phiếu Đánh Giá Mề Đay Mạn Tính (≥ 6 tuần) & Thang Điểm UAS7")
                .description("Mẫu phiếu đánh giá bệnh mạn tính tự phát (CSU) và cảm ứng (CIndU)")
                .version("1.0")
                .isActive("1")
                .createdAt(now)
                .updatedAt(now)
                .sections(new ArrayList<>(Collections.singletonList(
                        SectionResponse.builder()
                                .sectionId("SEC_CHRONIC_01")
                                .title("I. Tiền sử đợt bệnh & Yếu tố kích thích")
                                .order("1")
                                .filledBy("doctor")
                                .questions(new ArrayList<>(Collections.singletonList(
                                        QuestionResponse.builder()
                                                .questionId("Q_TRIGGER_PHYSICAL")
                                                .questionText("Sẩn phù có khởi phát sau cọ xát, nhiệt độ lạnh hay vận động không?")
                                                .typeQuestion("radio")
                                                .order("1")
                                                .isRequired("1")
                                                .options(Arrays.asList(
                                                        QuestionOptionDto.builder().id("OPT_T1").optionText("Có yếu tố kích thích rõ rệt").optionValue("YES").order("1").build(),
                                                        QuestionOptionDto.builder().id("OPT_T2").optionText("Tự phát, không có yếu tố kích thích").optionValue("NO").order("2").build()
                                                ))
                                                .build()
                                )))
                                .build()
                )))
                .build();

        templates.put("TMPL_URT_ACUTE", tmplAcute);
        templates.put("TMPL_URT_CHRONIC", tmplChronic);

        // Mark chronic as in use to test 4105 constraint
        templatesInUse.add("TMPL_URT_CHRONIC");
    }
}
