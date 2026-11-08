import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

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
    name: "Tổng phân tích tế bào máu ngoại vi (WBC, Eosinophil)",
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
    code: "LAB_ASST",
    name: "Test huyết thanh tự thân trong da (ASST)",
    category: "Tự miễn",
    indication: "Tầm soát mày đay mạn tự miễn qua tự kháng thể",
    turnaround: "30 phút",
  },
  {
    code: "LAB_AUTO_AB",
    name: "Kháng thể tự miễn tuyến giáp (Anti-TPO, TSH)",
    category: "Tự miễn",
    indication: "Tầm soát bệnh lý tuyến giáp tự miễn phối hợp mày đay mạn",
    turnaround: "4 giờ",
  },
  {
    code: "LAB_CRP_ESR",
    name: "Protein phản ứng C (hs-CRP) & Tốc độ máu lắng",
    category: "Sinh hóa",
    indication: "Loại trừ viêm mạch mày đay (Urticarial Vasculitis)",
    turnaround: "1 giờ",
  },
];

function expandLabRows(dbRows) {
  const displayRows = [];
  for (const row of dbRows) {
    const baseTime = row.thoi_diem_thuc_hien
      ? new Date(row.thoi_diem_thuc_hien).toLocaleString("vi-VN")
      : "Vừa cập nhật";
    const labId = row.ma_ket_qua_can_lam_sang;
    let pushedQuant = false;

    if (row.ige_toan_phan != null) {
      pushedQuant = true;
      const val = Number(row.ige_toan_phan);
      displayRows.push({
        key: `${labId}-ige`,
        labId,
        raw: row,
        test_name: "Định lượng IgE toàn phần huyết thanh",
        result_value: String(val),
        unit: "IU/mL",
        reference_range: "0 - 100",
        evaluation: val > 100 ? "Tăng cao" : "Bình thường",
        status: "completed",
        completed_at: baseTime,
        doctor_notes: row.can_lam_sang_khac_ghi_chu || "Định lượng miễn dịch huyết thanh",
      });
    }
    if (row.wbc != null || row.eo != null) {
      pushedQuant = true;
      const parts = [];
      if (row.wbc != null) parts.push(`WBC: ${row.wbc} G/L`);
      if (row.eo != null) parts.push(`Eo: ${row.eo} G/L`);
      displayRows.push({
        key: `${labId}-cbc`,
        labId,
        raw: row,
        test_name: "Tổng phân tích tế bào máu ngoại vi (WBC / Eosinophil)",
        result_value: parts.join(" • "),
        unit: "",
        reference_range: "WBC 4-10 | Eo <0.5",
        evaluation: Number(row.wbc || 7) > 10 ? "Tăng nhẹ" : "Bình thường",
        status: "completed",
        completed_at: baseTime,
        doctor_notes: row.can_lam_sang_khac_ghi_chu || "Công thức bạch cầu ngoại vi",
      });
    }
    if (row.crp != null) {
      pushedQuant = true;
      const val = Number(row.crp);
      displayRows.push({
        key: `${labId}-crp`,
        labId,
        raw: row,
        test_name: "Protein phản ứng C độ nhạy cao (hs-CRP)",
        result_value: String(val),
        unit: "mg/L",
        reference_range: "0 - 5.0",
        evaluation: val > 5 ? "Tăng cao" : "Bình thường",
        status: "completed",
        completed_at: baseTime,
        doctor_notes: row.can_lam_sang_khac_ghi_chu || "Theo dõi phản ứng viêm hệ thống",
      });
    }
    if (row.anti_tpo != null || row.tsh != null) {
      pushedQuant = true;
      const parts = [];
      if (row.anti_tpo != null) parts.push(`Anti-TPO: ${row.anti_tpo} IU/mL`);
      if (row.tsh != null) parts.push(`TSH: ${row.tsh} mIU/L`);
      displayRows.push({
        key: `${labId}-tpo`,
        labId,
        raw: row,
        test_name: "Kháng thể tự miễn tuyến giáp (Anti-TPO & TSH)",
        result_value: parts.join(" • "),
        unit: "",
        reference_range: "Anti-TPO < 34 IU/mL",
        evaluation: Number(row.anti_tpo || 0) > 34 ? "Bất thường" : "Bình thường",
        status: "completed",
        completed_at: baseTime,
        doctor_notes: row.can_lam_sang_khac_ghi_chu || "Tầm soát tuyến giáp tự miễn",
      });
    }

    if (!pushedQuant || row.xet_nghiem_khac) {
      displayRows.push({
        key: `${labId}-order`,
        labId,
        raw: row,
        test_name: row.xet_nghiem_khac || `Phiếu cận lâm sàng #${labId}`,
        result_value: pushedQuant ? "Đã trả kết quả" : "Chờ nhập trị số",
        unit: "",
        reference_range: "Tiêu chuẩn BYT",
        evaluation: pushedQuant ? "Bình thường" : "Đang phân tích",
        status: pushedQuant ? "completed" : "processing",
        completed_at: baseTime,
        doctor_notes: row.can_lam_sang_khac_ghi_chu || "Chỉ định cận lâm sàng",
      });
    }
  }
  return displayRows;
}

export default function DoctorLabRequests() {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [activeTab, setActiveTab] = useState("results"); // 'results' | 'create'
  const [dbLabRows, setDbLabRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTests, setSelectedTests] = useState(["LAB_IGE", "LAB_CBC"]);
  const [priority, setPriority] = useState("routine");
  const [labNotes, setLabNotes] = useState("");

  // Modal nhập kết quả định lượng (PATCH /doctor/lab-results/:labId)
  const [editingLab, setEditingLab] = useState(null);
  const [quantForm, setQuantForm] = useState({
    ige_toan_phan: "",
    wbc: "",
    crp: "",
    eo: "",
    anti_tpo: "",
    can_lam_sang_khac_ghi_chu: "",
  });

  useEffect(() => {
    apiClient
      .get("/doctor/queue", { params: { status: "all", include_completed: "true" } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRecords(list);
        const savedId = sessionStorage.getItem("activeDoctorRecordId");
        const picked =
          (savedId && list.find((r) => String(r.medical_record_id) === String(savedId))) ||
          list.find((r) => r.status === "in_progress") ||
          list[0];
        if (picked) {
          setSelectedRecordId(String(picked.medical_record_id));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadLabResults = useCallback(async (recId) => {
    if (!recId) return;
    try {
      const res = await apiClient.get(`/doctor/medical-records/${recId}/lab-results`);
      setDbLabRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDbLabRows([]);
    }
  }, []);

  useEffect(() => {
    if (selectedRecordId) {
      sessionStorage.setItem("activeDoctorRecordId", String(selectedRecordId));
      loadLabResults(selectedRecordId);
    }
  }, [selectedRecordId, loadLabResults]);

  const currentRecord =
    records.find((r) => String(r.medical_record_id) === String(selectedRecordId)) || records[0];

  const handleToggleTest = (code) => {
    if (selectedTests.includes(code)) {
      setSelectedTests(selectedTests.filter((c) => c !== code));
    } else {
      setSelectedTests([...selectedTests, code]);
    }
  };

  const handleCreateLabRequest = async (e) => {
    e.preventDefault();
    if (!currentRecord) return;
    if (selectedTests.length === 0) {
      toast.error("Vui lòng chọn ít nhất một xét nghiệm cận lâm sàng");
      return;
    }

    try {
      if (currentRecord.status === "pending") {
        await apiClient.post(`/doctor/medical-records/${currentRecord.medical_record_id}/accept`, {});
      }
      const names = selectedTests.map(
        (code) => LAB_CATALOG.find((t) => t.code === code)?.name || code
      );
      await apiClient.post(
        `/doctor/medical-records/${currentRecord.medical_record_id}/lab-results`,
        {
          tests: names,
          note: `${priority === "urgent" ? "[KHẨN CẤP] " : ""}${labNotes || "Chỉ định cận lâm sàng thường quy"}`,
        }
      );
      toast.success(`Đã phát phiếu chỉ định ${names.length} xét nghiệm thành công!`);
      setSelectedTests([]);
      setLabNotes("");
      setActiveTab("results");
      await loadLabResults(currentRecord.medical_record_id);
    } catch {
      // Handled by interceptor
    }
  };

  const openQuantModal = (rawRow) => {
    setEditingLab(rawRow);
    setQuantForm({
      ige_toan_phan: rawRow.ige_toan_phan ?? "",
      wbc: rawRow.wbc ?? "",
      crp: rawRow.crp ?? "",
      eo: rawRow.eo ?? "",
      anti_tpo: rawRow.anti_tpo ?? "",
      can_lam_sang_khac_ghi_chu: rawRow.can_lam_sang_khac_ghi_chu ?? "",
    });
  };

  const handleSaveQuant = async (e) => {
    e.preventDefault();
    if (!editingLab) return;
    try {
      const payload = {
        can_lam_sang_khac_ghi_chu: quantForm.can_lam_sang_khac_ghi_chu,
      };
      if (quantForm.ige_toan_phan !== "") payload.ige_toan_phan = Number(quantForm.ige_toan_phan);
      if (quantForm.wbc !== "") payload.wbc = Number(quantForm.wbc);
      if (quantForm.crp !== "") payload.crp = Number(quantForm.crp);
      if (currentRecord?.clinical_type === "chronic") {
        if (quantForm.eo !== "") payload.eo = Number(quantForm.eo);
        if (quantForm.anti_tpo !== "") payload.anti_tpo = Number(quantForm.anti_tpo);
      }
      await apiClient.patch(`/doctor/lab-results/${editingLab.ma_ket_qua_can_lam_sang}`, payload);
      toast.success("Đã cập nhật chỉ số xét nghiệm cận lâm sàng!");
      setEditingLab(null);
      await loadLabResults(selectedRecordId);
    } catch {
      // Handled by interceptor
    }
  };

  const displayResults = expandLabRows(dbLabRows);

  return (
    <div className="space-y-6">
      {/* 1. Hero Header */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Chỉ Định Cận Lâm Sàng &amp; Xét Nghiệm</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-flask text-sm"></span>
              <span>Phiếu chỉ định IgE, huyết học, test vật lý và trả kết quả định lượng</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <Link to="/doctor/prescriptions" className="base-btn-hero-primary">
              <span className="isax icon-health text-sm"></span>
              <span>Khám &amp; Kê đơn</span>
            </Link>
            <Link to="/doctor" className="base-btn-hero-primary">
              <span className="isax icon-arrow-left-2 text-sm"></span>
              <span>Hàng đợi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Patient Context Switcher */}
      {currentRecord && (
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
                  <option key={r.medical_record_id} value={r.medical_record_id}>
                    {r.record_code} — {r.patient_name} ({r.status === "completed" ? "Đã khám" : r.status === "in_progress" ? "Đang khám" : "Chờ khám"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>
                Chẩn đoán: <strong className="text-gray-900">{currentRecord.diagnosis || "Đang đánh giá"}</strong>
              </span>
              <span>•</span>
              <span>
                Phân loại:{" "}
                <strong className="text-[var(--base-brand-blue)]">
                  {currentRecord.clinical_type === "chronic" ? "Mạn tính" : "Cấp tính"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Line Tab Navigation */}
      <div className="base-tab-nav">
        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`base-tab-item ${activeTab === "results" ? "is-active" : ""}`}
        >
          <span className="isax icon-document-text text-base"></span>
          <span>Kết Quả Xét Nghiệm ({displayResults.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("create")}
          disabled={currentRecord?.status === "completed"}
          className={`base-tab-item ${activeTab === "create" ? "is-active" : ""} disabled:opacity-50`}
        >
          <span className="isax icon-add-circle text-base"></span>
          <span>Tạo Chỉ Định Mới (lab01)</span>
        </button>
      </div>

      {/* Tab 1: Kết Quả Xét Nghiệm */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bảng Kết Quả Cận Lâm Sàng &amp; Miễn Dịch</h2>
              <p className="text-xs text-gray-500">Đồng bộ trực tiếp với bảng ketquacanlamsang PostgreSQL</p>
            </div>
            {currentRecord?.status !== "completed" && (
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className="base-btn base-btn-primary base-btn-compact text-xs cursor-pointer"
              >
                <span className="isax icon-add text-sm"></span>
                <span>Chỉ định thêm</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="base-card p-10 text-center text-xs text-gray-400">Đang tải dữ liệu cận lâm sàng...</div>
          ) : displayResults.length === 0 ? (
            <div className="base-card p-12 text-center">
              <span className="isax icon-flask text-4xl text-gray-300 block mb-2"></span>
              <p className="text-sm font-bold text-gray-600">Chưa có chỉ định xét nghiệm nào cho ca bệnh này</p>
              <p className="text-xs text-gray-400 mt-1">
                Bấm nút &quot;Tạo Chỉ Định Mới&quot; để chỉ định xét nghiệm IgE, CTM, test da vẽ nổi.
              </p>
            </div>
          ) : (
            <div className="base-table-container">
              <table className="base-table">
                <thead>
                  <tr>
                    <th>Mã Phiếu &amp; Tên Xét Nghiệm</th>
                    <th>Kết Quả Đo Được</th>
                    <th>Trị Số Tham Chiếu</th>
                    <th>Đánh Giá</th>
                    <th>Trạng Thái</th>
                    <th>Thời Gian</th>
                    <th className="text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <div className="font-bold text-gray-900 text-xs">{item.test_name}</div>
                        <span className="font-mono text-[10px] text-gray-400">LAB-#{item.labId}</span>
                      </td>
                      <td>
                        <span className="font-mono font-extrabold text-xs text-[var(--base-brand-navy)]">
                          {item.result_value}
                        </span>
                        {item.unit && <span className="text-xs text-gray-500 ml-1">{item.unit}</span>}
                      </td>
                      <td className="text-xs text-gray-600 font-mono">{item.reference_range}</td>
                      <td>
                        <span
                          className={`base-tag font-bold text-[10px] ${
                            item.evaluation === "Tăng cao" || item.evaluation === "Bất thường"
                              ? "base-tag-negative"
                              : item.evaluation === "Tăng nhẹ"
                              ? "base-tag-warning"
                              : item.evaluation === "Bình thường"
                              ? "base-tag-positive"
                              : "base-tag-info"
                          }`}
                        >
                          {item.evaluation}
                        </span>
                      </td>
                      <td>
                        {item.status === "completed" ? (
                          <span className="base-tag base-tag-positive text-[10px]">Đã có kết quả</span>
                        ) : (
                          <span className="base-tag base-tag-info text-[10px]">Chờ nhập trị số</span>
                        )}
                      </td>
                      <td className="text-xs text-gray-600">{item.completed_at}</td>
                      <td className="text-right">
                        {currentRecord?.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => openQuantModal(item.raw)}
                            className="base-btn base-btn-secondary base-btn-compact text-xs cursor-pointer"
                          >
                            Nhập trị số
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tạo Chỉ Định Mới */}
      {activeTab === "create" && currentRecord && (
        <form onSubmit={handleCreateLabRequest} className="base-card p-6 space-y-6">
          <div className="pb-4 border-b border-[var(--base-border-opaque)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Phiếu Chỉ Định Cận Lâm Sàng &amp; Thử Nghiệm</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chọn danh mục xét nghiệm cần thực hiện cho {currentRecord.patient_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">Mức độ ưu tiên:</label>
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
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-gray-600 border-[var(--base-border-opaque)]"
                }`}
              >
                Khẩn cấp
              </button>
            </div>
          </div>

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
                        onChange={() => {}}
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

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Ghi chú lâm sàng cho phòng xét nghiệm
            </label>
            <textarea
              rows={3}
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              placeholder="Ví dụ: Bệnh nhân có tiền sử phù mạch mi mắt, sẩn ngứa bùng phát tái diễn..."
              className="base-textarea w-full text-xs p-3 border border-[var(--base-border-opaque)] bg-white"
            />
          </div>

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
                className="base-btn base-btn-primary text-xs cursor-pointer flex items-center gap-2 font-bold"
              >
                <span className="isax icon-tick-circle text-base"></span>
                <span>Phát Phiếu Chỉ Định (lab01)</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Modal cập nhật trị số định lượng */}
      {editingLab && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Cập Nhật Trị Số Xét Nghiệm (LAB-#{editingLab.ma_ket_qua_can_lam_sang})</h3>
              <button onClick={() => setEditingLab(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>
            <form onSubmit={handleSaveQuant}>
              <div className="base-modal-body space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">IgE toàn phần (IU/mL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={quantForm.ige_toan_phan}
                      onChange={(e) => setQuantForm({ ...quantForm, ige_toan_phan: e.target.value })}
                      placeholder="VD: 348.5"
                      className="base-input text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">WBC (G/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={quantForm.wbc}
                      onChange={(e) => setQuantForm({ ...quantForm, wbc: e.target.value })}
                      placeholder="VD: 8.4"
                      className="base-input text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">hs-CRP (mg/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={quantForm.crp}
                      onChange={(e) => setQuantForm({ ...quantForm, crp: e.target.value })}
                      placeholder="VD: 3.2"
                      className="base-input text-xs font-mono"
                    />
                  </div>
                  {currentRecord?.clinical_type === "chronic" && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Anti-TPO (IU/mL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={quantForm.anti_tpo}
                        onChange={(e) => setQuantForm({ ...quantForm, anti_tpo: e.target.value })}
                        placeholder="VD: 38.5"
                        className="base-input text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nhận định cận lâm sàng</label>
                  <textarea
                    rows={2}
                    value={quantForm.can_lam_sang_khac_ghi_chu}
                    onChange={(e) => setQuantForm({ ...quantForm, can_lam_sang_khac_ghi_chu: e.target.value })}
                    className="base-input text-xs"
                  />
                </div>
              </div>
              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingLab(null)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Lưu Kết Quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
