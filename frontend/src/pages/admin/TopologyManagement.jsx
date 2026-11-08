import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import Pagination from "../../components/common/Pagination";

export default function TopologyManagement() {
  const [activeTab, setActiveTab] = useState("branches"); // 'branches', 'departments', 'rooms'
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState({
    name: "",
    detail: "",
    phone: "02432237777",
    parentId: "",
  });

  const loadTopology = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes, rRes] = await Promise.all([
        apiClient.get("/branches"),
        apiClient.get("/departments"),
        apiClient.get("/rooms"),
      ]);
      const brList = bRes.data || [];
      const dpList = dRes.data || [];
      const rmList = rRes.data || [];
      setBranches(brList);
      setDepartments(dpList);
      setRooms(rmList);
    } catch {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setModalItem({
      name: "",
      detail: "",
      phone: "02432237777",
      parentId:
        activeTab === "departments"
          ? String(branches[0]?.id || 1)
          : activeTab === "rooms"
          ? String(departments[0]?.id || 1)
          : "",
    });
    setShowModal(true);
  };

  const currentList =
    activeTab === "branches" ? branches : activeTab === "departments" ? departments : rooms;

  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedList = currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!modalItem.name.trim()) {
      toast.error("Vui lòng nhập tên đơn vị!");
      return;
    }

    try {
      if (activeTab === "branches") {
        await apiClient.post("/branches", {
          name: modalItem.name.trim(),
          address: modalItem.detail.trim() || "Hà Nội",
          phone: modalItem.phone.replace(/\s+/g, "").trim() || "02432237777",
        });
        toast.success("Đã thêm cơ sở bệnh viện mới!");
      } else if (activeTab === "departments") {
        await apiClient.post("/departments", {
          name: modalItem.name.trim(),
          description: modalItem.detail.trim() || "Chuyên khoa lâm sàng",
          branch_id: Number(modalItem.parentId || branches[0]?.id || 1),
        });
        toast.success("Đã thêm khoa chuyên môn mới!");
      } else {
        await apiClient.post("/rooms", {
          name: modalItem.name.trim(),
          description: modalItem.detail.trim() || "Phòng khám chuyên khoa",
          department_id: Number(modalItem.parentId || departments[0]?.id || 1),
        });
        toast.success("Đã thêm phòng khám mới!");
      }
      setShowModal(false);
      await loadTopology();
    } catch {
      // Handled by interceptor
    }
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm(`Xác nhận xóa "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/${type}/${item.id}`);
      toast.success(`Đã xóa ${item.name}`);
      await loadTopology();
    } catch {
      // RESTRICT errors handled by apiClient toast
    }
  };

  const getBranchName = (bId) =>
    branches.find((b) => Number(b.id) === Number(bId))?.name || `Cơ sở #${bId}`;
  const getDeptName = (dId) =>
    dId
      ? departments.find((d) => Number(d.id) === Number(dId))?.name || `Khoa #${dId}`
      : "Chưa phân khoa (SET NULL)";

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hạ Tầng Cơ Sở Y Tế</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-buildings text-sm"></span>
              <span>Quản lý phân cấp cơ sở, khoa chuyên môn và phòng khám (Slide 4)</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button onClick={openAddModal} className="base-btn-hero-accent cursor-pointer">
              <span className="isax icon-add text-sm"></span>
              <span>
                Thêm {activeTab === "branches" ? "cơ sở" : activeTab === "departments" ? "khoa" : "phòng"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Line Tabs */}
      <div className="base-tab-nav">
        <button
          onClick={() => handleTabChange("branches")}
          className={`base-tab-item ${activeTab === "branches" ? "is-active" : ""}`}
        >
          <span className="isax icon-buildings text-base"></span>
          <span>Cơ sở ({branches.length})</span>
        </button>
        <button
          onClick={() => handleTabChange("departments")}
          className={`base-tab-item ${activeTab === "departments" ? "is-active" : ""}`}
        >
          <span className="isax icon-hospital text-base"></span>
          <span>Khoa ({departments.length})</span>
        </button>
        <button
          onClick={() => handleTabChange("rooms")}
          className={`base-tab-item ${activeTab === "rooms" ? "is-active" : ""}`}
        >
          <span className="isax icon-health text-base"></span>
          <span>Phòng khám ({rooms.length})</span>
        </button>
      </div>

      {/* Content Card with Pagination */}
      <div className="base-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-xs text-gray-400">Đang tải cấu trúc hạ tầng...</div>
          ) : activeTab === "branches" ? (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã cơ sở</th>
                  <th>Tên cơ sở bệnh viện</th>
                  <th>Địa chỉ</th>
                  <th>Điện thoại</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">CS-{b.id}</td>
                    <td className="font-bold text-xs text-gray-900">{b.name}</td>
                    <td className="text-xs text-gray-600">{b.address}</td>
                    <td className="text-xs font-mono text-gray-600">{b.phone}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">
                        {b.is_active !== false ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete("branches", b)}
                        className="base-btn base-btn-secondary base-btn-compact text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa cơ sở (RESTRICT nếu đang có khoa/nhân sự)"
                      >
                        <span className="isax icon-trash text-xs"></span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "departments" ? (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã khoa</th>
                  <th>Tên khoa chuyên môn</th>
                  <th>Trực thuộc cơ sở</th>
                  <th>Mô tả chuyên môn</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">KH-{d.id}</td>
                    <td className="font-bold text-xs text-gray-900">{d.name}</td>
                    <td className="text-xs text-gray-600">{getBranchName(d.branch_id)}</td>
                    <td className="text-xs text-gray-700">{d.description || "Chuyên khoa lâm sàng"}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">Hoạt động</span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete("departments", d)}
                        className="base-btn base-btn-secondary base-btn-compact text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa khoa"
                      >
                        <span className="isax icon-trash text-xs"></span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã phòng</th>
                  <th>Tên phòng khám / Chức năng</th>
                  <th>Ghi chú</th>
                  <th>Khoa phụ trách</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">PK-{r.id}</td>
                    <td className="font-bold text-xs text-gray-900">{r.name}</td>
                    <td className="text-xs text-gray-600">{r.description || "Phòng khám"}</td>
                    <td className="text-xs text-gray-600">{getDeptName(r.department_id)}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">Sẵn sàng trực</span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete("rooms", r)}
                        className="base-btn base-btn-secondary base-btn-compact text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa phòng khám (RESTRICT nếu đang có bác sĩ trực)"
                      >
                        <span className="isax icon-trash text-xs"></span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={currentList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Modal Thêm đơn vị mới */}
      {showModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">
                Thêm {activeTab === "branches" ? "Cơ Sở" : activeTab === "departments" ? "Khoa" : "Phòng Khám"} Mới
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="base-modal-body space-y-3">
                {activeTab === "departments" && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Cơ sở trực thuộc *</label>
                    <select
                      value={modalItem.parentId}
                      onChange={(e) => setModalItem({ ...modalItem, parentId: e.target.value })}
                      className="base-select text-xs w-full"
                      required
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          CS-{b.id} — {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === "rooms" && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Khoa phụ trách *</label>
                    <select
                      value={modalItem.parentId}
                      onChange={(e) => setModalItem({ ...modalItem, parentId: e.target.value })}
                      className="base-select text-xs w-full"
                      required
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          KH-{d.id} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên gọi *</label>
                  <input
                    type="text"
                    value={modalItem.name}
                    onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                    placeholder={
                      activeTab === "branches"
                        ? "VD: Cơ sở 3 - Nam Hà Nội"
                        : activeTab === "departments"
                        ? "VD: Khoa Dị Ứng Lâm Sàng"
                        : "VD: Phòng 305 - Khám Mày Đay Nhi"
                    }
                    className="base-input text-xs"
                    required
                  />
                </div>

                {activeTab === "branches" && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại liên hệ *</label>
                    <input
                      type="text"
                      value={modalItem.phone}
                      onChange={(e) => setModalItem({ ...modalItem, phone: e.target.value })}
                      className="base-input text-xs font-mono"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    {activeTab === "branches" ? "Địa chỉ *" : "Mô tả / Ghi chú"}
                  </label>
                  <input
                    type="text"
                    value={modalItem.detail}
                    onChange={(e) => setModalItem({ ...modalItem, detail: e.target.value })}
                    placeholder={activeTab === "branches" ? "VD: Số 15A Phương Mai, Đống Đa, Hà Nội" : "Ghi chú chuyên môn"}
                    className="base-input text-xs"
                    required={activeTab === "branches"}
                  />
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Lưu Vào Cây Hạ Tầng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
