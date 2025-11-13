import { Badge } from "@/components/ui/badge";
import {
  RiskLevel,
  getRiskColor,
  getRiskText,
  getRiskProgress,
  getRiskBadgeVariant,
} from "../../services/analysisService";

interface RiskBarProps {
  label: string;
  level: RiskLevel;
}

export function RiskBar({ label, level }: RiskBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge
          variant={getRiskBadgeVariant(level)}
          className="text-xs px-2 py-0.5"
        >
          {getRiskText(level)}
        </Badge>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${getRiskColor(level)} transition-all`}
          style={{ width: `${getRiskProgress(level)}%` }}
        />
      </div>
    </div>
  );
}
