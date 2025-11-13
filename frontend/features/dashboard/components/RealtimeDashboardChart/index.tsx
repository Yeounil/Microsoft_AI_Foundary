/**
 * RealtimeDashboardChart Component
 * 리팩토링된 실시간 대시보드 차트 컴포넌트의 진입점입니다.
 *
 * Container-Presentation 패턴:
 * - Container: DashboardChartContainer (로직 및 상태 관리)
 * - Presentation: DashboardChartHeader, TimeRangeSelector, IntervalSelector, ChartCanvas (UI만 담당)
 * - main의 Chart hooks 재사용
 */

export { DashboardChartContainer as RealtimeDashboardChart } from "../../containers/DashboardChartContainer";
