import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { INITIAL_STAFFS } from "../../services/mockData";

export default function UserManagement() {
  const [staffs, setStaffs] = useState(INITIAL_STAFFS);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    code: "",
    name: "",
    specialty: "Da liễu & Miễn dịch",
    room: "Phòng 302 - Khám Mày đay Mạn",
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newStaff.code || !newStaff.name) {
      toast.error("Vui lòng nhập mã và họ tên!");
      return;
    }
    const created = {
      id: `s-${Date.now()}`,
      employee_code: newStaff.code,
      full_name: newStaff.name,
      title: newStaff.name,
      specialty: newStaff.specialty,
      room: newStaff.room,
      is_active: true,
    };
    setStaffs([...staffs, created]);
    setShowModal(false);
    setNewStaff({ code: "", name: "", specialty: "Da liễu & Miễn dịch", room: "Phòng 302 - Khám Mày đay Mạn" });
    toast.success(`Đã thêm nhân sự y tế: ${created.full_name}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <Link to="/admin" className="hover:text-white transition">Quản trị</Link>
              <span className="isax icon-arrow-right-3 text-[10px]"></span>
              <span className="text-white/90 font-medium">Danh bạ nhân sự y tế</span>
            </div>
            <h1 className="base-hero-title">Danh Bạ Nhân Sự Y Tế &amp; Phân Quyền</h1>
            <p className="base-hero-subtitle">
              <span className="isax icon-profile-2user text-sm"></span>
              <span>Quản lý danh bạ Bác sĩ chuyên khoa, Điều dưỡng và điều phối phân công phòng khám</span>
            </p>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowModal(true)}
              className="base-btn-hero-accent cursor-pointer"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Thêm Nhân Sự Y Tế</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="base-card overflow-hidden">
        <div className="base-card-header flex items-center justify-between">
          <div>
            <h2 className="base-card-title">Bảng Phân Công Công Tác Nhân Sự Y Tế</h2>
            <p className="text-xs text-gray-500 mt-0.5">Danh bạ nhân sự đang tham gia khám chữa bệnh mày đay toàn viện</p>
          </div>
          <span className="base-tag base-tag-info font-mono text-[10px]">{staffs.length} nhân sự</span>
        </div>

        <div className="overflow-x-auto">
          <table className="base-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên y bác sĩ</th>
                <th>Chuyên khoa lâm sàng</th>
                <th>Phòng làm việc trực tiếp</th>
                <th>Trạng thái trực</th>
              </tr>
            </thead>
            <tbody>
              {staffs.map((st) => (
                <tr key={st.id}>
                  <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)]">
                    {st.employee_code}
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {st.employee_code.slice(-2)}
                      </div>
                      <div className="font-bold text-xs text-gray-900">{st.full_name}</div>
                    </div>
                  </td>
                  <td className="text-xs text-gray-700">{st.specialty}</td>
                  <td className="text-xs text-gray-600 font-medium">{st.room}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Đang trực</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm nhân sự */}
      {showModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Bác Sĩ / Nhân Viên Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    value={newStaff.code}
                    onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })}
                    placeholder="VD: BS-05"
                    className="base-input text-xs font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Họ tên &amp; Học hàm/học vị *</label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="VD: PGS.TS. Trần Văn Khoa"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Chuyên khoa chuyên sâu</label>
                  <input
                    type="text"
                    value={newStaff.specialty}
                    onChange={(e) => setNewStaff({ ...newStaff, specialty: e.target.value })}
                    className="base-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Phòng khám phân công</label>
                  <input
                    type="text"
                    value={newStaff.room}
                    onChange={(e) => setNewStaff({ ...newStaff, room: e.target.value })}
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
                  Thêm Nhân Sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
