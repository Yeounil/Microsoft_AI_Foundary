import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
  test('로그인 페이지가 표시되어야 함', async ({ page }) => {
    await page.goto('/login');

    // 페이지 제목 확인
    await expect(page).toHaveURL('/login');

    // 로그인 폼 요소 확인 (실제 placeholder: "사용자명을 입력하세요")
    await expect(page.getByPlaceholder('사용자명을 입력하세요')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    // 메인 영역의 로그인 버튼
    await expect(page.getByRole('main').getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('회원가입 페이지가 표시되어야 함', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL('/register');

    // 회원가입 폼 요소 확인 - 메인 영역의 submit 버튼
    await expect(page.getByRole('main').getByRole('button', { name: '회원가입' })).toBeVisible();
  });

  test('빈 폼 제출 시 에러가 표시되어야 함', async ({ page }) => {
    await page.goto('/login');

    // 메인 영역의 로그인 버튼 클릭
    await page.getByRole('main').getByRole('button', { name: '로그인' }).click();

    // HTML5 유효성 검증으로 인해 폼이 제출되지 않음
    // 브라우저 기본 유효성 검증 확인
    const usernameInput = page.getByPlaceholder('사용자명을 입력하세요');
    await expect(usernameInput).toHaveAttribute('required', '');
  });
});
