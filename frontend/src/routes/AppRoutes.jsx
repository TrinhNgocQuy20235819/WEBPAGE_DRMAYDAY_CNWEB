import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PatientLayout from "../layouts/PatientLayout";
import AuthLayout from "../layouts/AuthLayout";

// Auth Pages
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import NotFound from "../pages/NotFound";

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import TopologyManagement from "../pages/admin/TopologyManagement";
import FormBuilder from "../pages/admin/FormBuilder";

// Doctor Pages
import DoctorQueue from "../pages/doctor/DoctorQueue";
import DoctorPrescription from "../pages/doctor/DoctorPrescription";
import DoctorLesionReview from "../pages/doctor/DoctorLesionReview";

// Patient Pages
import PatientDashboard from "../pages/patient/PatientDashboard";
import Uas7Tracker from "../pages/patient/Uas7Tracker";
import ScreeningForm from "../pages/patient/ScreeningForm";
import LesionTracker from "../pages/patient/LesionTracker";
import PatientProfile from "../pages/patient/PatientProfile";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Admin Module Routes (Đầu việc 1) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="topology" element={<TopologyManagement />} />
        <Route path="form-builder" element={<FormBuilder />} />
      </Route>

      {/* Doctor Module Routes (Đầu việc 3) */}
      <Route path="/doctor" element={<DoctorLayout />}>
        <Route index element={<DoctorQueue />} />
        <Route path="prescriptions" element={<DoctorPrescription />} />
        <Route path="lesions" element={<DoctorLesionReview />} />
      </Route>

      {/* Patient Module Routes (Đầu việc 2) */}
      <Route path="/patient" element={<PatientLayout />}>
        <Route index element={<PatientDashboard />} />
        <Route path="uas7" element={<Uas7Tracker />} />
        <Route path="screening" element={<ScreeningForm />} />
        <Route path="lesions" element={<LesionTracker />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
