import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>

      {/* Background photo */}
      <img
        src="/house.jpeg"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          pointerEvents: "none",
        }}
      />

      {/* Dark overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "var(--space-xl) var(--space-2xl)",
        zIndex: 10,
      }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.375rem",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.5px",
        }}>
          Le Grand Samoï
        </span>
        <button
          onClick={() => setShowLogin(true)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.6)",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-small)",
            fontWeight: 600,
            padding: "var(--space-xs) var(--space-lg)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            minHeight: "auto",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        >
          Log in
        </button>
      </div>

      {/* Centre headline */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 10, textAlign: "center",
        padding: "var(--space-xl)",
      }}>
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(2.5rem, 6vw, 5rem)",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-1px",
          marginBottom: "var(--space-md)",
          textShadow: "0 2px 20px rgba(0,0,0,0.4)",
        }}>
          Coming soon
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: "var(--text-body)",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          letterSpacing: "0.02em",
        }}>
          Condé-en-Normandy, France
        </p>
      </div>

      {/* Login modal */}
      {showLogin && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "var(--space-xl)",
            backdropFilter: "blur(4px)",
          }}
          onClick={e => e.target === e.currentTarget && setShowLogin(false)}
        >
          <div className="card" style={{ width: "100%", maxWidth: 400 }}>
            {!sent ? (
              <>
                <h2 style={{ marginBottom: "var(--space-xs)" }}>Sign in</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", marginBottom: "var(--space-xl)" }}>
                  Enter your email and we'll send you a magic link.
                </p>
                <form onSubmit={handleSubmit}>
                  <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    required
                    style={{ marginBottom: "var(--space-lg)" }}
                  />
                  {error && (
                    <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", marginBottom: "var(--space-md)" }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!email.trim() || loading}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {loading ? "Sending…" : "Send magic link"}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "var(--space-lg) 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-md)" }}>✉️</div>
                <h2 style={{ marginBottom: "var(--space-sm)" }}>Check your email</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", lineHeight: 1.6 }}>
                  We sent a sign-in link to<br />
                  <strong style={{ color: "var(--color-text)" }}>{email}</strong>
                </p>
                <button
                  className="btn-ghost"
                  onClick={() => { setSent(false); setEmail(""); }}
                  style={{ marginTop: "var(--space-xl)", fontSize: "var(--text-small)" }}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
