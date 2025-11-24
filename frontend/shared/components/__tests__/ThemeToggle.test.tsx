import { render, screen } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

describe('ThemeToggle', () => {
  it('테마 토글 버튼이 렌더링되어야 함', () => {
    render(<ThemeToggle />);

    // 마운트 후 버튼이 보여야 함
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('스크린 리더 텍스트가 있어야 함', () => {
    render(<ThemeToggle />);

    expect(screen.getByText('테마 변경')).toBeInTheDocument();
  });

  it('aria-haspopup 속성이 있어야 함', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-haspopup', 'menu');
  });
});
