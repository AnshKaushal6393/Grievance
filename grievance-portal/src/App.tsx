import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const MyComplaints = lazy(() => import("./pages/MyComplaints"));
const TrackComplaint = lazy(() => import("./pages/TrackComplaint"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FileComplaint = lazy(() => import("./pages/FileComplaint"));
const ComplaintMethod = lazy(() => import("./pages/ComplaintMethod"));
const VoiceComplaint = lazy(() => import("./pages/VoiceComplaint"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const AadhaarVerification = lazy(() => import("./pages/AadhaarVerification"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminComplaints = lazy(() => import("./pages/AdminComplaints"));
const DepartmentManagement = lazy(() => import("./pages/DepartmentManagement"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const OfficerDashboard = lazy(() => import("./pages/OfficerDashboard"));
const UpdateComplaintStatus = lazy(() => import("./pages/UpdateComplaintStatus"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<PageLoader />}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/aadhaar-verification" element={<AadhaarVerification />} />
            <Route path="/file-complaint-options" element={<ProtectedRoute roles={["user", "admin"]}><ComplaintMethod /></ProtectedRoute>} />
            <Route path="/file-complaint" element={<ProtectedRoute roles={["user", "admin"]}><FileComplaint /></ProtectedRoute>} />
            <Route path="/voice-complaint" element={<ProtectedRoute roles={["user", "admin"]}><VoiceComplaint /></ProtectedRoute>} />
            <Route path="/my-complaints" element={<ProtectedRoute roles={["user", "admin"]}><MyComplaints /></ProtectedRoute>} />
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
              path="/admin/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminUserManagement />
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
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
