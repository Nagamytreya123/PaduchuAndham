// src/utils/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api";

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("auth_user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const saveToken = (t) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem("auth_token", t);
      const payload = decodeJwt(t);
      if (payload) {
        const username = payload.username ?? payload.sub ?? null;
        const email = payload.email ?? null;
        const roles = payload.roles ?? null;
        const u = { username, email, roles };
        setUser(u);
        localStorage.setItem("auth_user", JSON.stringify(u));
      }
    } else {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setUser(null);
    }
  };

  useEffect(() => {
    if (token && !user) {
      const payload = decodeJwt(token);
      if (payload) {
        const username = payload.username ?? payload.sub ?? null;
        const email = payload.email ?? null;
        const roles = payload.roles ?? null;
        const u = { username, email, roles };
        setUser(u);
        localStorage.setItem("auth_user", JSON.stringify(u));
      }
    }
    // eslint-disable-next-line
  }, []);

  async function login(payload) {
    setLoading(true);
    try {
      const body = {
        usernameOrEmail: payload.usernameOrEmail ?? payload.email ?? payload.username,
        password: payload.password,
      };
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!data?.token) throw new Error("No token received from server");
      saveToken(data.token);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return data;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    saveToken(null);
  }

  // NEW: allow external components (Google flow) to set app token directly
  function setAppToken(appJwt) {
    saveToken(appJwt);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        logout,
        setAppToken,                    // <--- expose it here
        signInWithGoogleSimulated: async () => { // keep for dev if needed
          const demoToken = "simulated-demo-token";
          saveToken(demoToken);
          return { token: demoToken };
        },
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
