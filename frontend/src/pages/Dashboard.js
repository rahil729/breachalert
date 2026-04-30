import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState([]);
  const [monitoredEmails, setMonitoredEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchMonitoredEmails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  const fetchMonitoredEmails = async () => {
    try {
      const res = await API.get("/monitored-emails", {
        headers: { Authorization: token },
      });
      setMonitoredEmails(res.data.monitoredEmails || []);
    } catch (err) {
      console.error("Failed to load monitored emails", err);
    }
  };

  const addEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await API.post(
        "/add-email",
        { newEmail: email },
        { headers: { Authorization: token } }
      );
      setEmail("");
      await fetchMonitoredEmails();
      alert("Verification email sent. Check your inbox.");
    } catch (err) {
      console.error("Add email failed", err);
      alert("Failed to add email.");
    } finally {
      setLoading(false);
    }
  };

  const scan = async () => {
    setLoading(true);
    try {
      const res = await API.get("/scan", {
        headers: { Authorization: token },
      });
      setResults(res.data.results || []);
    } catch (err) {
      console.error("Scan failed", err);
      alert("Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-green-500">BreachAlert</span>
            <h1 className="text-2xl font-bold text-white mt-1">Protect your email identity.</h1>
            <p className="text-gray-400 mt-1 text-sm">Monitor multiple email addresses, verify confirmed contacts, and scan breach data instantly.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </header>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex gap-3">
              <input
                type="email"
                placeholder="Enter email address to monitor..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
              <button
                onClick={addEmail}
                disabled={loading}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {loading ? "Adding..." : "+ Add Email"}
              </button>
            </div>
            <button
              onClick={scan}
              disabled={loading}
              className="px-6 py-3 border border-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Scanning..." : "🔍 Scan Now"}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monitored Emails Card */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">
                📧 Monitored Emails <span className="text-gray-400 text-sm font-normal">({monitoredEmails.length})</span>
              </h3>
            </div>
            {monitoredEmails.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm">No emails monitored yet.</p>
                <p className="text-gray-600 text-sm mt-1">Add an email above to start monitoring.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {monitoredEmails.map((item) => (
                  <div key={item.email} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{item.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Added: {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${
                      item.verified 
                        ? "bg-green-500/15 text-green-400" 
                        : "bg-yellow-500/15 text-yellow-400"
                    }`}>
                      {item.verified ? "✓ Verified" : "⏳ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scan Results Card */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">
                🔍 Scan Results <span className="text-gray-400 text-sm font-normal">({results.length})</span>
              </h3>
            </div>
            {results.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm">No scan results yet.</p>
                <p className="text-gray-600 text-sm mt-1">Click "Scan Now" to check all monitored emails.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{r.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Status: {r.verified ? "Verified" : "Unverified"} | Last scan: {r.lastScanned ? new Date(r.lastScanned).toLocaleString() : 'Just now'}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        r.breaches?.length 
                          ? "bg-red-500/15 text-red-400" 
                          : "bg-green-500/15 text-green-400"
                      }`}>
                        {r.breaches?.length ? `⚠ ${r.breaches.length} breach${r.breaches.length > 1 ? "es" : ""}` : "✓ Clean"}
                      </span>
                    </div>
                    {r.breaches?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-red-400">Found in {r.breaches.length} data breach{r.breaches.length > 1 ? "es" : ""}:</p>
                        <pre className="mt-2 p-2 bg-gray-950 rounded text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(r.breaches, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
