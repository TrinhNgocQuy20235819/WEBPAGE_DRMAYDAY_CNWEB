import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_BRANCHES, INITIAL_DEPARTMENTS, INITIAL_ROOMS } from "../../services/mockData";
import Pagination from "../../components/common/Pagination";

export default function TopologyManagement() {
  const [activeTab, setActiveTab] = useState("branches"); // 'branches', 'departments', 'rooms'
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState({ code: "", name: "", detail: "" });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const currentList =
    activeTab === "branches" ? branches : activeTab === "departments" ? departments : rooms;

  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedList = currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!modalItem.name || !modalItem.code) {
      toast.error("Vui lòng nhập mã và tên!");
      return;
    }

    if (activeTab === "branches") {
      setBranches([
        ...branches,
        {
          id: `b-${Date.now()}`,
          code: modalItem.code,
          name: modalItem.name,
          address: modalItem.detail || "Hà Nội",
          phone: "024.3223.7777",
          is_active: true,
        },
      ]);
      toast.success("Đã thêm cơ sở bệnh viện mới!");
    } else if (activeTab === "departments") {
      setDepartments([
        ...departments,
        {
          id: `d-${Date.now()}`,
          branch_id: "b1",
          code: modalItem.code,
          name: modalItem.name,
          head_name: modalItem.detail || "Trưởng khoa",
        },
      ]);
      toast.success("Đã thêm khoa chuyên môn mới!");
    } else {
      setRooms([
        ...rooms,
        {
          id: `r-${Date.now()}`,
          department_id: "d1",
          code: modalItem.code,
          name: modalItem.name,
          room_type: "clinic",
        },
      ]);
      toast.success("Đã thêm phòng khám mới!");
    }

    setShowModal(false);
    setModalItem({ code: "", name: "", detail: "" });
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hạ Tầng Cơ Sở Y Tế</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-buildings text-sm"></span>
              <span>Quản lý phân cấp cơ sở, khoa chuyên môn và phòng khám</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowModal(true)}
              className="base-btn-hero-accent cursor-pointer"
            >
              <span className="isax icon-add text-sm"></span>
              <span>Thêm {activeTab === "branches" ? "cơ sở" : activeTab === "departments" ? "khoa" : "phòng"}</span>
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
          {activeTab === "branches" && (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã cơ sở</th>
                  <th>Tên cơ sở bệnh viện</th>
                  <th>Địa chỉ</th>
                  <th>Điện thoại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">{b.code}</td>
                    <td className="font-bold text-xs text-gray-900">{b.name}</td>
                    <td className="text-xs text-gray-600">{b.address}</td>
                    <td className="text-xs font-mono text-gray-600">{b.phone}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">Đang hoạt động</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "departments" && (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã khoa</th>
                  <th>Tên khoa chuyên môn</th>
                  <th>Trực thuộc cơ sở</th>
                  <th>Lãnh đạo / Trưởng khoa</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">{d.code}</td>
                    <td className="font-bold text-xs text-gray-900">{d.name}</td>
                    <td className="text-xs text-gray-600">Cơ sở 1 - Hà Nội</td>
                    <td className="text-xs font-semibold text-gray-800">{d.head_name}</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">Hoạt động</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "rooms" && (
            <table className="base-table">
              <thead>
                <tr>
                  <th>Mã phòng</th>
                  <th>Tên phòng khám / Chức năng</th>
                  <th>Loại phòng</th>
                  <th>Khoa phụ trách</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">{r.code}</td>
                    <td className="font-bold text-xs text-gray-900">{r.name}</td>
                    <td>
                      <span className="base-tag base-tag-neutral text-[10px] font-semibold">
                        {r.room_type === "clinic" ? "Phòng khám" : r.room_type === "lab" ? "Xét nghiệm" : "Thủ thuật"}
                      </span>
                    </td>
                    <td className="text-xs text-gray-600">Khoa Miễn Dịch &amp; Dị Ứng Da</td>
                    <td>
                      <span className="base-tag base-tag-positive text-[10px]">Sẵn sàng trực</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Component */}
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
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mã định danh *</label>
                  <input
                    type="text"
                    value={modalItem.code}
                    onChange={(e) => setModalItem({ ...modalItem, code: e.target.value })}
                    placeholder="VD: CS3-HN / P303"
                    className="base-input text-xs font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên gọi *</label>
                  <input
                    type="text"
                    value={modalItem.name}
                    onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                    placeholder="VD: Phòng Khám Dị Ứng Thuốc &amp; Mày Đay"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    {activeTab === "branches" ? "Địa chỉ" : activeTab === "departments" ? "Trưởng khoa" : "Ghi chú"}
                  </label>
                  <input
                    type="text"
                    value={modalItem.detail}
                    onChange={(e) => setModalItem({ ...modalItem, detail: e.target.value })}
                    className="base-input text-xs"
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
