// Central place to configure the backend URL.
// Change this if your API runs somewhere other than localhost:5000.
const API_BASE = "http://localhost:5000/api";

const Auth = {
  getToken() {
    return localStorage.getItem("lf_token");
  },
  getUser() {
    const raw = localStorage.getItem("lf_user");
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem("lf_token", token);
    localStorage.setItem("lf_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const user = this.getUser();
    return !!user && user.role === "admin";
  },
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "index.html";
    }
  },
  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) {
      window.location.href = "index.html";
    }
  },
  logout() {
    this.clearSession();
    window.location.href = "index.html";
  },
};

// Generic fetch wrapper. Set isFormData=true when sending a FormData body (image upload).
async function apiRequest(path, { method = "GET", body = null, isFormData = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    /* no JSON body */
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

function showMessage(el, text, isError = true) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth; // restart animation/visibility
  el.classList.add("show");
  el.className = (isError ? "error-msg" : "success-msg") + " show";
}

function imageUrl(path) {
  if (!path) return null;
  return `http://localhost:5000${path}`;
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Renders the shared header/nav on every page. Call after DOM is ready.
function renderNav(activePage) {
  const nav = document.getElementById("board-nav");
  if (!nav) return;

  const loggedIn = Auth.isLoggedIn();
  const isAdmin = Auth.isAdmin();
  const links = [];

  if (loggedIn) {
    links.push(`<a href="search.html" class="${activePage === "search" ? "active" : ""}">Browse Items</a>`);
    links.push(`<a href="dashboard.html" class="${activePage === "dashboard" ? "active" : ""}">My Reports</a>`);
    if (isAdmin) {
      links.push(`<a href="admin.html" class="${activePage === "admin" ? "active" : ""}">Admin</a>`);
    }
    links.push(`<button id="logout-btn">Log out</button>`);
  } else {
    links.push(`<a href="index.html">Login / Register</a>`);
  }

  nav.innerHTML = links.join("");

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => Auth.logout());
}
