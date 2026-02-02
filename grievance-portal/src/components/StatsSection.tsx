import { motion } from "framer-motion";
import { FileText, CheckCircle, Users, Clock } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      icon: FileText,
      value: "12,456",
      label: "Total Complaints",
      description: "Submitted this year",
    },
    {
      icon: CheckCircle,
      value: "10,234",
      label: "Resolved",
      description: "Successfully closed",
    },
    {
      icon: Users,
      value: "8,932",
      label: "Active Users",
      description: "Engaged citizens",
    },
    {
      icon: Clock,
      value: "3.5",
      label: "Avg Resolution",
      description: "Days to resolve",
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
            Trusted by <span className="gradient-text">Thousands</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform has helped citizens effectively communicate with local authorities
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
