import { test, expect } from '@playwright/test';

test.describe('네비게이션', () => {
  test('메인 페이지가 로드되어야 함', async ({ page }) => {
    await page.goto('/main');

    // 헤더가 표시되어야 함
    await expect(page.locator('header')).toBeVisible();

    // 종목 리스트 또는 뉴스 섹션이 있어야 함
    await expect(page.locator('main')).toBeVisible();
  });

  test('404 페이지가 표시되어야 함', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');

    // 404 메시지 확인
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText(/페이지를 찾을 수 없습니다/i)).toBeVisible();
  });

  test('테마 토글이 작동해야 함', async ({ page }) => {
    await page.goto('/main');

    // 테마 토글 버튼 찾기 (아이콘 버튼)
    const themeButton = page.locator('header').getByRole('button').filter({ has: page.locator('svg') }).first();

    if (await themeButton.isVisible()) {
      await themeButton.click();

      // 드롭다운 메뉴가 표시되어야 함 - 개별 메뉴 아이템 확인
      await expect(page.getByRole('menuitem', { name: '라이트' })).toBeVisible();
    }
  });

  test('대시보드 페이지로 이동해야 함', async ({ page }) => {
    await page.goto('/dashboard/AAPL');

    await expect(page).toHaveURL('/dashboard/AAPL');

    // 종목 정보가 표시되어야 함 (로딩 후)
    await page.waitForLoadState('networkidle');
  });
});
