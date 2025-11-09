/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack 비활성화 (한글 경로 이슈로 인해 webpack 사용)
  turbo: {
    enabled: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 개발 서버 설정
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
          : 'http://localhost:8000/:path*',
      },
    ];
  },
  // TradingView 위젯을 위한 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://widgetdata.tradingview.com wss://widgetdata.tradingview.com https://s3.tradingview.com http://localhost:8000 https://paliuunnemiuvexjmfyq.supabase.co",
              "frame-src 'self' https://s.tradingview.com https://www.tradingview-widget.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
