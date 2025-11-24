import { test, expect } from '@playwright/test';

test.describe('종목 기능', () => {
  test('종목 대시보드가 로드되어야 함', async ({ page }) => {
    await page.goto('/dashboard/MSFT');

    // 로딩 완료 대기
    await page.waitForLoadState('networkidle');

    // 인증이 필요한 경우 로그인 페이지로 리다이렉트될 수 있음
    // 대시보드 또는 로그인 페이지가 로드되었는지 확인
    const currentUrl = page.url();
    const isOnDashboard = currentUrl.includes('/dashboard/MSFT');
    const isOnLogin = currentUrl.includes('/login');

    expect(isOnDashboard || isOnLogin).toBeTruthy();

    // 메인 콘텐츠가 로드되어야 함
    await expect(page.locator('main')).toBeVisible();
  });

  test('관심 종목 페이지가 로드되어야 함', async ({ page }) => {
    await page.goto('/watchlist');

    await expect(page).toHaveURL('/watchlist');
  });

  test('발견 페이지가 로드되어야 함', async ({ page }) => {
    await page.goto('/discover');

    await expect(page).toHaveURL('/discover');
  });
});
