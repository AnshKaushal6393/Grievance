import { UserPlus, FileText, Brain, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorksSection = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: UserPlus,
      number: "01",
      title: t("home.how.step1Title", "Create Account"),
      description: t("home.how.step1Desc", "Register with your email or phone number. Verify your identity to get started."),
    },
    {
      icon: FileText,
      number: "02",
      title: t("home.how.step2Title", "File Complaint"),
      description: t("home.how.step2Desc", "Describe your issue, upload photos, and pin the location on the map."),
    },
    {
      icon: Brain,
      number: "03",
      title: t("home.how.step3Title", "AI Processing"),
      description: t("home.how.step3Desc", "Our AI categorizes and prioritizes your complaint for quick resolution."),
    },
    {
      icon: CheckCircle,
      number: "04",
      title: t("home.how.step4Title", "Resolution"),
      description: t("home.how.step4Desc", "Track progress in real-time and receive updates until the issue is resolved."),
    },
  ];

  return (
    <section className="border-b border-border bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("home.how.badge", "How It Works")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {t("home.how.titlePrefix", "Simple")}{" "}
            <span className="text-primary">{t("home.how.titleHighlight", "4-Step")}</span>{" "}
            {t("home.how.titleSuffix", "Process")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("home.how.subtitle", "From complaint to resolution, we've made the process as simple as possible")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <article key={step.title} className="rounded border border-border bg-white p-4">
              <p className="mb-2 text-xs font-semibold text-primary">{step.number}</p>
              <div className="mb-2 flex items-center gap-2">
                <step.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
