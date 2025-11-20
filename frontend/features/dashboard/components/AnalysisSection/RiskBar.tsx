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
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;

  // 퍼센테이지를 각도로 변환 (180도 = 100%)
  const angle = (progress / 100) * 180;

  // Arc path 생성 함수
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(size / 2, size / 2, radius, endAngle);
    const end = polarToCartesian(size / 2, size / 2, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  // 극좌표를 직교좌표로 변환
  function polarToCartesian(centerX: number, centerY: number, r: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees + 180) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  }

  // 색상 결정 - 더 부드러운 그라데이션 색상
  const getColor = (p: number) => {
    if (p <= 20) return "#10b981"; // emerald-500
    if (p <= 40) return "#34d399"; // emerald-400
    if (p <= 60) return "#fbbf24"; // amber-400
    if (p <= 80) return "#fb923c"; // orange-400
    return "#f87171"; // red-400
  };

  const color = getColor(progress);

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all hover:bg-card/80">
      {/* 레이블 */}
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>

      {/* 게이지 차트 */}
      <div className="relative">
        <svg width={size} height={size * 0.55} viewBox={`0 0 ${size} ${size * 0.55}`}>
          {/* 배경 트랙 */}
          <path
            d={createArc(0, 180)}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.2}
          />

          {/* 현재 값 arc */}
          <path
            d={createArc(0, angle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />

          {/* 중앙 값 표시 */}
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            className="text-xl font-bold fill-foreground"
          >
            {progress}
          </text>
        </svg>
      </div>

      {/* 리스크 레벨 Badge - 더 현대적인 스타일 */}
      <Badge
        variant={getRiskBadgeVariant(level)}
        className="text-[10px] px-2.5 py-0.5 font-medium"
      >
        {getRiskText(level)}
      </Badge>
    </div>
  );
}
