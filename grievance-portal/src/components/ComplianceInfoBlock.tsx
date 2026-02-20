import { Database, FileCheck2, ShieldCheck, Clock3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type ComplianceInfoBlockProps = {
  source: string;
  auditReference: string;
  retentionNotice: string;
  lastSync?: string;
  className?: string;
};

const ComplianceInfoBlock = ({
  source,
  auditReference,
  retentionNotice,
  lastSync,
  className = "",
}: ComplianceInfoBlockProps) => {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t("compliance.section", "Compliance Information")}
      className={`rounded-lg border border-slate-300 bg-white p-4 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-slate-900">
          {t("compliance.heading", "Regulatory Compliance Information")}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 md:grid-cols-2">
        <p className="flex items-start gap-2">
          <Database className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
          <span>
            <strong>{t("compliance.sourceLabel", "Data Source")}:</strong>{" "}
            {source}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
          <span>
            <strong>{t("compliance.lastSyncLabel", "Last Sync")}:</strong>{" "}
            {lastSync || new Date().toLocaleString("en-IN")}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <FileCheck2 className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
          <span>
            <strong>{t("compliance.auditLabel", "Audit Reference")}:</strong>{" "}
            {auditReference}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-slate-500" />
          <span>
            <strong>{t("compliance.retentionLabel", "Retention Notice")}:</strong>{" "}
            {retentionNotice}
          </span>
        </p>
      </div>
    </section>
  );
};

export default ComplianceInfoBlock;

