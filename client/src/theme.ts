import { createTheme } from '@mui/material/styles';

/** High-end editorial system: Noto Serif + Inter, monochromatic surfaces, 0px radius. */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      contrastText: '#e2e2e2',
    },
    secondary: {
      main: '#3b3b3b',
      contrastText: '#e2e2e2',
    },
    background: {
      default: '#f9f9f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#1b1b1b',
      secondary: 'rgba(27, 27, 27, 0.62)',
    },
    divider: 'rgba(198, 198, 198, 0.15)',
    action: {
      hover: 'rgba(27, 27, 27, 0.04)',
      selected: 'rgba(27, 27, 27, 0.08)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontSize: '2.5rem',
      fontWeight: 400,
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Noto Serif", "Georgia", serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.6875rem',
      letterSpacing: '0.1rem',
      textTransform: 'uppercase',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    subtitle2: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 0,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f9f9f9',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingLeft: '1.4rem',
          paddingRight: '1.4rem',
        },
        containedPrimary: {
          background: 'linear-gradient(180deg, #000000 0%, #3b3b3b 100%)',
          '&:hover': {
            background: 'linear-gradient(180deg, #1a1a1a 0%, #4a4a4a 100%)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderColor: 'rgba(198, 198, 198, 0.15)',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9375rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#000000',
          height: 2,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: 'rgba(198, 198, 198, 0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});
