import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../api";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await verifyEmail(email, token);
      if (result.success) {
        setMessage(result.message);
        setTimeout(() => navigate("/watchlist"), 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div className="form-card" style={{ maxWidth: "480px" }}>
        <h2>Verify Email</h2>
        <p className="desc">
          Enter the verification token sent to your email to activate monitoring.
        </p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Verification token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter the token from your email"
              required
            />
          </div>

          <div className="form-group">
            <button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </div>
        </form>

        <div className="form-footer">
          <Link to="/watchlist">Back to Watchlist</Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
