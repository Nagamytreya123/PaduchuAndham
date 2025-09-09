// src/utils/api.js
// src/utils/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8081/api";

function getAuthToken() {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

/**
 * Simple fetch wrapper for JSON APIs.
 * endpoint: "/auth/login" (includes leading slash)
 * options: fetch options
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.message || data)) || res.statusText || "API error";
    const err = new Error(msg);
    err.status = res.status;
    err.response = data;
    throw err;
  }
  return data;
}
