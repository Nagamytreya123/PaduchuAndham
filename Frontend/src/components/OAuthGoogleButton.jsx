// src/components/OAuthGoogleButton.jsx
import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/api";

/**
 * Robust Google Sign-in button that retries render until visible/ready.
 * Props:
 *  - onSuccess(result)  // backend response { token }
 *  - onError(err)
 *  - theme/size/text/shape/width (optional)
 */
export default function OAuthGoogleButton({
  onSuccess,
  onError,
  theme = "outline",
  size = "large",
  text = "signin_with",
  shape = "rectangular",
  width = 280,
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const renderAttemptsRef = useRef(0);
  const maxAttempts = 6; // try ~6 times (with delay) before giving up

  useEffect(() => {
    if (!clientId) {
      console.error("VITE_GOOGLE_CLIENT_ID is not set");
      onError?.({ message: "Missing Google client id" });
      return;
    }

    // Load the Google Identity Services script if necessary
    if (!document.getElementById("gsi-script")) {
      const s = document.createElement("script");
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        setReady(true);
      };
      s.onerror = () => {
        onError?.({ message: "Failed to load Google SDK" });
      };
      document.body.appendChild(s);
    } else {
      // already present; consider it ready (but wait a tick for google object)
      setTimeout(() => setReady(true), 50);
    }
    // cleanup not required for script
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Decode and send idToken to backend
  async function handleCredentialResponse(response) {
    const idToken = response?.credential;
    if (!idToken) {
      onError?.({ message: "No credential returned by Google" });
      return;
    }
    try {
      const result = await apiFetch("/auth/oauth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
      onSuccess?.(result);
    } catch (err) {
      console.error("Backend oauth error", err);
      onError?.(err);
    }
  }

  // Attempt to render the Google button. Returns true if rendered, false otherwise.
  function tryRenderButton() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id || !containerRef.current) {
      return false;
    }

    // If previous iframe exists inside container, remove it to avoid duplicates/failures
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      // If the container is hidden (display:none, zero size), Google may not render; we'll still call renderButton
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme,
        size,
        text,
        shape,
        width,
        logo_alignment: "left",
      });
      return true;
    } catch (e) {
      console.warn("GSI renderButton threw:", e);
      return false;
    }
  }

  // Retry loop: try to render button now; if not, schedule retries
  useEffect(() => {
    if (!ready) return;
    renderAttemptsRef.current = 0;

    let mounted = true;
    const attempt = async () => {
      if (!mounted) return;
      renderAttemptsRef.current += 1;
      const ok = tryRenderButton();
      if (ok) {
        // success
        return;
      }
      if (renderAttemptsRef.current >= maxAttempts) {
        // last chance: set up IntersectionObserver to try when visible
        tryObserveVisibility();
        return;
      }
      // schedule another attempt (backoff)
      const delay = 300 * renderAttemptsRef.current; // 300ms, 600ms, 900ms...
      setTimeout(attempt, delay);
    };

    attempt();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, clientId]);

  // If rendering repeatedly fails (e.g., container is hidden), observe visibility and render when visible
  function tryObserveVisibility() {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // once visible, try rendering and disconnect
          tryRenderButton();
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(containerRef.current);

    // Cleanup: disconnect after some time if nothing happens
    setTimeout(() => {
      try { observer.disconnect(); } catch {}
    }, 30000);
  }

  return <div ref={containerRef} aria-label="google-signin-button" />;
}
