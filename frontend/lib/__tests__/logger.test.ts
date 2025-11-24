import { logger } from '../logger';

describe('logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
    debug: jest.spyOn(console, 'debug').mockImplementation(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  describe('development 환경', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    it('info 메시지를 로깅해야 함', () => {
      logger.info('테스트 메시지');
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO]', '테스트 메시지');
    });

    it('warn 메시지를 로깅해야 함', () => {
      logger.warn('경고 메시지');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN]', '경고 메시지');
    });

    it('error 메시지를 로깅해야 함', () => {
      logger.error('에러 메시지');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', '에러 메시지');
    });

    it('debug 메시지를 로깅해야 함', () => {
      logger.debug('디버그 메시지');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[DEBUG]', '디버그 메시지');
    });

    it('여러 인자를 지원해야 함', () => {
      logger.info('메시지', { data: 'test' }, 123);
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO]', '메시지', { data: 'test' }, 123);
    });
  });

  describe('production 환경', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    it('info 메시지를 로깅하지 않아야 함', () => {
      logger.info('테스트 메시지');
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('warn 메시지를 로깅하지 않아야 함', () => {
      logger.warn('경고 메시지');
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('error 메시지는 로깅해야 함', () => {
      logger.error('에러 메시지');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', '에러 메시지');
    });

    it('debug 메시지를 로깅하지 않아야 함', () => {
      logger.debug('디버그 메시지');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });
});
