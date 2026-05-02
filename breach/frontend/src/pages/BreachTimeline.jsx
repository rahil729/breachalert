import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchBreaches, fetchEmails } from "../api";

function BreachTimeline() {
  const { id } = useParams();
  const [breaches, setBreaches] = useState([]);
  const [email, setEmail] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get the email details
        const emails = await fetchEmails();
        const found = emails.find(e => e.id === parseInt(id));
        setEmail(found);
        
        // Get breaches for this email
        const data = await fetchBreaches(id);
        setBreaches(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) loadData();
  }, [id]);

  const getSeverity = (dataClasses) => {
    const severe = ["passwords", "credit cards", "social security numbers", "bank account numbers"];
    const lower = dataClasses.toLowerCase();
    if (severe.some(s => lower.includes(s))) return "high";
    if (lower.includes("phone") || lower.includes("email")) return "medium";
    return "low";
  };

  if (loading) {
    return (
      <div>
        <div className="content-header">
          <h1>Breach Timeline</h1>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="content-header">
        <Link to="/watchlist" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Back to Watchlist
        </Link>
        <h1 style={{ marginTop: "8px" }}>Breach Timeline</h1>
        {email && (
          <p style={{ color: "var(--text-secondary)" }}>{email.email}</p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {breaches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3>No breaches found</h3>
            <p>This email has not been found in any known data breaches.</p>
          </div>
        </div>
      ) : (
        <div className="list-card">
          {breaches.map((item) => (
            <div key={item.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "12px" }}>
                <div className="list-item-info">
                  <h3>{item.breach_name}</h3>
                  <p>{new Date(item.breached_on).toLocaleDateString()}</p>
                </div>
                <span className={`status ${getSeverity(item.data_classes) === "high" ? "pending" : "verified"}`} style={{ 
                  background: getSeverity(item.data_classes) === "high" ? "#fee2e2" : "#d1fae5",
                  color: getSeverity(item.data_classes) === "high" ? "#991b1b" : "#065f46"
                }}>
                  {getSeverity(item.data_classes) === "high" ? "⚠ Critical" : "ℹ Info"}
                </span>
              </div>
              <div style={{ width: "100%" }}>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  <strong>Exposed data:</strong> {item.data_classes}
                </p>
                {item.compromised_passwords && (
                  <div className="alert alert-warning" style={{ marginTop: "8px", marginBottom: 0 }}>
                    <strong>Password compromised!</strong> Change your password immediately and consider using a password manager.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BreachTimeline;
