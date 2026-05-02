import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchEmails, addEmail } from "../api";

function EmailWatchlist() {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadEmails = () => {
    fetchEmails()
      .then(setEmails)
      .catch((err) => {
        if (err.message.includes("401")) {
          localStorage.removeItem("breachalert_token");
          navigate("/login");
        }
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("breachalert_token");
    if (!token) {
      navigate("/login");
      return;
    }
    loadEmails();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage(null);
    setLoading(true);

    try {
      await addEmail(newEmail);
      setMessage("Watching email. Check your inbox for a verification link.");
      setNewEmail("");
      loadEmails();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="content-header">
        <h1>Email Watchlist</h1>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
          <input
            type="email"
            placeholder="Enter email address to monitor"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Adding..." : "Add Email"}
          </button>
        </form>
        {message && <div className="alert alert-success" style={{ marginTop: "16px" }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginTop: "16px" }}>{error}</div>}
      </div>

      {emails.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>No emails monitored yet</h3>
            <p>Add your first email address above to start monitoring for breaches.</p>
          </div>
        </div>
      ) : (
        <div className="list-card">
          {emails.map((item) => (
            <div key={item.id} className="list-item">
              <div className="list-item-info">
                <h3>{item.email}</h3>
                <p>Added {new Date(item.subscribed_at).toLocaleDateString()}</p>
                <span className={`status ${item.is_verified ? "verified" : "pending"}`}>
                  {item.is_verified ? "✓ Verified" : "○ Pending verification"}
                </span>
              </div>
              <div className="list-item-actions">
                <Link to={`/breaches/${item.id}`} className="btn btn-secondary btn-sm">
                  View History
                </Link>
                {!item.is_verified && (
                  <Link to="/verify" className="btn btn-secondary btn-sm">
                    Verify
                  </Link>
                )}
                {item.is_verified && (
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await manualScan(item.id);
                        alert("Scan completed! Check breach history.");
                        loadEmails();
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }} 
                    className="btn btn-primary btn-sm" 
                    disabled={loading}
                  >
                    Scan Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmailWatchlist;
