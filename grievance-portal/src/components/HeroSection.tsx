import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Search, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  const stats = [
    { value: "12K+", label: t("home.hero.statComplaints", "Complaints"), icon: FileText },
    { value: "89%", label: t("home.hero.statResolution", "Resolution"), icon: CheckCircle2 },
    { value: "3.5d", label: t("home.hero.statAvgTime", "Avg Time"), icon: Clock },
  ];

  return (
    <section className="relative min-h-screen hero-gradient overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size-64px_64px]" />

      <div className="container relative z-10 mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-8">
              <TrendingUp className="w-4 h-4 text-accent" />
              {t("home.hero.badge", "Empowering Citizens Through Technology")}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            {t("home.hero.titlePrefix", "Your Voice")} <span className="gradient-text">{t("home.hero.titleHighlight", "Matters")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {t("home.hero.subtitle", "Report civic issues, track progress in real-time, and help build a better community for everyone.")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link to="/file-complaint">
              <Button size="lg" className="gradient-bg text-lg px-8 py-6 rounded-xl glow-effect hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 mr-2" />
                {t("home.hero.fileComplaint", "File a Complaint")}
              </Button>
            </Link>
            <Link to="/track-complaint">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl glass border-white/20 hover:bg-white/10 transition-all">
                <Search className="w-5 h-5 mr-2" />
                {t("home.hero.trackComplaint", "Track Complaint")}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 md:gap-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="stat-card flex items-center gap-4 px-6 py-4"
              >
                <stat.icon className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
