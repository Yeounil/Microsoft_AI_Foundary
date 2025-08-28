import React, { useEffect, useRef } from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const sectionsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.5 } // 50% of the item must be visible
    );

    const currentSections = sectionsRef.current;
    currentSections.forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
        currentSections.forEach((section) => {
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, []);

  const addToRefs = (el: HTMLDivElement) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  return (
    <div className="landing-container">
      <section ref={addToRefs} className="landing-section section-1">
        <div className="landing-content">
          <h1>AI 금융 분석에 오신 것을 환영합니다</h1>
          <p>주식 시장 분석을 위한 원스톱 솔루션입니다.</p>
        </div>
        <div className="scroll-down-indicator">&#x2193;</div>
      </section>
      <section ref={addToRefs} className="landing-section section-2">
        <div className="landing-content">
          <h1>실시간 주식 차트</h1>
          <p>인터랙티브한 실시간 차트로 주식 성과를 분석하세요.</p>
        </div>
      </section>
      <section ref={addToRefs} className="landing-section section-3">
        <div className="landing-content">
          <h1>AI 기반 분석 및 뉴스</h1>
          <p>선택한 주식에 대한 최신 뉴스와 AI 기반 분석을 받아보세요.</p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
