import { FileEdit, Brain, Activity, Languages, Mic, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: FileEdit,
      title: t("home.features.easyFilingTitle", "Easy Filing"),
      description: t("home.features.easyFilingDesc", "Simple and intuitive complaint submission process. Upload photos, add details, and submit in minutes."),
    },
    {
      icon: Brain,
      title: t("home.features.aiTitle", "AI-Powered"),
      description: t("home.features.aiDesc", "Smart categorization and priority assignment using advanced machine learning algorithms."),
    },
    {
      icon: Activity,
      title: t("home.features.realtimeTitle", "Real-time Tracking"),
      description: t("home.features.realtimeDesc", "Track your complaint status in real-time with detailed updates and notifications."),
    },
    {
      icon: Languages,
      title: t("home.features.multiTitle", "Multilingual"),
      description: t("home.features.multiDesc", "Access the portal in multiple languages. We support 12+ regional languages."),
    },
    {
      icon: Mic,
      title: t("home.features.voiceTitle", "Voice Support"),
      description: t("home.features.voiceDesc", "File complaints using voice input. Perfect for accessibility and ease of use."),
    },
    {
      icon: MapPin,
      title: t("home.features.mapsTitle", "Geographic Maps"),
      description: t("home.features.mapsDesc", "Pin exact locations on interactive maps for accurate issue reporting."),
    },
  ];

  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("home.features.badge", "Features")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {t("home.features.titlePrefix", "Service")}{" "}
            <span className="text-primary">{t("home.features.titleHighlight", "Capabilities")}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("home.features.subtitle", "Core functionality available for citizens and departments.")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded border border-border bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <feature.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
