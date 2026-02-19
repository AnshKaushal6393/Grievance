import { motion } from "framer-motion";
import { FileText, CheckCircle, Users, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const StatsSection = () => {
  const { t } = useLanguage();

  const stats = [
    {
      icon: FileText,
      value: "12,456",
      label: t("home.stats.totalComplaints", "Total Complaints"),
      description: t("home.stats.totalComplaintsDesc", "Submitted this year"),
    },
    {
      icon: CheckCircle,
      value: "10,234",
      label: t("home.stats.resolved", "Resolved"),
      description: t("home.stats.resolvedDesc", "Successfully closed"),
    },
    {
      icon: Users,
      value: "8,932",
      label: t("home.stats.activeUsers", "Active Users"),
      description: t("home.stats.activeUsersDesc", "Engaged citizens"),
    },
    {
      icon: Clock,
      value: "3.5",
      label: t("home.stats.avgResolution", "Avg Resolution"),
      description: t("home.stats.avgResolutionDesc", "Days to resolve"),
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.stats.titlePrefix", "Trusted by")} <span className="gradient-text">{t("home.stats.titleHighlight", "Thousands")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("home.stats.subtitle", "Our platform has helped citizens effectively communicate with local authorities")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="feature-card group"
            >
              <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <stat.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-4xl font-bold mb-1">{stat.value}</div>
              <div className="text-lg font-medium mb-1">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
