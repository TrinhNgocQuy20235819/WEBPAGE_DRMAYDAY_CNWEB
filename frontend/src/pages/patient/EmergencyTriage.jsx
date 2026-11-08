import { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

function makeSessionUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const hex = Date.now().toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}

export default function EmergencyTriage() {
  const [sessionUuid, setSessionUuid] = useState(() => makeSessionUuid());
  const [answers, setAnswers] = useState({
    airway: null,
    breathing: null,
    circulation: null,
    gastrointestinal: null,
  });

  const [triageDone, setTriageDone] = useState(false);

  const QUESTIONS = [
    {
      id: "airway",
      title: "1. Đường thở & Hầu họng",
      desc: "Có dấu hiệu phù môi, sưng lưỡi, nghẹn họng, thay đổi giọng nói (khàn đặc) hoặc cảm giác cổ họng bị thắt lại?",
      icon: "icon-voice-cricle",
    },
    {
      id: "breathing",
      title: "2. Hô hấp & Phổi",
      desc: "Có khó thở, thở rít (tiếng rít thanh quản), thở khò khè dữ dội, tức ngực hoặc không thể nói hết một câu?",
      icon: "icon-heart-circle",
    },
    {
      id: "circulation",
      title: "3. Tuần hoàn & Tri giác",
      desc: "Có cảm giác choáng váng, hoa mắt, tối sầm mặt mày, vã mồ hôi lạnh, tụt huyết áp hoặc ngất xỉu?",
      icon: "icon-flash-circle",
    },
    {
      id: "gastrointestinal",
      title: "4. Tiêu hóa & Ổ bụng",
      desc: "Có xuất hiện đau quặn bụng từng cơn dữ dội, buồn nôn hoặc nôn mửa liên tục sau khi nổi mày đay?",
      icon: "icon-warning-2",
    },
  ];

  const logScreeningToServer = (updatedAnswers, extra = {}) => {
    apiClient
      .post("/red-flag-screening", {
        ma_phien_ung_dung: sessionUuid,
        co_sung_moi_luoi_co_hong: Boolean(updatedAnswers.airway),
        co_kho_tho_kho_khe_nghen_hong: Boolean(updatedAnswers.breathing),
        co_chong_mat_tuc_nguc_sap_ngat: Boolean(updatedAnswers.circulation),
        co_dau_bung_non_lien_tuc: Boolean(updatedAnswers.gastrointestinal),
        ...extra,
      })
      .catch(() => {});
  };

  const handleSelect = (id, val) => {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);

    // If any answer is yes, trigger red alert immediately (< 30s)
    if (val === true) {
      setTriageDone(true);
      logScreeningToServer(updated, { xac_nhan_muon_goi_cap_cuu: true });
    } else {
      // If all answered no
      const allAnswered = Object.values(updated).every((v) => v !== null);
      if (allAnswered) {
        setTriageDone(true);
        logScreeningToServer(updated);
      }
    }
  };

  const isEmergency = Object.values(answers).some((v) => v === true);
  const allAnswered = Object.values(answers).every((v) => v !== null);

  const handleReset = () => {
    setSessionUuid(makeSessionUuid());
    setAnswers({
      airway: null,
      breathing: null,
      circulation: null,
      gastrointestinal: null,
    });
    setTriageDone(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-[var(--base-border-opaque)] bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/login" className="flex items-center gap-2">
            <img
              src="/images/logo/drmayday-logo.png"
              alt="DrMayDay"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </Link>
          <div className="hidden sm:block text-xs text-gray-500 border-l border-gray-300 pl-3">
            <span className="font-bold text-gray-900">Bệnh viện Da liễu Trung ương</span>
            <span className="mx-2">•</span>
            <span>Hệ Thống Sàng Lọc Phản Vệ Khẩn Cấp</span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
        >
          <span className="isax icon-arrow-left-2 text-sm"></span>
          <span>Về trang đăng nhập</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 my-auto">
        {/* Siren Emergency Alert Banner when Danger Triggered */}
        {triageDone && isEmergency ? (
          <div className="base-card border-2 border-rose-600 bg-rose-50/70 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 bg-rose-600 text-white flex items-center justify-center shrink-0 animate-bounce">
                <span className="isax-b icon-danger text-3xl"></span>
              </div>
              <div className="flex-1">
                <span className="base-tag base-tag-negative text-xs uppercase tracking-wider font-extrabold animate-pulse">
                  BÁO ĐỘNG ĐỎ CẤP CỨU — PHẢN VỆ ĐỘ 2 TRỞ LÊN
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-rose-900 mt-1.5">
                  NGUY CƠ SỐC PHẢN VỆ ĐE DỌA TÍNH MẠNG
                </h1>
                <p className="text-xs sm:text-sm text-rose-800 mt-2 leading-relaxed">
                  Bạn có ít nhất 1 dấu hiệu cảnh báo đe dọa đường thở hoặc tuần hoàn. Hệ thống đã khóa luồng khám thường quy và kích hoạt quy trình cấp cứu khẩn cấp quốc gia.
                </p>
              </div>
            </div>

            {/* Direct 115 Dial Button */}
            <div className="p-4 bg-white border border-rose-300 space-y-3">
              <div className="text-center sm:text-left">
                <div className="text-xs font-bold uppercase text-rose-600">Hành động cấp thiết ngay bây giờ:</div>
                <div className="text-sm font-extrabold text-gray-900 mt-0.5">
                  GỌI NGAY CẤP CỨU 115 HOẶC ĐẾN CƠ SỞ Y TẾ GẦN NHẤT
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href="tel:115"
                  onClick={() =>
                    logScreeningToServer(answers, {
                      xac_nhan_muon_goi_cap_cuu: true,
                      da_nhan_nut_goi_cap_cuu: true,
                      so_dien_thoai_cap_cuu: "115",
                    })
                  }
                  className="base-btn base-btn-danger w-full sm:w-auto px-8 py-3.5 text-base font-extrabold justify-center shadow-lg hover:shadow-xl text-center"
                >
                  <span className="isax-b icon-call text-xl"></span>
                  <span>GỌI 115 CẤP CỨU NGAY</span>
                </a>

                <a
                  href="tel:19006951"
                  className="base-btn base-btn-secondary w-full sm:w-auto px-6 py-3.5 text-xs font-bold justify-center"
                >
                  <span className="isax icon-hospital text-base"></span>
                  <span>Hotline BV Da liễu TW: 1900 6951</span>
                </a>
              </div>
            </div>

            {/* First-aid Immediate Instructions */}
            <div className="bg-rose-100/60 p-4 border border-rose-200 text-xs text-rose-950 space-y-2">
              <strong className="block font-bold uppercase text-rose-900 flex items-center gap-2">
                <span className="isax icon-info-circle text-base"></span>
                <span>HƯỚNG DẪN XỬ TRÍ TẠI CHỖ TRONG KHI CHỜ ĐỘI CẤP CỨU:</span>
              </strong>
              <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                <li><strong>Nằm yên tại chỗ:</strong> Đặt bệnh nhân nằm đầu bằng, kê cao hai chân (tư thế Trendelenburg). Nếu khó thở hoặc nôn, cho nằm nghiêng sang một bên.</li>
                <li><strong>KHÔNG ngồi dậy đột ngột:</strong> Việc đứng hoặc ngồi đột ngột khi tụt huyết áp có thể gây ngừng tuần hoàn tim.</li>
                <li><strong>Dùng bút tiêm Adrenaline tự động (EpiPen):</strong> Nếu bệnh nhân đã được bác sĩ kê đơn bút tiêm Epinephrine trước đó, hãy tiêm bắp ngay vào mặt trước ngoài đùi.</li>
                <li><strong>Không cho ăn, uống bất kỳ thứ gì</strong> qua đường miệng khi đang nghẹn họng hoặc khó thở.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
              >
                Làm lại sàng lọc
              </button>
            </div>
          </div>
        ) : triageDone && !isEmergency ? (
          /* Safe Result Card */
          <div className="base-card p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <span className="isax-b icon-tick-circle text-3xl"></span>
            </div>

            <div>
              <span className="base-tag base-tag-positive text-xs uppercase font-bold">
                KẾT QUẢ AN TOÀN — KHÔNG CÓ DẤU HIỆU BÁO ĐỘNG ĐỎ
              </span>
              <h1 className="text-xl font-bold text-gray-900 mt-2">
                Chưa Ghi Nhận Nguy Cơ Phản Vệ Nguy Kịch
              </h1>
              <p className="text-xs text-gray-600 max-w-lg mx-auto mt-2 leading-relaxed">
                Bạn không có biểu hiện tắc nghẽn đường thở, co thắt phế quản hoặc tụt huyết áp. Các triệu chứng sẩn phù ngứa của bạn phù hợp để tiếp tục theo dõi lâm sàng hoặc khám ngoại trú theo lịch hẹn.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 text-xs text-gray-600 max-w-lg mx-auto text-left space-y-1">
              <strong className="text-gray-900 block mb-1">Lưu ý quan trọng:</strong>
              <p>Nếu trong những giờ tới bạn cảm thấy sưng họng, nghẹn thở hoặc chóng mặt tăng dần, hãy kích hoạt lại Báo động đỏ hoặc gọi 115 ngay.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                to="/login"
                className="base-btn base-btn-primary px-6 py-2.5 text-xs font-bold justify-center"
              >
                <span>Đăng nhập Cổng Bệnh Nhân</span>
                <span className="isax icon-arrow-right-1 text-xs"></span>
              </Link>

              <button
                type="button"
                onClick={handleReset}
                className="base-btn base-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
              >
                Khảo sát lại
              </button>
            </div>
          </div>
        ) : (
          /* Initial 4-Question Triage Form (< 30s) */
          <div className="base-card p-6 sm:p-8 space-y-6">
            <div className="border-b border-[var(--base-border-opaque)] pb-4">
              <div className="flex items-center gap-2">
                <span className="base-tag base-tag-negative text-[10px] font-bold uppercase tracking-wider">
                  SÀNG LỌC NHANH DƯỚI 30 GIÂY
                </span>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-gray-500 font-semibold">Quy chuẩn Cấp cứu Bộ Y Tế</span>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mt-2">
                Sàng Lọc Dấu Hiệu Báo Động Đỏ Phản Vệ
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Hãy trả lời trung thực 4 câu hỏi dưới đây để xác định nguy cơ sốc phản vệ và bảo đảm tính mạng.
              </p>
            </div>

            <div className="space-y-4">
              {QUESTIONS.map((q) => {
                const answer = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-4 border transition-all ${
                      answer === true
                        ? "border-rose-500 bg-rose-50/50"
                        : answer === false
                        ? "border-emerald-500 bg-emerald-50/30"
                        : "border-[var(--base-border-opaque)] bg-white hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                          <span className={`isax ${q.icon} text-lg`}></span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">{q.title}</div>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{q.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleSelect(q.id, true)}
                          className={`px-4 py-1.5 text-xs font-bold border transition cursor-pointer ${
                            answer === true
                              ? "bg-rose-600 text-white border-rose-600"
                              : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                          }`}
                        >
                          CÓ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect(q.id, false)}
                          className={`px-4 py-1.5 text-xs font-bold border transition cursor-pointer ${
                            answer === false
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          KHÔNG
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-xs text-gray-400">
              Chỉ mất chưa đến 30 giây • Kết quả được tính toán trực tiếp ngay khi chọn
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-[var(--base-border-opaque)] bg-white text-center text-xs text-gray-400">
        Bệnh viện Da liễu Trung ương © 2026 • Hệ thống Chăm sóc &amp; Theo dõi Mày đay DrMayDay
      </footer>
    </div>
  );
}
