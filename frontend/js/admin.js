document.addEventListener("DOMContentLoaded", () => {
  Auth.requireAdmin();
  renderNav("admin");

  document.querySelectorAll(".tab-strip button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  loadStats();
  loadPending();
});

function switchTab(tab) {
  document.querySelectorAll(".tab-strip button").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.tab-strip button[data-tab="${tab}"]`).classList.add("active");

  ["pending", "all-items", "users"].forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle("hidden", t !== tab);
  });

  if (tab === "all-items") loadAllItems();
  if (tab === "users") loadUsers();
}

async function loadStats() {
  const el = document.getElementById("stat-grid");
  try {
    const s = await apiRequest("/admin/stats");
    el.innerHTML = `
      ${statCard(s.totalUsers, "Users")}
      ${statCard(s.totalItems, "Total Reports")}
      ${statCard(s.lostCount, "Lost")}
      ${statCard(s.foundCount, "Found")}
      ${statCard(s.claimedCount, "Resolved")}
      ${statCard(s.pendingApproval, "Pending Review")}
      ${statCard(s.totalClaims, "Claims Filed")}
    `;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Couldn't load stats: ${escapeHtml(err.message)}</div>`;
  }
}

function statCard(num, label) {
  return `<div class="stat-card"><div class="num">${num}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

async function loadPending() {
  const grid = document.getElementById("pending-grid");
  grid.innerHTML = `<div class="empty-state">Loading pending reports...</div>`;
  try {
    const data = await apiRequest("/admin/items?approvalStatus=pending");
    if (!data.items.length) {
      grid.innerHTML = `<div class="empty-state">No reports awaiting approval. Nice and tidy!</div>`;
      return;
    }
    grid.innerHTML = data.items
      .map((item) => {
        const img = item.image
          ? `<img class="thumb" src="${imageUrl(item.image)}" alt="${escapeHtml(item.title)}" />`
          : `<div class="thumb-placeholder">No photo provided</div>`;
        return `
        <div class="card item-card no-pin">
          ${img}
          <span class="badge ${item.status === "Lost" ? "badge-lost" : "badge-found"}">${item.status}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="meta">${escapeHtml(item.category)} · ${escapeHtml(item.location)} · ${formatDate(item.date)}</div>
          <p class="desc">${escapeHtml(item.description)}</p>
          <p class="meta">Reported by ${escapeHtml(item.user.name)} (${escapeHtml(item.user.email)})</p>
          <div class="card-actions">
            <button class="btn btn-primary btn-sm" onclick="approveItem('${item._id}')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectItem('${item._id}')">Reject</button>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load pending reports: ${escapeHtml(err.message)}</div>`;
  }
}

async function approveItem(id) {
  try {
    await apiRequest(`/admin/items/${id}/approve`, { method: "PATCH" });
    loadPending();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function rejectItem(id) {
  const reason = prompt("Reason for rejection (shown to the reporter):", "Duplicate or unclear listing");
  if (reason === null) return;
  try {
    await apiRequest(`/admin/items/${id}/reject`, { method: "PATCH", body: { reason } });
    loadPending();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function loadAllItems() {
  const tbody = document.querySelector("#all-items-table tbody");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const data = await apiRequest("/admin/items");
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="6">No listings yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.items
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="badge ${item.status === "Lost" ? "badge-lost" : "badge-found"}">${item.status}</span></td>
        <td>${item.itemStatus === "claimed" ? '<span class="badge badge-claimed">Resolved</span>' : "Open"}</td>
        <td>${escapeHtml(item.user.name)}</td>
        <td><span class="badge badge-${item.approvalStatus}">${item.approvalStatus}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="removeItem('${item._id}')">Remove</button></td>
      </tr>`
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Couldn't load listings: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function removeItem(id) {
  if (!confirm("Permanently remove this listing (e.g. fake or duplicate)?")) return;
  try {
    await apiRequest(`/admin/items/${id}`, { method: "DELETE" });
    loadAllItems();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function loadUsers() {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  try {
    const data = await apiRequest("/admin/users");
    tbody.innerHTML = data.users
      .map(
        (u) => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.role)}</td>
        <td>${u.isBlocked ? '<span class="badge badge-rejected">Blocked</span>' : '<span class="badge badge-approved">Active</span>'}</td>
        <td>
          ${
            u.role !== "admin"
              ? `<button class="btn btn-outline btn-sm" onclick="toggleBlock('${u._id}')">${u.isBlocked ? "Unblock" : "Block"}</button>
                 <button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}')">Delete</button>`
              : "—"
          }
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Couldn't load users: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function toggleBlock(id) {
  try {
    await apiRequest(`/admin/users/${id}/block`, { method: "PATCH" });
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteUser(id) {
  if (!confirm("Delete this user and all of their reports? This cannot be undone.")) return;
  try {
    await apiRequest(`/admin/users/${id}`, { method: "DELETE" });
    loadUsers();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}
