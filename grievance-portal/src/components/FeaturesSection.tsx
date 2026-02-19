import { motion } from "framer-motion";
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
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            {t("home.features.badge", "Features")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.features.titlePrefix", "Everything You Need to")} <span className="gradient-text">{t("home.features.titleHighlight", "Report Issues")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("home.features.subtitle", "Our platform is designed with citizens in mind, offering powerful tools for effective grievance management")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="feature-card group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
