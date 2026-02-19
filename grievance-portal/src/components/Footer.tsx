import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <footer className="mt-10 border-t border-border bg-slate-900 text-slate-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-4">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
            {t("footer.aboutGov", "Government of India")}
          </h3>
          <p className="text-sm text-slate-300">
            {t(
              "footer.aboutText",
              "This portal is for citizen grievance registration, tracking, and redressal by concerned departments.",
            )}
          </p>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
            {t("footer.quickLinks", "Quick Links")}
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><Link to="/file-complaint-options" className="hover:text-white">{t("footer.file", "File Grievance")}</Link></li>
            <li><Link to="/track-complaint" className="hover:text-white">{t("footer.track", "Track Grievance")}</Link></li>
            <li><Link to="/about" className="hover:text-white">{t("footer.help", "Help and Guidelines")}</Link></li>
            <li><Link to="/dashboard" className="hover:text-white">{t("footer.dashboard", "Citizen Dashboard")}</Link></li>
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
            {t("footer.policies", "Policies")}
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><a href="#" className="hover:text-white">{t("footer.privacy", "Privacy Policy")}</a></li>
            <li><a href="#" className="hover:text-white">{t("footer.terms", "Terms and Conditions")}</a></li>
            <li><a href="#" className="hover:text-white">{t("footer.accessibility", "Accessibility Statement")}</a></li>
            <li><a href="#" className="hover:text-white">{t("footer.sitemap", "Sitemap")}</a></li>
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
            {t("footer.contact", "Contact")}
          </h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>{t("footer.address", "Public Grievance Cell, New Delhi, India")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{t("footer.phone", "Helpline: 1800-000-0000")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{t("footer.email", "support@grievance.gov.in")}</span>
            </li>
          </ul>
        </section>
      </div>

      <div className="border-t border-slate-700 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-4 text-xs text-slate-300 md:flex-row">
          <p>{t("footer.copyright", "© Government of India. All rights reserved.")}</p>
          <p>{t("footer.lastUpdated", "Last Updated on")}: {lastUpdated}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
