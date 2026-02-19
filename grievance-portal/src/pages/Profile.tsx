import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import authService from "@/services/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Phone, MapPin, ShieldCheck, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const Profile = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authService.getProfile();
        setProfile(res?.data?.user || null);
      } catch (error: any) {
        toast.error(error?.message || t("profile.errorLoad", "Failed to load profile"));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [t]);

  const initials = useMemo(() => {
    const name = profile?.name || t("profile.user", "User");
    return name
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-14 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("profile.loading", "Loading profile...")}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-14">
          <Card>
            <CardContent className="py-10 text-center text-gray-600">
              {t("profile.notAvailable", "Profile not available.")}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-lg">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="capitalize">{profile.role}</Badge>
                  <Badge variant={profile.isEmailVerified ? "default" : "secondary"}>
                    {profile.isEmailVerified
                      ? t("profile.emailVerified", "Email Verified")
                      : t("profile.emailUnverified", "Email Unverified")}
                  </Badge>
                  <Badge variant={profile.isPhoneVerified ? "default" : "secondary"}>
                    {profile.isPhoneVerified
                      ? t("profile.phoneVerified", "Phone Verified")
                      : t("profile.phoneUnverified", "Phone Unverified")}
                  </Badge>
                  <Badge variant={profile.isAadhaarVerified ? "default" : "secondary"}>
                    {profile.isAadhaarVerified
                      ? t("profile.aadhaarVerified", "Aadhaar Verified")
                      : t("profile.aadhaarPending", "Aadhaar Pending")}
                  </Badge>
                </div>
              </div>
              {!profile.isAadhaarVerified && (
                <Button asChild>
                  <Link to="/aadhaar-verification">{t("profile.verifyAadhaar", "Verify Aadhaar")}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.contact", "Contact")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-gray-500" /><span>{profile.email}</span></div>
              <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-gray-500" /><span>{profile.phone}</span></div>
              <div className="flex items-start gap-3 text-sm"><MapPin className="w-4 h-4 text-gray-500 mt-0.5" /><span>{profile.address?.street}, {profile.address?.city}, {profile.address?.state} - {profile.address?.pincode}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.account", "Account")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm"><User className="w-4 h-4 text-gray-500" /><span className="capitalize">{t("profile.role", "Role")}: {profile.role}</span></div>
              <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-gray-500" /><span>{t("profile.joined", "Joined")}: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : t("profile.na", "N/A")}</span></div>
              <div className="flex items-center gap-3 text-sm"><ShieldCheck className="w-4 h-4 text-gray-500" /><span>{t("profile.lastLogin", "Last Login")}: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : t("profile.na", "N/A")}</span></div>
              <Separator />
              <p className="text-xs text-gray-500">{t("profile.editNote", "Profile edits are not enabled yet. Contact admin for account updates.")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
