import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword({ addToast }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check if email is actually registered before sending reset email
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (!methods || methods.length === 0) {
        setError("No account found with this email address.");
        setLoading(false);
        return;
      }
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      const msgs = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email":  "Invalid email address.",
      };
      setError(msgs[err.code] || "Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo">A</div>
            <span className="auth-brand">AttendEase</span>
          </div>
          <h1 className="auth-title">Email sent</h1>
          <p className="auth-sub" style={{ marginBottom: 20 }}>
            A password reset link has been sent to <strong>{email}</strong>. Check your inbox.
          </p>
          <div className="auth-success" style={{ marginBottom: 20 }}>
            Reset email sent successfully. Check your spam folder if you don't see it.
          </div>
          <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ textAlign: "center" }}>
            Back to Sign In
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

        <h1 className="auth-title">Reset password</h1>
        <p className="auth-sub">Enter your email and we'll send a reset link.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="input-label">Email address</label>
            <input className="input" type="email" placeholder=""
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus />
          </div>

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Checking..." : "Send Reset Email"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
