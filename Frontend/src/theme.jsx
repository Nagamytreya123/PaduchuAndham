import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#0b5cff" },
    secondary: { main: "#ff6b6b" }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 }
      }
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  }
});

export default theme;
