import { createContext, useContext, useMemo, type ReactNode } from "react";

export type LanguageCode = "en";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (_language: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  getLanguageLabel: (_code: LanguageCode) => string;
};

const dictionary: Record<string, string> = {
  "nav.home": "Home",
  "nav.about": "About",
  "nav.trackComplaint": "Track Complaint",
  "nav.adminDashboard": "Admin Dashboard",
  "nav.complaints": "Complaints",
  "nav.users": "Users",
  "nav.departments": "Departments",
  "nav.reports": "Reports",
  "nav.analytics": "Analytics",
  "nav.allComplaints": "All Complaints",
  "nav.profile": "Profile",
  "nav.dashboard": "Dashboard",
  "nav.myComplaints": "My Complaints",
  "nav.language": "Language",
  "nav.signIn": "Sign In",
  "nav.signUp": "Sign Up",
  "nav.logout": "Logout",
  "nav.platformSubtitle": "E-Governance System",
  "login.welcomeBack": "Welcome Back",
  "login.accessAccount": "Access your Grievance Portal account",
  "login.emailOrPhone": "Email or Phone Number",
  "login.password": "Password",
  "login.rememberMe": "Remember me",
  "login.forgotPassword": "Forgot password?",
  "login.signingIn": "Signing In...",
  "login.signIn": "Sign In",
  "login.noAccount": "Don't have an account?",
  "login.signUpNow": "Sign up now",
  "login.trackWithoutLogin": "Track your complaint without login",
  "login.errorMissingCreds": "Please enter email and password",
  "login.errorInvalidCreds": "Invalid email or password",
  "login.success": "Login successful",
  "register.personalInfo": "Personal Information",
  "register.password": "Password",
  "register.tellUs": "Tell us about yourself",
  "register.createPassword": "Create Password",
  "register.secureAccount": "Secure your account",
  "register.address": "Your Address",
  "register.reachYou": "Where can we reach you?",
  "register.fullName": "Full Name",
  "register.emailAddress": "Email Address",
  "register.phoneNumber": "Phone Number",
  "register.confirmPassword": "Confirm Password",
  "register.streetAddress": "Street Address",
  "register.city": "City",
  "register.state": "State",
  "register.pincode": "Pincode",
  "register.nextStep": "Next Step",
  "register.next": "Next",
  "register.back": "Back",
  "register.creating": "Creating...",
  "register.createAccount": "Create Account",
  "register.alreadyAccount": "Already have an account?",
  "register.signIn": "Sign in",
  "register.passwordStrength": "Password Strength",
  "register.weak": "Weak",
  "register.medium": "Medium",
  "register.strong": "Strong",
  "register.errorPasswordMismatch": "Passwords do not match",
  "register.errorPasswordLength": "Password must be at least 8 characters long",
  "register.errorPhoneLength": "Phone number must be exactly 10 digits",
  "register.errorPincodeLength": "Pincode must be exactly 6 digits",
  "register.errorRegistrationFailed": "Registration failed. Please try again.",
  "register.errorFillAll": "Please fill all the fields",
  "register.errorValidEmail": "Please enter a valid email address",
  "register.userExists": "User already exists. Redirecting to OTP verification....",
  "settings.title": "Settings",
  "settings.subtitle": "Comprehensive platform administration controls",
  "settings.resetDefaults": "Reset Defaults",
  "settings.saveChanges": "Save Changes",
  "settings.saving": "Saving...",
  "settings.configuration": "Configuration",
  "settings.loading": "Loading settings from server...",
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<LanguageContextValue>(
    () => ({
      language: "en",
      setLanguage: () => {},
      t: (key, fallback) => dictionary[key] || fallback || key,
      getLanguageLabel: () => "English",
    }),
    [],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
