import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { upgradePlan } from "../api";

function Upgrade() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleUpgrade = async (plan) => {
    setLoading(true);
    try {
      await upgradePlan(plan);
      setMessage(`Upgraded to ${plan} plan! Reload dashboard to see changes.`);
      setTimeout(() => navigate("/watchlist"), 2000);
    } catch (err) {
      setMessage("Upgrade failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div className="form-card" style={{ maxWidth: "500px" }}>
        <h2>Choose Your Plan</h2>
        <p className="desc">Unlock more email monitoring with Family plan</p>

        {message && <div className={`alert ${message.includes("Upgraded") ? "alert-success" : "alert-error"}`}>{message}</div>}

        <div className="plan-grid" style={{ display: "grid", gap: "20px", marginTop: "24px" }}>
          <div className="plan-card">
            <h3>Free</h3>
            <div className="price">$0<span>/mo</span></div>
            <ul>
              <li>1 Email monitored</li>
              <li>Daily scans</li>
              <li>Email alerts</li>
            </ul>
            <button className="btn btn-secondary" disabled>Current Plan</button>
          </div>

          <div className="plan-card recommended">
            <div className="recommended-badge">Most Popular</div>
            <h3>Family</h3>
            <div className="price">$9.99<span>/mo</span></div>
            <ul>
              <li><strong>5 Emails monitored</strong></li>
              <li>Daily scans</li>
              <li>Email alerts</li>
              <li>Priority support</li>
            </ul>
            <button 
              className="btn btn-primary" 
              onClick={() => handleUpgrade("family")}
              disabled={loading}
            >
              {loading ? "Upgrading..." : "Upgrade to Family ($9.99/mo)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upgrade;
