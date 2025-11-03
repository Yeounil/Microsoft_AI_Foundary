'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Stack,
  IconButton,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  analysis: string;
  symbol: string;
  isLoading?: boolean;
}

// 애니메이션 스타일
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    25% {
      transform: translateY(-8px);
    }
    50% {
      transform: translateY(0);
    }
    75% {
      transform: translateY(-4px);
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
    }
  }

  .analysis-paragraph {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .analysis-paragraph:nth-child(1) { animation-delay: 0.1s; }
  .analysis-paragraph:nth-child(2) { animation-delay: 0.2s; }
  .analysis-paragraph:nth-child(3) { animation-delay: 0.3s; }
  .analysis-paragraph:nth-child(4) { animation-delay: 0.4s; }
  .analysis-paragraph:nth-child(5) { animation-delay: 0.5s; }
  .analysis-paragraph:nth-child(n+6) { animation-delay: 0.6s; }

  .loading-skeleton {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }

  .loading-spinner {
    animation: pulse 1.5s ease-in-out infinite;
  }

  .loading-dot {
    animation: bounce 1.4s ease-in-out infinite;
  }

  .loading-dot:nth-child(1) {
    animation-delay: 0s;
  }

  .loading-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .float-icon {
    animation: float 3s ease-in-out infinite;
  }

  .glow-box {
    animation: glow 2s ease-in-out infinite;
  }

  .slide-in-text {
    animation: slideIn 0.8s ease-out forwards;
  }

  .slide-in-text:nth-child(1) { animation-delay: 0.2s; }
  .slide-in-text:nth-child(2) { animation-delay: 0.4s; }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    animation: slideDown 0.6s ease-out;
  }
`;

// 분석 텍스트를 단락으로 분리
const splitIntoParagraphs = (text: string): string[] => {
  return text
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
};

// 단락 번호 추출
const extractHeadingNumber = (text: string): number | null => {
  const match = text.match(/^#+\s+/);
  return match ? match[0].length - 1 : null;
};

export default function AIAnalysisModal({
  open,
  onClose,
  analysis,
  symbol,
  isLoading = false
}: AIAnalysisModalProps) {
  const paragraphs = useMemo(
    () => splitIntoParagraphs(analysis),
    [analysis]
  );

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([analysis], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${symbol}_AI_분석_보고서.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${symbol} AI 분석 보고서`,
          text: analysis,
        });
      } catch (err) {
        console.error('공유 실패:', err);
      }
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(analysis);
      alert('분석 보고서가 클립보드에 복사되었습니다.');
    }
  };

  return (
    <>
      <style>{animationStyles}</style>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backdropFilter: 'blur(4px)',
            backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          }
        }}
      >
        {/* 헤더 */}
        <DialogTitle
          className="modal-header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: '1px solid #e0e0e0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PsychologyIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
                AI 심층 분석 보고서
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {symbol} 종목에 대한 AI 기반 종합 분석
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* 콘텐츠 */}
        <DialogContent
          sx={{
            py: 3,
            px: 3,
            maxHeight: '70vh',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#667eea',
              borderRadius: '4px',
              '&:hover': {
                background: '#764ba2',
              },
            },
          }}
        >
          {isLoading ? (
            // 로딩 상태 - 풍부한 애니메이션
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                gap: 4,
              }}
            >
              {/* 메인 애니메이션 - 플로팅 심리학 아이콘 */}
              <Box
                className="glow-box"
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  width: 120,
                  height: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress
                  size={120}
                  thickness={3}
                  sx={{
                    color: '#667eea',
                    position: 'absolute',
                  }}
                />
                <Box
                  className="float-icon"
                  sx={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PsychologyIcon
                    sx={{
                      fontSize: 48,
                      color: '#667eea',
                      filter: 'drop-shadow(0 0 10px rgba(102, 126, 234, 0.5))',
                    }}
                  />
                </Box>
              </Box>

              {/* 제목 및 설명 - 슬라이드 인 애니메이션 */}
              <Stack alignItems="center" spacing={2}>
                <Box className="slide-in-text">
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                    }}
                  >
                    AI가 분석 중입니다
                  </Typography>
                </Box>

                <Box className="slide-in-text">
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                    sx={{ maxWidth: 400 }}
                  >
                    🔍 뉴스와 시장 데이터를 종합 분석 중입니다
                  </Typography>
                </Box>
              </Stack>

              {/* 진행 상황 점들 - 바운스 애니메이션 */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    className="loading-dot"
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  />
                ))}
              </Box>

              {/* 상태 텍스트 */}
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                분석 진행 상황: 뉴스 수집 → 데이터 처리 → 종합 분석 → 보고서 생성
              </Typography>

              {/* 로딩 진행률 표시 */}
              <Box sx={{ width: '100%', maxWidth: 300 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 4,
                    backgroundColor: '#e0e0e0',
                    borderRadius: 2,
                    overflow: 'hidden',
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      animation: 'shimmer 2s infinite',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </Box>
              </Box>

              {/* 로딩 스켈레톤 - 예시 콘텐츠 */}
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ textAlign: 'center', fontWeight: 600 }}
                >
                  📋 예상 보고서 구조
                </Typography>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ animation: `fadeInUp 0.8s ease-out ${i * 0.15}s backwards` }}>
                    <Box
                      className="loading-skeleton"
                      sx={{
                        height: 10,
                        borderRadius: 2,
                        mb: 0.5,
                        width: i === 1 ? '85%' : i === 2 ? '95%' : '75%',
                      }}
                    />
                    <Box
                      className="loading-skeleton"
                      sx={{
                        height: 8,
                        borderRadius: 2,
                        width: '100%',
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {/* 팁 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#f0f4ff',
                  border: '1px solid #d0d9f7',
                  borderRadius: 2,
                  width: '100%',
                  maxWidth: 300,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#667eea',
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  💡 팁
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  AI 분석이 완료되면 단락별로 읽기 쉽게 표시됩니다.
                </Typography>
              </Paper>
            </Box>
          ) : (
            // 분석 결과
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 정보 배너 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#f0f4ff',
                  border: '1px solid #d0d9f7',
                  borderRadius: 2,
                  display: 'flex',
                  gap: 1.5,
                }}
              >
                <InfoIcon
                  sx={{
                    color: '#667eea',
                    fontSize: 20,
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#667eea',
                      mb: 0.5,
                    }}
                  >
                    AI 분석 정보
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    이 분석은 최근 뉴스와 시장 데이터를 기반으로 생성되었습니다.
                    투자 결정은 신중하게 하시기 바랍니다.
                  </Typography>
                </Box>
              </Paper>

              {/* 분석 텍스트 - 단락별 구분 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, idx) => (
                    <Box key={idx} className="analysis-paragraph">
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: 2,
                          borderLeft: '4px solid #667eea',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.1)',
                            borderLeftColor: '#764ba2',
                          },
                        }}
                      >
                        {/* 제목이 있는 단락인 경우 */}
                        {paragraph.startsWith('#') ? (
                          <>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#667eea',
                                mb: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#667eea',
                                }}
                              />
                              {paragraph.replace(/^#+\s+/, '')}
                            </Typography>
                          </>
                        ) : (
                          <Box
                            sx={{
                              '& h1, & h2, & h3, & h4, & h5, & h6': {
                                color: '#667eea',
                                fontWeight: 700,
                                marginTop: 1.5,
                                marginBottom: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                '&:before': {
                                  content: '""',
                                  display: 'inline-block',
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: '#667eea',
                                },
                              },
                              '& h2': { fontSize: '1.25rem' },
                              '& h3': { fontSize: '1.1rem' },
                              '& p': {
                                marginBottom: 1,
                                lineHeight: 1.8,
                                color: '#374151',
                                fontSize: '0.95rem',
                              },
                              '& ul, & ol': {
                                paddingLeft: 1.5,
                                marginBottom: 1,
                                '& li': {
                                  marginBottom: 0.5,
                                  lineHeight: 1.7,
                                  color: '#374151',
                                },
                              },
                              '& strong': {
                                fontWeight: 700,
                                color: '#667eea',
                              },
                              '& em': {
                                fontStyle: 'italic',
                                color: '#764ba2',
                              },
                              '& code': {
                                backgroundColor: '#f3f4f6',
                                padding: '2px 6px',
                                borderRadius: 1,
                                fontSize: '0.875rem',
                                color: '#667eea',
                                fontFamily: 'monospace',
                              },
                              '& blockquote': {
                                borderLeft: '4px solid #667eea',
                                paddingLeft: 1.5,
                                marginLeft: 0,
                                marginRight: 0,
                                color: '#6b7280',
                                fontStyle: 'italic',
                              },
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {paragraph}
                            </ReactMarkdown>
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  ))
                ) : (
                  <Typography color="textSecondary" align="center">
                    분석 결과가 없습니다.
                  </Typography>
                )}
              </Box>

              {/* 구분선 */}
              <Divider sx={{ my: 1 }} />

              {/* 면책조항 */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#92400e',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ 이 분석은 AI가 생성한 참고 자료이며, 실제 투자 결정은 신중히 해주시기 바랍니다.
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>

        {/* 액션 버튼 */}
        <DialogActions
          sx={{
            p: 2,
            borderTop: '1px solid #e0e0e0',
            gap: 1,
          }}
        >
          <Button
            startIcon={<ShareIcon />}
            onClick={handleShare}
            variant="outlined"
            disabled={isLoading}
            sx={{
              color: '#667eea',
              borderColor: '#667eea',
              '&:hover': {
                borderColor: '#764ba2',
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
          >
            공유
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            variant="outlined"
            disabled={isLoading}
            sx={{
              color: '#667eea',
              borderColor: '#667eea',
              '&:hover': {
                borderColor: '#764ba2',
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
          >
            다운로드
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={onClose}
            variant="contained"
            disabled={isLoading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
              },
            }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
