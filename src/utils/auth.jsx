import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_USERS_KEY = "mock_users_v1";
const STORAGE_CURRENT_USER = "mock_current_user_v1";

const AuthContext = createContext(null);

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setStoredUsers(list) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_CURRENT_USER));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_CURRENT_USER);
  }, [user]);

  // register: save user if email not taken
  const register = async ({ name, email, password }) => {
    const users = getStoredUsers();
    if (users.find(u => u.email === email)) {
      throw new Error("Email already registered");
    }
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      // DO NOT store plain password in production; here it's mock-only
      password,
      provider: "local"
    };
    users.push(newUser);
    setStoredUsers(users);
    setUser({ id: newUser.id, name: newUser.name, email: newUser.email, provider: "local" });
    return user;
  };

  const login = async ({ email, password }) => {
    const users = getStoredUsers();
    const u = users.find(x => x.email === email && x.password === password);
    if (!u) throw new Error("Invalid email or password");
    setUser({ id: u.id, name: u.name, email: u.email, provider: u.provider || "local" });
  };

  const signOut = () => {
    setUser(null);
  };

  // Simulated Google OAuth flow (for now)
  // In production: replace this with Google Identity Services client flow
  const signInWithGoogleSimulated = async () => {
    // Simulate an OAuth popup & response
    // We'll auto-create a user with a mock google profile.
    const googleProfile = {
      id: "google_" + Date.now().toString(),
      name: "Google User",
      email: `user${Math.floor(Math.random() * 1000)}@gmail.com`,
      provider: "google"
    };

    // If user already exists (by email), reuse; else create
    const users = getStoredUsers();
    let u = users.find(x => x.email === googleProfile.email);
    if (!u) {
      u = {
        id: googleProfile.id,
        name: googleProfile.name,
        email: googleProfile.email,
        provider: "google"
      };
      users.push(u);
      setStoredUsers(users);
    }
    setUser({ id: u.id, name: u.name, email: u.email, provider: u.provider });
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, register, login, signOut, signInWithGoogleSimulated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
