/**
 * NewsAnalysis Component
 * 리팩토링된 뉴스 분석 컴포넌트의 진입점입니다.
 *
 * Container-Presentation 패턴:
 * - Container: NewsAnalysisContainer (로직 및 상태 관리)
 * - Presentation: NewsAnalysisHeader, ArticleHeader, ImpactAnalysis, ContentTabs, RelatedNewsList (UI만 담당)
 */

export { NewsAnalysisContainer as NewsAnalysis } from "../../containers/NewsAnalysisContainer";
