// src/pages/Profile.jsx
import React from "react";
import { useAuth } from "../utils/auth";
import { Box, Paper, Typography, Button } from "@mui/material";

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h5">Profile</Typography>
        <Typography sx={{ mt: 2 }}>Username: {user?.username ?? "—"}</Typography>
        <Button sx={{ mt: 3 }} variant="outlined" onClick={() => {
          logout();
          window.location.href = "/login";
        }}>
          Log out
        </Button>
      </Paper>
    </Box>
  );
}
