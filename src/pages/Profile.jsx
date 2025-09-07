import React from "react";
import { useAuth } from "../utils/auth";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <Paper elevation={3} sx={{ p: 6, borderRadius: 3, minHeight: 300 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5">Welcome, {user?.name || "User"}</Typography>
        <Button variant="outlined" onClick={signOut}>Sign out</Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1">User details (mock):</Typography>
        <pre style={{ background: "#f7f7fb", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </Box>
    </Paper>
  );
}
