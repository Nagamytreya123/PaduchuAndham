// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../utils/auth";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  Link,
} from "@mui/material";

export default function Register() {
  const navigate = useNavigate();
  const { register, login } = useAuth(); // auto-login after register
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(form);

      // auto-login after successful registration
      await login({
        usernameOrEmail: form.email || form.username,
        password: form.password,
      });

      navigate("/profile");
    } catch (err) {
      const msg = err?.message || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 420 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Create account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            name="username"
            label="Username"
            value={form.username}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            name="email"
            label="Email"
            value={form.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? "Registering..." : "Create account"}
          </Button>

          {/* "Already have an account? Login" */}
          <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
            <Grid item>
              <Typography variant="body2" sx={{ display: "inline", mr: 1 }}>
                Already have an account?
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Login
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}
