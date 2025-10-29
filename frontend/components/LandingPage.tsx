import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { TrendingDown, ChevronDown, BarChart3, Newspaper, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import myLogo from '@/assets/myLogo.png';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.landing-section');
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          setActiveSection(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToNext = () => {
    const sections = document.querySelectorAll('.landing-section');
    if (activeSection < sections.length - 1) {
      sections[activeSection + 1].scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Section 1 - Welcome */}
      <section className="landing-section relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="flex justify-center mb-6">
              <Image
                src={myLogo}
                alt="I NEED RED Logo"
                width={250}
                height={100}
                priority
                className="object-contain"
              />
            </div>

            <h1 className="text-white text-5xl sm:text-6xl md:text-7xl mb-6">
              AI 금융 분석에<br />오신 것을 환영합니다
            </h1>

            <p className="text-white/90 text-xl sm:text-2xl mb-8 leading-relaxed">
              주식 시장 분석을 위한<br className="sm:hidden" /> 원스톱 솔루션입니다
            </p>

            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-secondary h-14 px-8 text-lg shadow-2xl"
            >
              시작하기
            </Button>
          </motion.div>

          <motion.button
            onClick={scrollToNext}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white hover:text-primary transition-colors"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-12 h-12" />
          </motion.button>
        </div>
      </section>

      {/* Section 2 - Real-time Charts */}
      <section className="landing-section relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/50"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-6">
              <BarChart3 className="w-10 h-10 text-secondary" />
            </div>

            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl mb-6">
              실시간 주식 차트
            </h2>

            <p className="text-white/90 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              인터랙티브한 실시간 차트로 시장 동향을 한눈에 파악하세요.
              다양한 기간과 인터벌 설정으로 원하는 정보를 정확하게 확인할 수 있습니다.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-primary text-2xl mb-1">1D-1Y</div>
                <div className="text-white/80 text-sm">기간 선택</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-primary text-2xl mb-1">실시간</div>
                <div className="text-white/80 text-sm">업데이트</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-primary text-2xl mb-1">자동</div>
                <div className="text-white/80 text-sm">새로고침</div>
              </div>
            </div>
          </motion.div>

          <motion.button
            onClick={scrollToNext}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white hover:text-primary transition-colors"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-12 h-12" />
          </motion.button>
        </div>
      </section>

      {/* Section 3 - AI Analysis & News */}
      <section className="landing-section relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/90 to-black/80"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full">
                <Sparkles className="w-10 h-10 text-secondary" />
              </div>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full">
                <Newspaper className="w-10 h-10 text-secondary" />
              </div>
            </div>

            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl mb-6">
              AI 기반 분석 및 뉴스
            </h2>

            <p className="text-white/90 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
              선택한 주식에 대한 최신 뉴스를 AI가 자동으로 수집하고 분석합니다.
              관심 종목을 등록하면 맞춤형 뉴스 추천을 받을 수 있습니다.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="bg-primary/20 backdrop-blur-sm border border-primary rounded-lg p-6 text-left">
                <Sparkles className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-white text-lg mb-2">AI 투자 분석</h3>
                <p className="text-white/70 text-sm">
                  머신러닝 기반 종합 분석으로 투자 적합도를 평가합니다
                </p>
              </div>
              <div className="bg-primary/20 backdrop-blur-sm border border-primary rounded-lg p-6 text-left">
                <Newspaper className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-white text-lg mb-2">뉴스 큐레이션</h3>
                <p className="text-white/70 text-sm">
                  관심 종목의 최신 뉴스를 AI가 요약하고 분석해드립니다
                </p>
              </div>
            </div>

            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-secondary h-14 px-8 text-lg shadow-2xl mt-8"
            >
              지금 시작하기
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
