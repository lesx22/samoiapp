import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "var(--space-xl)",
    }}>
      <div style={{ marginBottom: "var(--space-2xl)", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-serif)",
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--color-text)",
          letterSpacing: "-0.5px",
          marginBottom: "var(--space-xs)",
        }}>
          Jardin<span style={{ color: "var(--color-green)" }}>·</span>Planner
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
          Grand Samoï · Condé-en-Normandy
        </p>
      </div>

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
  );
}
