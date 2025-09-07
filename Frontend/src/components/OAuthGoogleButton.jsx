// src/components/OAuthGoogleButton.jsx
import React from "react";
import Button from "@mui/material/Button";
import GoogleIcon from "@mui/icons-material/Google";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export default function GoogleButton({ onClick, disabled, sx }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      startIcon={<GoogleIcon />}
      variant="outlined"
      fullWidth
      sx={{
        textTransform: "none",
        borderRadius: 2,
        borderColor: "grey.300",
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="button" sx={{ fontWeight: 600 }}>
          Sign in with Google
        </Typography>
      </Stack>
    </Button>
  );
}
