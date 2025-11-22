import { Badge } from "@/components/ui/badge";
import {
  RiskLevel,
  getRiskText,
  getRiskProgress,
  getRiskBadgeVariant,
} from "../../services/analysisService";

interface RiskBarProps {
  label: string;
  level: RiskLevel;
}

export function RiskBar({ label, level }: RiskBarProps) {
  const progress = getRiskProgress(level);

  // 색상 결정 - 더 부드러운 그라데이션 색상
  const getColor = (p: number) => {
    if (p <= 20) return "#10b981"; // emerald-500
    if (p <= 40) return "#34d399"; // emerald-400
    if (p <= 60) return "#fbbf24"; // amber-400
    if (p <= 80) return "#fb923c"; // orange-400
    return "#f87171"; // red-400
  };

  const getBackgroundColor = (p: number) => {
    if (p <= 20) return "rgb(16 185 129 / 0.1)"; // emerald-500 with opacity
    if (p <= 40) return "rgb(52 211 153 / 0.1)"; // emerald-400 with opacity
    if (p <= 60) return "rgb(251 191 36 / 0.1)"; // amber-400 with opacity
    if (p <= 80) return "rgb(251 146 60 / 0.1)"; // orange-400 with opacity
    return "rgb(248 113 113 / 0.1)"; // red-400 with opacity
  };

  const color = getColor(progress);
  const bgColor = getBackgroundColor(progress);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm transition-all hover:bg-card/80 w-full">
      {/* 상단: 레이블과 값 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color }}>{progress}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>

      {/* 리스크 레벨 Badge */}
      <div className="flex justify-between items-center">
        <Badge
          variant={getRiskBadgeVariant(level)}
          className="text-[10px] px-2 py-0.5 font-medium"
        >
          {getRiskText(level)}
        </Badge>

        {/* 추가 컨텍스트 정보 */}
        <span className="text-xs text-muted-foreground">
          {progress <= 40 ? "안정적" : progress <= 70 ? "주의필요" : "위험"}
        </span>
      </div>
    </div>
  );
}