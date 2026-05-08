import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= 8 && password === confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => onDone(), 1500);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-xl)", background: "var(--color-bg-subtle, #f8f7f4)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "var(--space-lg) 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-md)" }}>✅</div>
            <h2 style={{ marginBottom: "var(--space-sm)" }}>Password updated</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>Taking you to your garden…</p>
          </div>
        ) : (
          <>
            <h2 style={{ marginBottom: "var(--space-xs)" }}>Set new password</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", marginBottom: "var(--space-xl)" }}>
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSubmit}>
              {/* New password */}
              <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>
                New password
              </label>
              <div style={{ position: "relative", marginBottom: "var(--space-xs)" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--color-text-muted)", minHeight: "auto", padding: 4, lineHeight: 1 }}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {tooShort && (
                <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: "0 0 var(--space-md)" }}>
                  Password must be at least 8 characters
                </p>
              )}
              {!tooShort && <div style={{ marginBottom: "var(--space-md)" }} />}

              {/* Confirm password */}
              <label style={{ display: "block", fontSize: "var(--text-small)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>
                Confirm password
              </label>
              <div style={{ position: "relative", marginBottom: "var(--space-xs)" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Enter password again"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--color-text-muted)", minHeight: "auto", padding: 4, lineHeight: 1 }}
                  tabIndex={-1}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {mismatch && (
                <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", margin: "0 0 var(--space-md)" }}>
                  Passwords don't match
                </p>
              )}
              {!mismatch && <div style={{ marginBottom: "var(--space-lg)" }} />}

              {error && (
                <p style={{ color: "var(--color-error)", fontSize: "var(--text-small)", marginBottom: "var(--space-md)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!valid || loading}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? "Updating…" : "Set password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
