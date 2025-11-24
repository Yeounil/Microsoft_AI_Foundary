/**
 * AnalysisSection Component
 * 리팩토링된 분석 섹션 컴포넌트의 진입점입니다.
 *
 * Container-Presentation 패턴:
 * - Container: AnalysisSectionContainer (로직 및 상태 관리)
 * - Presentation: AIAnalysisCard, BasicDataCard, RiskAnalysisCard, RiskBar (UI만 담당)
 */

export { AnalysisSectionContainer as AnalysisSection } from "../../containers/AnalysisSectionContainer";
