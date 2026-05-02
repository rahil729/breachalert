const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("breachalert_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || response.statusText);
  }
  return response.json().catch(() => ({}));
}

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const response = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || response.statusText);
  }
  return response.json();
}

export async function register(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProfile() {
  return request("/users/me");
}

export async function upgradePlan(plan) {
  return request("/users/upgrade", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function fetchEmails() {
  return request("/emails");
}

export async function addEmail(email) {
  return request("/emails", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmail(email, token) {
  return request("/emails/verify", {
    method: "POST",
    body: JSON.stringify({ email, token }),
  });
}

export async function fetchBreaches(id) {
  return request(`/emails/${id}/breaches`);
}

export async function manualScan(emailId) {
  return request(`/scan/manual/${emailId}`, {
    method: "POST",
  });
}

