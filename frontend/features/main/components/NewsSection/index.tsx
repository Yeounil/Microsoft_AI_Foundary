/**
 * NewsSection Component
 * 리팩토링된 뉴스 섹션 컴포넌트의 진입점입니다.
 *
 * Container-Presentation 패턴:
 * - Container: NewsSectionContainer (로직 및 상태 관리)
 * - Presentation: SearchBar, NewsCard, NewsList (UI만 담당)
 */

export { NewsSectionContainer as NewsSection } from "../../containers/NewsSectionContainer";
