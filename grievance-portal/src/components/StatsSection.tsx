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
      description: t("home.stats.activeUsersDesc", "Registered citizens"),
    },
    {
      icon: Clock,
      value: "3.5",
      label: t("home.stats.avgResolution", "Avg Resolution"),
      description: t("home.stats.avgResolutionDesc", "Days to resolve"),
    },
  ];

  return (
    <section className="border-b border-border bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            {t("home.stats.titlePrefix", "Portal")}{" "}
            <span className="text-primary">{t("home.stats.titleHighlight", "Performance")}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("home.stats.subtitle", "Indicative grievance statistics for public transparency.")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-border bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <stat.icon className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-slate-700">{stat.label}</p>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
