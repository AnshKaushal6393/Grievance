import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mic, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ComplaintMethod = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {t("complaintMethod.title", "Choose Complaint Filing Method")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t(
              "complaintMethod.subtitle",
              "You can file using form input or voice input.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("complaintMethod.formTitle", "File with Form")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-5 text-sm text-muted-foreground">
                {t(
                  "complaintMethod.formDesc",
                  "Fill complaint details manually with category, address, and attachments.",
                )}
              </p>
              <Button asChild className="w-full justify-center gap-2">
                <Link to="/file-complaint">
                  {t("complaintMethod.formCta", "Continue to Form")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                {t("complaintMethod.voiceTitle", "File with Voice")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-5 text-sm text-muted-foreground">
                {t(
                  "complaintMethod.voiceDesc",
                  "Speak your complaint and submit quickly, useful for accessibility.",
                )}
              </p>
              <Button asChild variant="outline" className="w-full justify-center gap-2">
                <Link to="/voice-complaint">
                  {t("complaintMethod.voiceCta", "Continue to Voice")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ComplaintMethod;
