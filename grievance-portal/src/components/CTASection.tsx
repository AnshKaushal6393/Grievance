import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const CTASection = () => {
  const { t } = useLanguage();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded border border-border bg-slate-100 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("home.cta.badge", "Citizen Action")}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
                {t("home.cta.title", "Need to report a public issue?")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("home.cta.subtitle", "Use the grievance form and keep your complaint ID for tracking.")}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-primary" />
                {t("nav.helpline", "Helpline: 1800-000-0000")}
              </p>
            </div>
            <Link to="/file-complaint-options">
              <Button className="gap-2">
                {t("home.cta.button", "Proceed to Filing")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
