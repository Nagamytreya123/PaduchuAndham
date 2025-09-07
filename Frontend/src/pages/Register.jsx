// src/pages/Register.jsx
import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { Alert } from "@mui/material";
import GoogleButton from "../components/OAuthGoogleButton";

export default function Register() {
  const navigate = useNavigate();
  const { register, signInWithGoogleSimulated } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Please enter your name");
    if (!form.email.includes("@")) return setError("Enter a valid email");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      await register(form);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogleSimulated();
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url('/assets/bg-clothing.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      {/* dark overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 100%)",
          zIndex: 0,
        }}
      />

      {/* top-left brand */}
      <Box sx={{ position: "absolute", top: 24, left: 24, zIndex: 2 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "'Playfair Display', serif",
            color: "common.white",
            letterSpacing: 1,
            fontWeight: 700,
            textShadow: "0 3px 12px rgba(0,0,0,0.6)",
          }}
        >
          PaduchuAndam
        </Typography>
      </Box>

      {/* center card */}
      <Paper
        elevation={10}
        sx={{
          width: "100%",
          maxWidth: 520,
          p: 4,
          borderRadius: 3,
          zIndex: 3,
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(255,255,255,0.94)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
            Create account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ mt: 2, width: "100%" }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              value={form.password}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? "Creating account..." : "Register"}
            </Button>

            <GoogleButton
              onClick={onGoogle}
              disabled={loading}
              sx={{ mt: 1 }}
            />

            <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>

      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          bottom: 12,
          right: 12,
          color: "rgba(255,255,255,0.85)",
          zIndex: 2,
        }}
      >
        © PaduchuAndam
      </Typography>
    </Box>
  );
}
