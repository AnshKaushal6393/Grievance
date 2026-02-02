import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
 import Index from "./pages/Index";
// import MyComplaints from "./pages/MyComplaints";
// import TrackComplaint from "./pages/TrackComplaint";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
// import FileComplaint from "./pages/FileComplaint";
// import VerifyOTP from "./pages/VerifyOTP";
// import AadhaarVerification from "./pages/AadhaarVerification";
// import ForgotPassword from "./pages/ForgotPassword";
// import AdminDashboard from "./pages/AdminDashboard";
// import AdminComplaints from "./pages/AdminComplaints";
// import DepartmentManagement from "./pages/DepartmentManagement";
// import OfficerDashboard from "./pages/OfficerDashboard";
// import UpdateComplaintStatus from "./pages/UpdateComplaintStatus";
// import AnalyticsDashboard from "./pages/AnalyticsDashboard";
// import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/" element={<Index />} />
          {/*<Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/file-complaint" element={<FileComplaint />} />
          <Route path="/my-complaints" element={<MyComplaints />} />
          <Route path="/track-complaint" element={<TrackComplaint />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route
            path="/aadhaar-verification"
            element={<AadhaarVerification />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/complaints" element={<AdminComplaints />} />
          <Route path="/admin/departments" element={<DepartmentManagement />} />
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route
            path="/officer/update-status"
            element={<UpdateComplaintStatus />}
          />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} /> */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
