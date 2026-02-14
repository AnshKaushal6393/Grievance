import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Menu, X, Globe, Bell, User, Users,
  ChevronDown, LayoutDashboard, FileQuestion, 
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("English");
  const isLoggedIn = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const displayName = currentUser?.name || "User";
  const displayEmail = currentUser?.email || "user@example.com";
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks =
    currentUser?.role === "admin"
      ? [
          { label: "Admin Dashboard", href: "/admin" },
          { label: "Complaints", href: "/admin/complaints" },
          { label: "Departments", href: "/admin/departments" },
        ]
      : [
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Track Complaint", href: "/track-complaint" },
        ];

  const languages = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "hi", label: "हिंदी", flag: "🇮🇳" },
    { code: "ur", label: "اردو", flag: "🇵🇰" },
  ];

  const profileMenuItems =
    currentUser?.role === "admin"
      ? [
          { label: "Admin Dashboard", icon: LayoutDashboard, href: "/admin" },
          { label: "All Complaints", icon: FileQuestion, href: "/admin/complaints" },
          { label: "Departments", icon: Users, href: "/admin/departments" },
          { label: "Profile", icon: User, href: "/profile" },
        ]
      : [
          { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
          { label: "My Complaints", icon: FileQuestion, href: "/my-complaints" },
          { label: "Profile", icon: User, href: "/profile" },
        ];

  const isActiveLink = (href: string) => {
    return location.pathname === href;
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setIsProfileOpen(false);
      setIsOpen(false);
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Grievance Portal</h1>
              <p className="text-xs text-gray-500 -mt-0.5">E-Governance System</p>
            </div>
          </Link>

          {/* Center - Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActiveLink(link.href)
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsLanguageOpen(!isLanguageOpen);
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">{currentLanguage}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isLanguageOpen ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {isLanguageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setCurrentLanguage(lang.label);
                          setIsLanguageOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          currentLanguage === lang.label
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoggedIn ? (
              <>
                {/* Notification Bell */}
                <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsLanguageOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{displayName}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-500">{displayEmail}</p>
                        </div>
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <item.icon className="w-4 h-4 text-gray-400" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-gray-600" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  asChild
                >
                  <Link to="/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              {/* Mobile Nav Links */}
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Language Switcher */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="px-4 text-xs font-medium text-gray-400 uppercase mb-2">Language</p>
                <div className="flex gap-2 px-4">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setCurrentLanguage(lang.label)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentLanguage === lang.label
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Auth Buttons */}
              {!isLoggedIn && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <Button variant="outline" className="w-full py-3 h-auto" asChild>
                    <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                  </Button>
                  <Button 
                    className="w-full py-3 h-auto bg-gradient-to-r from-blue-600 to-indigo-600"
                    asChild
                  >
                    <Link to="/register" onClick={() => setIsOpen(false)}>Sign Up</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Logged In State */}
              {isLoggedIn && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                    </div>
                  </div>
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
