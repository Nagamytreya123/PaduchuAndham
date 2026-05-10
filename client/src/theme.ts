import { createTheme } from '@mui/material/styles';

/** Luxury editorial system: Cormorant Garamond + Inter, monochromatic dark surfaces. */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D6B36A',
      contrastText: '#0F0F10',
    },
    secondary: {
      main: '#8A8175',
      contrastText: '#F5F5F5',
    },
    background: {
      default: '#0F0F10',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#E8DCCB',
    },
    divider: 'rgba(214, 179, 106, 0.15)',
    action: {
      hover: 'rgba(214, 179, 106, 0.08)',
      selected: 'rgba(214, 179, 106, 0.16)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontSize: '3.5rem',
      fontWeight: 400,
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontSize: '2.5rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.1rem',
      textTransform: 'uppercase',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.05em',
      fontFamily: '"Inter", sans-serif',
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
          backgroundColor: '#0F0F10',
          color: '#F5F5F5',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingLeft: '2rem',
          paddingRight: '2rem',
          paddingTop: '0.75rem',
          paddingBottom: '0.75rem',
        },
        containedPrimary: {
          background: '#D6B36A',
          color: '#0F0F10',
          '&:hover': {
            background: '#b39556',
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
          borderColor: 'rgba(214, 179, 106, 0.15)',
          backgroundColor: 'transparent',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          backgroundImage: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '1rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#D6B36A',
          height: 2,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: 'rgba(214, 179, 106, 0.25)',
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
