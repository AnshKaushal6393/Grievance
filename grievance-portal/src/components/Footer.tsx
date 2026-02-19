import { Shield, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  const quickLinks = [
    { label: t("home.footer.fileComplaint", "File Complaint"), href: "#" },
    { label: t("home.footer.trackStatus", "Track Status"), href: "#" },
    { label: t("home.footer.faq", "FAQs"), href: "#" },
    { label: t("home.footer.contactUs", "Contact Us"), href: "#" },
  ];

  const categories = [
    { label: t("home.footer.catRoads", "Roads & Transport"), href: "#" },
    { label: t("home.footer.catWater", "Water Supply"), href: "#" },
    { label: t("home.footer.catElectricity", "Electricity"), href: "#" },
    { label: t("home.footer.catSanitation", "Sanitation"), href: "#" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Linkedin, href: "#" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GrievanceHub</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {t("home.footer.brandText", "Empowering citizens to voice their concerns and create positive change in their communities.")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("home.footer.quickLinks", "Quick Links")}</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("home.footer.categories", "Categories")}</h3>
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category.label}>
                  <a href={category.href} className="text-muted-foreground hover:text-primary transition-colors text-sm">{category.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("home.footer.contactUs", "Contact Us")}</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <span className="text-muted-foreground text-sm">
                  {t("home.footer.address1", "123 Civic Center, Downtown")}
                  <br />
                  {t("home.footer.address2", "City, State 12345")}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground text-sm">1800-123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground text-sm">support@grievancehub.gov</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">{t("home.footer.copyright", "(c) 2024 GrievanceHub. All rights reserved.")}</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t("home.footer.privacy", "Privacy Policy")}</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t("home.footer.terms", "Terms of Service")}</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">{t("home.footer.accessibility", "Accessibility")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
