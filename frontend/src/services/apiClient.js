import axios from "axios";
import toast from "react-hot-toast";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Tự động đính kèm Bearer JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý ApiResponse chuẩn từ Backend
apiClient.interceptors.response.use(
  (response) => {
    const resData = response.data;

    // Nếu backend trả về định dạng chuẩn ApiResponse (code có thể là number hoặc string)
    if (resData && resData.code !== undefined) {
      const codeNum = Number(resData.code);
      // 1000 (OK) hoặc 1001 (Created)
      if (codeNum === 1000 || codeNum === 1001) {
        return resData;
      }

      // Các mã lỗi nghiệp vụ
      toast.error(resData.message || "Thao tác không thành công");
      return Promise.reject(new Error(resData.message || "Business Error"));
    }

    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.message || "Đã xảy ra lỗi khi gọi máy chủ";
      const publicPaths = ["/login", "/register", "/forgot-password", "/emergency-triage"];

      switch (status) {
        case 401:
          if (!publicPaths.includes(window.location.pathname)) {
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          } else {
            toast.error(errorMessage);
          }
          break;
        case 403:
          toast.error(errorMessage || "Bạn không có quyền thực hiện chức năng này!");
          break;
        case 404:
          toast.error(errorMessage || "Không tìm thấy tài nguyên yêu cầu!");
          break;
        case 409:
          toast.error(errorMessage || "Dữ liệu bị trùng lặp!");
          break;
        default:
          toast.error(errorMessage);
          break;
      }
    } else if (error.request) {
      toast.error("Không thể kết nối đến máy chủ Backend (Network Error)!");
    } else {
      toast.error(error.message || "Đã xảy ra lỗi không xác định!");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
