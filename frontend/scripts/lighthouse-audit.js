/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Lighthouse Performance Audit Script
 *
 * 사용법:
 * 1. npm run dev로 개발 서버 시작
 * 2. node scripts/lighthouse-audit.js
 *
 * 또는 npm run lighthouse 실행
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const URLS = [
  { url: 'http://localhost:3000', name: 'main' },
  { url: 'http://localhost:3000/main', name: 'home' },
  { url: 'http://localhost:3000/watchlist', name: 'watchlist' },
];

const CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
    },
  },
};

async function runLighthouseAudit() {
  console.log('🚀 Starting Lighthouse Performance Audit\n');

  // Chrome 실행
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  const results = [];

  for (const { url, name } of URLS) {
    console.log(`📊 Auditing: ${name} (${url})`);

    try {
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
      }, CONFIG);

      const { lhr } = runnerResult;
      const scores = {
        name,
        url,
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        metrics: {
          fcp: lhr.audits['first-contentful-paint'].numericValue,
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          si: lhr.audits['speed-index'].numericValue,
          ttfb: lhr.audits['server-response-time'].numericValue,
        },
      };

      results.push(scores);

      // 개별 리포트 저장
      const reportPath = path.join(__dirname, '..', 'lighthouse-reports', `${name}-report.json`);
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));

      console.log(`   Performance: ${scores.performance}`);
      console.log(`   Accessibility: ${scores.accessibility}`);
      console.log(`   Best Practices: ${scores.bestPractices}`);
      console.log(`   SEO: ${scores.seo}`);
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error auditing ${name}:`, error.message);
      console.log('');
    }
  }

  await chrome.kill();

  // 요약 리포트 생성
  console.log('📋 Summary Report\n');
  console.log('=' .repeat(60));

  results.forEach((result) => {
    console.log(`\n📄 ${result.name} (${result.url})`);
    console.log('-'.repeat(40));
    console.log(`   🎯 Performance:    ${result.performance}%`);
    console.log(`   ♿ Accessibility:  ${result.accessibility}%`);
    console.log(`   ✅ Best Practices: ${result.bestPractices}%`);
    console.log(`   🔍 SEO:           ${result.seo}%`);
    console.log('\n   Core Web Vitals:');
    console.log(`      FCP: ${(result.metrics.fcp / 1000).toFixed(2)}s`);
    console.log(`      LCP: ${(result.metrics.lcp / 1000).toFixed(2)}s`);
    console.log(`      TBT: ${result.metrics.tbt.toFixed(0)}ms`);
    console.log(`      CLS: ${result.metrics.cls.toFixed(3)}`);
    console.log(`      SI:  ${(result.metrics.si / 1000).toFixed(2)}s`);
    console.log(`      TTFB: ${result.metrics.ttfb.toFixed(0)}ms`);
  });

  // 요약 리포트 저장
  const summaryPath = path.join(__dirname, '..', 'lighthouse-reports', 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
  }, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Audit complete! Reports saved to lighthouse-reports/`);

  // 목표 달성 여부 체크
  console.log('\n🎯 Goal Check:');
  const avgPerformance = results.reduce((sum, r) => sum + r.performance, 0) / results.length;
  console.log(`   Average Performance: ${avgPerformance.toFixed(0)}% (Target: 90%+)`);

  if (avgPerformance >= 90) {
    console.log('   ✅ Performance goal achieved!');
  } else {
    console.log(`   ⚠️  ${(90 - avgPerformance).toFixed(0)}% improvement needed`);
  }
}

runLighthouseAudit().catch(console.error);
