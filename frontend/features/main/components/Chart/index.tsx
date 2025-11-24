/**
 * Chart Component
 * 리팩토링된 실시간 차트 컴포넌트의 진입점입니다.
 *
 * 이 컴포넌트는 Container-Presentation 패턴을 따릅니다:
 * - Container: RealtimeChartContainer (로직 및 상태 관리)
 * - Presentation: Chart 하위 컴포넌트들 (UI만 담당)
 */

export { RealtimeChartContainer as Chart } from "../../containers/RealtimeChartContainer";

// 기존 RealtimeStockChart와의 호환성을 위한 export
export { RealtimeChartContainer as RealtimeStockChart } from "../../containers/RealtimeChartContainer";
