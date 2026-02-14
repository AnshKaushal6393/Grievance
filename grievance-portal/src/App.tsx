import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MyComplaints from "./pages/MyComplaints";
import TrackComplaint from "./pages/TrackComplaint";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FileComplaint from "./pages/FileComplaint";
import VerifyOTP from "./pages/VerifyOTP";
 import AadhaarVerification from "./pages/AadhaarVerification";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminComplaints from "./pages/AdminComplaints";
import DepartmentManagement from "./pages/DepartmentManagement";
import OfficerDashboard from "./pages/OfficerDashboard";
import UpdateComplaintStatus from "./pages/UpdateComplaintStatus";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/aadhaar-verification" element={<AadhaarVerification />} />
          <Route path="/file-complaint" element={<ProtectedRoute><FileComplaint /></ProtectedRoute>} />
          <Route path="/my-complaints" element={<ProtectedRoute><MyComplaints /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/track-complaint" element={<TrackComplaint />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DepartmentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer"
            element={
              <ProtectedRoute roles={["officer", "admin"]}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/update-status"
            element={
              <ProtectedRoute roles={["officer", "admin"]}>
                <UpdateComplaintStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
