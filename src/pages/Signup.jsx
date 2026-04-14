import { useState } from "react";
import { Link } from "react-router-dom";
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
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password":        "Password must be at least 6 characters.",
  "auth/invalid-email":        "Invalid email address.",
  "auth/too-many-requests":    "Too many attempts. Try again later.",
};

export default function Signup({ addToast }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please enter your full name.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await signup(form.email, form.password, form.name.trim());
      setDone(true);
    } catch (err) {
      setError(ERROR_MSGS[err.code] || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo">A</div>
            <span className="auth-brand">AttendEase</span>
          </div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub" style={{ marginBottom: 20 }}>
            A verification link has been sent to <strong>{form.email}</strong>.
            Click the link in the email to activate your account, then sign in.
          </p>
          <div className="auth-success" style={{ marginBottom: 20 }}>
            Verification email sent. Please check your inbox (and spam folder).
          </div>
          <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ textAlign: "center" }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo">A</div>
          <span className="auth-brand">AttendEase</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Fill in your details to get started.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">Name</label>
            <input className="input" type="text" placeholder=""
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required autoFocus />
          </div>

          <div>
            <label className="input-label">Email address</label>
            <input className="input" type="email" placeholder=""
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required />
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="pw-wrap">
              <input className="input" type={showPw ? "text" : "password"}
                placeholder=""
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Confirm Password</label>
            <div className="pw-wrap">
              <input className="input" type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required />
              <button type="button" className="pw-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
