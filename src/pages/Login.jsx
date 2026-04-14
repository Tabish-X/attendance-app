import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const ERROR_MSGS = {
  "auth/user-not-found":    "No account found with this email.",
  "auth/wrong-password":    "Incorrect password.",
  "auth/invalid-email":     "Invalid email address.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/invalid-credential":"Incorrect email or password.",
  "auth/email-not-verified":"Email not verified. Check your inbox and click the verification link.",
};

export default function Login({ addToast }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/subjects");
    } catch (err) {
      setError(ERROR_MSGS[err.code] || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo">A</div>
          <span className="auth-brand">AttendEase</span>
        </div>

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Welcome back. Enter your details below.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">Email address</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus />
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="pw-wrap">
              <input className="input" type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          <span style={{ color: "var(--border2)" }}>|</span>
          <Link to="/signup" className="auth-link">Create account</Link>
        </div>
      </div>
    </div>
  );
}