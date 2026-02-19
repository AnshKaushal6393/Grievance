import { Link } from "react-router-dom";
import { FileText, Search, Mic, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  const services = [
    {
      title: t("home.hero.fileComplaint", "File a Complaint"),
      description: t("file.subtitleNew", "Tell us about your issue"),
      href: "/file-complaint-options",
      icon: FileText,
    },
    {
      title: t("home.hero.trackComplaint", "Track Complaint"),
      description: t("track.subtitle", "Enter your complaint ID to check the current status"),
      href: "/track-complaint",
      icon: Search,
    },
    {
      title: t("nav.voiceComplaint", "Voice Complaint"),
      description: t("home.features.voiceDesc", "File complaints using voice input. Perfect for accessibility and ease of use."),
      href: "/voice-complaint",
      icon: Mic,
    },
    {
      title: t("dashboard.quick.helpSupport", "Help & Support"),
      description: t("home.footer.faq", "FAQs"),
      href: "/about",
      icon: HelpCircle,
    },
  ];

  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5">
            <p className="inline-block rounded border border-border bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("home.hero.badge", "Public Service Delivery")}
            </p>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
              {t("home.hero.titlePrefix", "Citizen")}{" "}
              <span className="text-primary">{t("home.hero.titleHighlight", "Grievance Portal")}</span>
            </h2>
            <p className="max-w-3xl text-base text-slate-700">
              {t(
                "home.hero.subtitle",
                "Register civic grievances, track status updates, and receive timely redressal from the concerned department.",
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/file-complaint-options">
                <Button className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("home.hero.fileComplaint", "File a Complaint")}
                </Button>
              </Link>
              <Link to="/track-complaint">
                <Button variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  {t("home.hero.trackComplaint", "Track Complaint")}
                </Button>
              </Link>
            </div>
          </div>

          <aside className="rounded border border-border bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
              {t("home.features.titlePrefix", "Citizen Services")}
            </h3>
            <div className="space-y-2">
              {services.map((service) => (
                <Link
                  key={service.title}
                  to={service.href}
                  className="flex items-start gap-3 rounded border border-border bg-white p-3 transition-colors hover:bg-slate-100"
                >
                  <service.icon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{service.title}</p>
                    <p className="text-xs text-slate-600">{service.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
