'use client';

import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#FEE500', // I NEED RED Primary Yellow
    },
    secondary: {
      main: '#3C1E1E', // I NEED RED Secondary Brown
    },
    background: {
      default: '#F8FAFC', // Subtle gradient background (slate-50)
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#64748B', // slate-500
    },
    error: {
      main: '#FF1744', // Red for price increase (Korean convention)
    },
    info: {
      main: '#2196F3', // Blue for price decrease
    },
    success: {
      main: '#4CAF50', // Green for success states
    },
    warning: {
      main: '#FFC107', // Orange for warnings
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
      color: '#1E293B', // slate-800
    },
    h5: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h6: {
      fontWeight: 600,
      color: '#1E293B',
    },
    body1: {
      color: '#334155', // slate-700
    },
    body2: {
      color: '#64748B', // slate-500
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          color: '#1E293B',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0', // slate-200
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
        containedPrimary: {
          backgroundColor: '#FEE500',
          color: '#3C1E1E',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            backgroundColor: '#FEE500',
            opacity: 0.9,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
        outlined: {
          borderColor: '#CBD5E1', // slate-300
          color: '#475569', // slate-600
          '&:hover': {
            backgroundColor: '#F1F5F9', // slate-100
            borderColor: '#94A3B8', // slate-400
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.95rem',
          minHeight: 48,
          '&.Mui-selected': {
            color: '#3C1E1E',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
        indicator: {
          backgroundColor: '#FEE500',
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#E2E8F0',
            },
            '&:hover fieldset': {
              borderColor: '#CBD5E1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FEE500',
              borderWidth: 2,
            },
          },
        },
      },
    },
  },
});
