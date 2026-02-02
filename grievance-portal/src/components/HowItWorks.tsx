import { motion } from "framer-motion";
import { UserPlus, FileText, Brain, CheckCircle } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      icon: UserPlus,
      number: "01",
      title: "Create Account",
      description: "Register with your email or phone number. Verify your identity to get started.",
    },
    {
      icon: FileText,
      number: "02",
      title: "File Complaint",
      description: "Describe your issue, upload photos, and pin the location on the map.",
    },
    {
      icon: Brain,
      number: "03",
      title: "AI Processing",
      description: "Our AI categorizes and prioritizes your complaint for quick resolution.",
    },
    {
      icon: CheckCircle,
      number: "04",
      title: "Resolution",
      description: "Track progress in real-time and receive updates until the issue is resolved.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple <span className="gradient-text">4-Step</span> Process
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From complaint to resolution, we've made the process as simple as possible
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line - hidden on mobile */}
          <div className="hidden lg:block absolute top-24 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-linear-to-r from-primary via-secondary to-primary opacity-30" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number with glow */}
                <div className="relative inline-block mb-6">
                  <div className="step-number relative z-10">
                    {step.number}
                  </div>
                  <div className="absolute inset-0 step-number blur-xl opacity-50" />
                </div>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto rounded-xl glass flex items-center justify-center mb-4">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
