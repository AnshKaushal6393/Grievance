import { motion } from "framer-motion";
import {
  ShieldCheck,
  Target,
  HeartHandshake,
  Timer,
  Eye,
  Users,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useLanguage();

  const values = [
    {
      title: t("about.value.transparency.title", "Transparency"),
      description: t(
        "about.value.transparency.desc",
        "Track every complaint stage with clear status updates and accountability.",
      ),
      icon: Eye,
    },
    {
      title: t("about.value.responsiveness.title", "Responsiveness"),
      description: t(
        "about.value.responsiveness.desc",
        "Route issues to the right departments quickly to reduce resolution time.",
      ),
      icon: Timer,
    },
    {
      title: t("about.value.citizenFirst.title", "Citizen First"),
      description: t(
        "about.value.citizenFirst.desc",
        "Design every workflow around user clarity, trust, and accessibility.",
      ),
      icon: HeartHandshake,
    },
  ];

  const highlights = [
    { label: t("about.highlight.tracked", "Complaints Tracked"), value: "12K+", icon: ShieldCheck },
    { label: t("about.highlight.departments", "Active Departments"), value: "28", icon: Users },
    { label: t("about.highlight.resolution", "Resolution Rate"), value: "89%", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-linear-to-br from-background via-muted/40 to-background">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

        <div className="container mx-auto px-4 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm border border-border">
              <Target className="h-4 w-4 text-primary" />
              {t("about.badge", "About Grievance Portal")}
            </span>
            <h1 className="mt-6 text-3xl font-bold text-gray-900 md:text-5xl">
              {t("about.title", "Built to turn feedback into action")}
            </h1>
            <p className="mt-5 text-lg text-gray-600 md:text-xl">
              {t(
                "about.subtitle",
                "Grievance Portal helps citizens report civic issues and monitor progress while giving departments a structured system to resolve complaints efficiently.",
              )}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {highlights.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <item.icon className="h-7 w-7 text-primary" />
              <p className="mt-4 text-3xl font-bold text-gray-900">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900">{t("about.mission.title", "Our Mission")}</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t(
                "about.mission.p1",
                "To create a dependable bridge between citizens and local government by making complaint submission, tracking, and resolution straightforward and transparent.",
              )}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t(
                "about.mission.p2",
                "We focus on clear communication, measurable response times, and data-driven service improvement across departments.",
              )}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900">{t("about.how.title", "How It Works")}</h2>
            <ul className="mt-5 space-y-4">
              {[
                t("about.how.p1", "Citizens file complaints with category and details."),
                t("about.how.p2", "Issues are routed to relevant departments/officers."),
                t("about.how.p3", "Status updates remain visible in real time."),
                t("about.how.p4", "Dashboards help teams prioritize and close cases faster."),
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">{t("about.values.title", "Core Values")}</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <value.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
