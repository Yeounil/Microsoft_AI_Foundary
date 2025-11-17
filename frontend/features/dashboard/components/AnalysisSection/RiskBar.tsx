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
  const size = 180;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // 반원이므로 전체 둘레의 절반

  // 퍼센테이지를 각도로 변환 (180도 = 100%)
  // 왼쪽(180도)에서 오른쪽(0도)으로 - 아래쪽 반원
  const angle = (progress / 100) * 180;

  // Arc path 생성 함수
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(size / 2, size / 2, radius, endAngle);
    const end = polarToCartesian(size / 2, size / 2, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  // 극좌표를 직교좌표로 변환
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees + 180) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  return (
    <div className="flex flex-col items-center space-y-4 min-w-[200px]">
      <div className="flex justify-center">
        <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} className="overflow-visible">
          {/* 배경 트랙 (단일 회색) */}
          <path
            d={createArc(0, 180)}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* 현재 값을 나타내는 채워진 arc */}
          <path
            d={createArc(0, angle)}
            fill="none"
            stroke={
              progress <= 33
                ? "#22c55e"
                : progress <= 50
                ? "#84cc16"
                : progress <= 66
                ? "#eab308"
                : progress <= 80
                ? "#f97316"
                : "#ef4444"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
          />

          {/* 중앙 퍼센테이지 텍스트 */}
          <text
            x={size / 2}
            y={size / 2 - 5}
            textAnchor="middle"
            className="text-3xl font-bold fill-foreground"
          >
            {progress}%
          </text>
        </svg>
      </div>

      {/* 하단 레이블과 Badge */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-semibold text-foreground/90">{label}</span>
        <Badge
          variant={getRiskBadgeVariant(level)}
          className="text-xs px-3 py-1 font-medium"
        >
          {getRiskText(level)}
        </Badge>
      </div>
    </div>
  );
}
