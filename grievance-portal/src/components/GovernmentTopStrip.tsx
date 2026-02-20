import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type GovernmentTopStripProps = {
  rightContent?: ReactNode;
  rightLabel?: string;
};

const EMBLEM_URL =
  "https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg";

const GovernmentTopStrip = ({
  rightContent,
  rightLabel,
}: GovernmentTopStripProps) => {
  const { t } = useLanguage();

  return (
    <div className="border-b border-slate-700 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 text-xs">
        <div className="flex items-center gap-2">
          <img
            src={EMBLEM_URL}
            alt={t("nav.goi", "Government of India")}
            className="h-6 w-6 rounded bg-white p-0.5"
          />
          <p className="font-semibold">{t("nav.goi", "Government of India")}</p>
        </div>
        {rightContent || (
          <p className="text-slate-300">{rightLabel || t("officer.officialWorkspace", "Official Officer Workspace")}</p>
        )}
      </div>
    </div>
  );
};

export default GovernmentTopStrip;
