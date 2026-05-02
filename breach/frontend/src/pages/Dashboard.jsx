import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchEmails } from "../api";

function Dashboard() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, safe: 0, breached: 0 });
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem("breachalert_token");
    if (token) {
      fetchEmails()
        .then((emails) => {
          setStats({
            total: emails.length,
            safe: emails.filter(e => !e.is_verified || e.is_verified).length,
            breached: 0
          });
        })
        .catch(() => {});
    }
  }, []);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setResult(null);
    
    // Simulate check - in production this would call HIBP API
    setTimeout(() => {
      setResult({
        email,
        pwned: Math.random() > 0.5,
        breaches: Math.floor(Math.random() * 5)
      });
      setLoading(false);
    }, 1000);
  };
  
  const token = localStorage.getItem("breachalert_token");
  
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1>
          Stay ahead of <span className="highlight">data breaches</span>
        </h1>
        <p className="subtitle">
          Check if your email has been compromised in a data breach. 
          Get instant alerts and actionable advice to protect your accounts.
        </p>
        
        <div className="search-box">
          <form onSubmit={handleSearch}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Check Email"}
            </button>
          </form>
        </div>
        
        {result && (
          <div className="alert alert-success" style={{ maxWidth: '560px', margin: '24px auto 0' }}>
            {result.pwned ? (
              <>
                <strong>Oh no!</strong> Your email <strong>{result.email}</strong> was found in 
                <strong> {result.breaches} breach{result.breaches !== 1 ? 'es' : ''}</strong>. 
                Click "Get Started" to monitor this email and receive alerts.
              </>
            ) : (
              <>
                <strong>Good news!</strong> Your email <strong>{result.email}</strong> was not found in any known data breaches.
              </>
            )}
          </div>
        )}
      </section>
      
      {/* Stats */}
      {token && (
        <section className="content" style={{ padding: '40px 0' }}>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Monitored Emails</div>
              <div className="value">{stats.total}</div>
            </div>
            <div className="stat-card success">
              <div className="label">Safe</div>
              <div className="value">{stats.safe}</div>
            </div>
            <div className="stat-card danger">
              <div className="label">Breaches Found</div>
              <div className="value">{stats.breached}</div>
            </div>
            <div className="stat-card">
              <div className="label">Last Scan</div>
              <div className="value" style={{ fontSize: '1.25rem' }}>Just now</div>
            </div>
          </div>
        </section>
      )}
      
      {/* Features */}
      <section className="features">
        <h2>How BreachAlert Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3>Check Email</h3>
            <p>Enter your email to instantly check if it's been compromised in any known data breaches.</p>
          </div>
          <div className="feature-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3>Get Alerts</h3>
            <p>Subscribe to monitor your email and receive instant notifications when new breaches occur.</p>
          </div>
          <div className="feature-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3>Take Action</h3>
            <p>Get actionable advice on what steps to take to secure your accounts.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
