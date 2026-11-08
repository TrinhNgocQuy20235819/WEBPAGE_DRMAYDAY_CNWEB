import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_RECORDS } from "../../services/mockData";

export default function DoctorLabRequests() {
  const [records] = useState(INITIAL_RECORDS);
  const [selectedRecordId, setSelectedRecordId] = useState(INITIAL_RECORDS[0].id);
  const [activeTab, setActiveTab] = useState("results"); // 'results' | 'create'

  // Standard Dermatology Lab Test Catalog (Bộ xét nghiệm chuẩn Slide 7 & Hướng dẫn BYT)
  const LAB_CATALOG = [
    {
      code: "LAB_IGE",
      name: "Định lượng IgE toàn phần huyết thanh",
      category: "Miễn dịch dị ứng",
      indication: "Xác định cơ địa dị ứng và phân tầng chỉ định Omalizumab",
      turnaround: "2 giờ",
    },
    {
      code: "LAB_CBC",
      name: "Tổng phân tích tế bào máu ngoại vi (24 thông số)",
      category: "Huyết học",
      indication: "Đánh giá bạch cầu ái toan (Eosinophil) & dấu hiệu nhiễm trùng",
      turnaround: "30 phút",
    },
    {
      code: "LAB_DERMO",
      name: "Test da vẽ nổi cơ học (FricTest)",
      category: "Kích thích vật lý",
      indication: "Chẩn đoán mày đay vật lý thể da vẽ nổi có triệu chứng",
      turnaround: "15 phút",
    },
    {
      code: "LAB_COLD",
      name: "Test kích thích áp lạnh (TempTest / Ice Cube)",
      category: "Kích thích vật lý",
      indication: "Chẩn đoán mày đay do lạnh và đo ngưỡng nhiệt độ phát bệnh",
      turnaround: "20 phút",
    },
    {
      code: "LAB_AUTO_AB",
      name: "Kháng thể tự miễn (ANA, Anti-TPO, Anti-TG)",
      category: "Tự miễn",
      indication: "Tầm soát bệnh lý tuyến giáp tự miễn phối hợp mày đay mạn",
      turnaround: "4 giờ",
    },
    {
      code: "LAB_CRP_ESR",
      name: "Tốc độ máu lắng (ESR) & Protein phản ứng C (hs-CRP)",
      category: "Sinh hóa",
      indication: "Loại trừ viêm mạch mày đay (Urticarial Vasculitis)",
      turnaround: "1 giờ",
    },
  ];

  // Existing Lab Results State (Slide 7 lab02)
  const [labResults, setLabResults] = useState([
    {
      id: "LAB-RES-2026-001",
      record_id: "rec_1",
      patient_name: "Nguyễn Thị Mai",
      record_code: "BA-2026-1042",
      test_code: "LAB_IGE",
      test_name: "Định lượng IgE toàn phần huyết thanh",
      result_value: "348.5",
      unit: "IU/mL",
      reference_range: "0 - 100",
      evaluation: "Tăng cao",
      status: "completed",
      completed_at: "08/03/2026 09:30",
      technician: "KTV. Lê Thị Thảo",
      doctor_notes: "Đáp ứng tiêu chuẩn xem xét kháng thể đơn dòng Omalizumab",
    },
    {
      id: "LAB-RES-2026-002",
      record_id: "rec_1",
      patient_name: "Nguyễn Thị Mai",
      record_code: "BA-2026-1042",
      test_code: "LAB_CBC",
      test_name: "Tổng phân tích tế bào máu ngoại vi",
      result_value: "Eos: 6.8%",
      unit: "%",
      reference_range: "0.5 - 5.0",
      evaluation: "Tăng nhẹ",
      status: "completed",
      completed_at: "08/03/2026 09:15",
      technician: "KTV. Lê Thị Thảo",
      doctor_notes: "Bạch cầu ái toan tăng phù hợp cơ địa dị ứng",
    },
    {
      id: "LAB-RES-2026-003",
      record_id: "rec_1",
      patient_name: "Nguyễn Thị Mai",
      record_code: "BA-2026-1042",
      test_code: "LAB_DERMO",
      test_name: "Test da vẽ nổi cơ học (FricTest)",
      result_value: "Dương tính (+)",
      unit: "Độ 2",
      reference_range: "Âm tính (-)",
      evaluation: "Bất thường",
      status: "completed",
      completed_at: "08/03/2026 08:45",
      technician: "TS.BS. Nguyễn Văn Hùng",
      doctor_notes: "Xuất hiện sẩn phù dọc đường gạch sau 5 phút kèm ngứa",
    },
    {
      id: "LAB-RES-2026-004",
      record_id: "rec_2",
      patient_name: "Trần Văn Nam",
      record_code: "BA-2026-1043",
      test_code: "LAB_AUTO_AB",
      test_name: "Kháng thể tự miễn (ANA, Anti-TPO)",
      result_value: "Chờ kết quả",
      unit: "IU/mL",
      reference_range: "< 34",
      evaluation: "Đang phân tích",
      status: "processing",
      completed_at: "Dự kiến 11:30",
      technician: "Phòng Xét nghiệm Miễn dịch",
      doctor_notes: "Tầm soát tự miễn do sẩn phù dai dẳng trên 8 tuần",
    },
  ]);

  // Form State for lab01 Create Request
  const [selectedTests, setSelectedTests] = useState(["LAB_IGE", "LAB_CBC"]);
  const [priority, setPriority] = useState("routine"); // 'routine' | 'urgent'
  const [labNotes, setLabNotes] = useState("");

  const currentRecord = records.find((r) => r.id === selectedRecordId) || records[0];

  const handleToggleTest = (code) => {
    if (selectedTests.includes(code)) {
      setSelectedTests(selectedTests.filter((c) => c !== code));
    } else {
      setSelectedTests([...selectedTests, code]);
    }
  };

  const handleCreateLabRequest = (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      toast.error("Vui lòng chọn ít nhất một xét nghiệm cận lâm sàng");
      return;
    }

    const newRequests = selectedTests.map((code) => {
      const catalogItem = LAB_CATALOG.find((t) => t.code === code);
      return {
        id: `LAB-RES-${Date.now().toString().slice(-4)}`,
        record_id: currentRecord.id,
        patient_name: currentRecord.patient_name,
        record_code: currentRecord.record_code,
        test_code: code,
        test_name: catalogItem?.name || code,
        result_value: "Chờ lấy mẫu",
        unit: "—",
        reference_range: "Tiêu chuẩn BYT",
        evaluation: priority === "urgent" ? "Khẩn cấp" : "Đang chờ",
        status: "pending",
        completed_at: `Chỉ định lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
        technician: "Chưa phân công",
        doctor_notes: labNotes || "Chỉ định lâm sàng thường quy",
      };
    });

    setLabResults([...newRequests, ...labResults]);
    toast.success(`Đã phát ${newRequests.length} phiếu chỉ định cận lâm sàng thành công!`);
    setActiveTab("results");
    setSelectedTests([]);
    setLabNotes("");
  };

  const filteredResults = labResults.filter((r) => r.record_id === currentRecord.id);

  return (
    <div className="space-y-6">
      {/* 1. Hero Header */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Chỉ Định Cận Lâm Sàng &amp; Xét Nghiệm</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-flask text-sm"></span>
              <span>Phiếu chỉ định IgE, huyết học, test vật lý và trả kết quả</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Quay lại hàng đợi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Patient Context Switcher */}
      <div className="base-card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-gray-500">Ca bệnh đang chọn:</span>
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="base-select text-xs font-bold text-gray-900 border border-[var(--base-border-opaque)] px-3 py-1.5 bg-white"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.record_code} — {r.patient_name} ({r.patient_age} tuổi)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Chẩn đoán: <strong className="text-gray-900">{currentRecord.diagnosis}</strong></span>
            <span>•</span>
            <span>Phân loại: <strong className="text-[var(--base-brand-blue)]">
              {currentRecord.clinical_type === "chronic" ? "Mạn tính" : "Cấp tính"}
            </strong></span>
          </div>
        </div>
      </div>

      {/* 3. Line Tab Navigation */}
      <div className="base-tab-nav">
        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`base-tab-item ${activeTab === "results" ? "is-active" : ""}`}
        >
          <span className="isax icon-document-text text-base"></span>
          <span>Kết Quả Xét Nghiệm ({filteredResults.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`base-tab-item ${activeTab === "create" ? "is-active" : ""}`}
        >
          <span className="isax icon-add-circle text-base"></span>
          <span>Tạo Chỉ Định Mới (lab01)</span>
        </button>
      </div>

      {/* Tab 1: Kết Quả Xét Nghiệm (lab02) */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bảng Kết Quả Cận Lâm Sàng &amp; Miễn Dịch</h2>
              <p className="text-xs text-gray-500">Đồng bộ tự động từ phòng xét nghiệm LIS Bệnh viện Da liễu TW</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer"
            >
              <span className="isax icon-add text-sm"></span>
              <span>Chỉ định thêm</span>
            </button>
          </div>

          {filteredResults.length === 0 ? (
            <div className="base-card p-12 text-center">
              <span className="isax icon-flask text-4xl text-gray-300 block mb-2"></span>
              <p className="text-sm font-bold text-gray-600">Chưa có chỉ định xét nghiệm nào cho ca bệnh này</p>
              <p className="text-xs text-gray-400 mt-1">Bấm nút "Tạo Chỉ Định Mới" ở trên để chỉ định xét nghiệm IgE, CTM, test da vẽ nổi.</p>
            </div>
          ) : (
            <div className="base-table-container">
              <table className="base-table">
                <thead>
                  <tr>
                    <th>Mã Phiếu &amp; Tên Xét Nghiệm</th>
                    <th>Kết Quả Đo Được</th>
                    <th>Trị Số Tham Chiếu</th>
                    <th>Đánh Giá Lâm Sàng</th>
                    <th>Trạng Thái</th>
                    <th>Thời Gian / Người Thực Hiện</th>
                    <th>Ghi Chú Y Tế</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold text-gray-900">{item.test_name}</div>
                        <span className="font-mono text-[10px] text-gray-400">{item.id}</span>
                      </td>
                      <td>
                        <span className="font-mono font-extrabold text-sm text-[var(--base-brand-navy)]">
                          {item.result_value}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                      </td>
                      <td className="text-xs text-gray-600 font-mono">
                        {item.reference_range} {item.unit}
                      </td>
                      <td>
                        {item.evaluation === "Tăng cao" && (
                          <span className="base-tag base-tag-negative font-bold text-[10px]">Tăng cao</span>
                        )}
                        {item.evaluation === "Tăng nhẹ" && (
                          <span className="base-tag base-tag-warning font-bold text-[10px]">Tăng nhẹ</span>
                        )}
                        {item.evaluation === "Bất thường" && (
                          <span className="base-tag base-tag-negative font-bold text-[10px]">Bất thường</span>
                        )}
                        {item.evaluation === "Bình thường" && (
                          <span className="base-tag base-tag-positive font-bold text-[10px]">Bình thường</span>
                        )}
                        {item.evaluation === "Đang phân tích" && (
                          <span className="base-tag base-tag-info font-bold text-[10px]">Đang phân tích</span>
                        )}
                        {item.evaluation === "Đang chờ" && (
                          <span className="base-tag text-[10px] bg-gray-100 text-gray-600">Đang chờ</span>
                        )}
                        {item.evaluation === "Khẩn cấp" && (
                          <span className="base-tag base-tag-negative font-bold text-[10px] animate-pulse">Khẩn cấp</span>
                        )}
                      </td>
                      <td>
                        {item.status === "completed" ? (
                          <span className="base-tag base-tag-positive text-[10px]">
                            <span className="isax icon-tick-circle text-xs"></span>
                            <span>Đã có kết quả</span>
                          </span>
                        ) : item.status === "processing" ? (
                          <span className="base-tag base-tag-info text-[10px]">
                            <span className="isax icon-clock text-xs"></span>
                            <span>Đang phân tích</span>
                          </span>
                        ) : (
                          <span className="base-tag text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="isax icon-clock text-xs"></span>
                            <span>Chờ lấy mẫu</span>
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-gray-600">
                        <div>{item.completed_at}</div>
                        <div className="text-[11px] text-gray-400">{item.technician}</div>
                      </td>
                      <td className="text-xs text-gray-600 max-w-xs truncate" title={item.doctor_notes}>
                        {item.doctor_notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tạo Chỉ Định Mới (lab01) */}
      {activeTab === "create" && (
        <form onSubmit={handleCreateLabRequest} className="base-card p-6 space-y-6">
          <div className="pb-4 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Phiếu Chỉ Định Cận Lâm Sàng &amp; Thử Nghiệm</h2>
              <p className="text-xs text-gray-500 mt-0.5">Chọn danh mục xét nghiệm cần thực hiện cho {currentRecord.patient_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">Mức độ ưu tiên:</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("routine")}
                  className={`px-3 py-1 text-xs font-bold border cursor-pointer ${
                    priority === "routine"
                      ? "bg-[var(--base-brand-navy)] text-white border-[var(--base-brand-navy)]"
                      : "bg-white text-gray-600 border-[var(--base-border-opaque)]"
                  }`}
                >
                  Thường quy
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={`px-3 py-1 text-xs font-bold border cursor-pointer ${
                    priority === "urgent"
                      ? "bg-rose-600 text-white border-rose-600 animate-pulse"
                      : "bg-white text-gray-600 border-[var(--base-border-opaque)]"
                  }`}
                >
                  Khẩn cấp
                </button>
              </div>
            </div>
          </div>

          {/* Test Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LAB_CATALOG.map((test) => {
              const isSelected = selectedTests.includes(test.code);
              return (
                <div
                  key={test.code}
                  onClick={() => handleToggleTest(test.code)}
                  className={`p-4 border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--base-brand-blue)] bg-blue-50/60 shadow-xs"
                      : "border-[var(--base-border-opaque)] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div click
                        className="mt-1 h-4 w-4 text-[var(--base-brand-blue)]"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 leading-snug">{test.name}</div>
                        <span className="base-tag text-[9px] font-mono mt-1 bg-gray-100 text-gray-600">
                          {test.category}
                        </span>
                        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{test.indication}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0 flex items-center gap-1">
                      <span className="isax icon-clock text-xs"></span>
                      {test.turnaround}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes for Lab Tech */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Ghi chú lâm sàng cho phòng xét nghiệm
            </label>
            <textarea
              rows={3}
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              placeholder="Ví dụ: Bệnh nhân có tiền sử phù mạch mi mắt, sẩn ngứa bùng phát tái diễn trên 8 tuần..."
              className="base-textarea w-full text-xs p-3 border border-[var(--base-border-opaque)] bg-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--base-border-opaque)]">
            <span className="text-xs text-gray-500">
              Đã chọn: <strong className="text-gray-900">{selectedTests.length}</strong> xét nghiệm
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("results")}
                className="base-btn base-btn-secondary text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="base-btn base-btn-primary text-xs cursor-pointer flex items-center gap-2"
              >
                <span className="isax icon-tick-circle text-base"></span>
                <span>Phát Phiếu Chỉ Định (lab01)</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
