import { render, screen, fireEvent } from '@testing-library/react';
import { LoginFormFields } from '../components/Login/LoginFormFields';

describe('LoginFormFields', () => {
  const defaultProps = {
    formData: {
      username: '',
      password: '',
    },
    isLoading: false,
    error: null,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('입력 필드가 렌더링되어야 함', () => {
    render(<LoginFormFields {...defaultProps} />);

    expect(screen.getByPlaceholderText('사용자명을 입력하세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('로그인 버튼이 렌더링되어야 함', () => {
    render(<LoginFormFields {...defaultProps} />);

    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('입력 시 onChange 핸들러가 호출되어야 함', () => {
    render(<LoginFormFields {...defaultProps} />);

    const usernameInput = screen.getByPlaceholderText('사용자명을 입력하세요');
    fireEvent.change(usernameInput, { target: { value: 'testuser', id: 'username' } });

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('에러 메시지가 표시되어야 함', () => {
    const error = '로그인에 실패했습니다.';
    render(<LoginFormFields {...defaultProps} error={error} />);

    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('로딩 중일 때 버튼이 비활성화되어야 함', () => {
    render(<LoginFormFields {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('로그인 중...')).toBeInTheDocument();
  });

  it('로딩 중일 때 입력 필드가 비활성화되어야 함', () => {
    render(<LoginFormFields {...defaultProps} isLoading={true} />);

    expect(screen.getByPlaceholderText('사용자명을 입력하세요')).toBeDisabled();
    expect(screen.getByPlaceholderText('••••••••')).toBeDisabled();
  });

  it('formData 값이 입력 필드에 표시되어야 함', () => {
    const formData = {
      username: 'testuser',
      password: 'password123',
    };

    render(<LoginFormFields {...defaultProps} formData={formData} />);

    expect(screen.getByPlaceholderText('사용자명을 입력하세요')).toHaveValue('testuser');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('password123');
  });

  it('필수 필드가 required 속성을 가져야 함', () => {
    render(<LoginFormFields {...defaultProps} />);

    expect(screen.getByPlaceholderText('사용자명을 입력하세요')).toBeRequired();
    expect(screen.getByPlaceholderText('••••••••')).toBeRequired();
  });
});
