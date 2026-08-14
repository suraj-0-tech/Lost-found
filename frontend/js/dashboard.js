let myItems = [];

document.addEventListener("DOMContentLoaded", () => {
  Auth.requireLogin();
  renderNav("dashboard");

  document.getElementById("report-form").addEventListener("submit", submitReport);

  loadMyItems();
});

async function submitReport(e) {
  e.preventDefault();
  const errorBox = document.getElementById("report-error");
  const successBox = document.getElementById("report-success");

  const formData = new FormData();
  formData.append("status", document.getElementById("r-status").value);
  formData.append("category", document.getElementById("r-category").value);
  formData.append("title", document.getElementById("r-title").value.trim());
  formData.append("description", document.getElementById("r-description").value.trim());
  formData.append("location", document.getElementById("r-location").value.trim());
  formData.append("date", document.getElementById("r-date").value);

  const fileInput = document.getElementById("r-image");
  if (fileInput.files[0]) formData.append("image", fileInput.files[0]);

  try {
    await apiRequest("/items", { method: "POST", body: formData, isFormData: true });
    showMessage(successBox, "Notice pinned! It will appear publicly once an admin approves it.", false);
    document.getElementById("report-form").reset();
    loadMyItems();
  } catch (err) {
    showMessage(errorBox, err.message, true);
  }
}

async function loadMyItems() {
  const grid = document.getElementById("my-item-grid");
  const info = document.getElementById("results-info");
  grid.innerHTML = `<div class="empty-state">Loading your reports...</div>`;

  try {
    const data = await apiRequest("/items/mine");
    myItems = data.items;
    info.textContent = `${data.count} report${data.count === 1 ? "" : "s"}`;
    renderMyItems(data.items);
    loadClaimsForMyItems(data.items);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load your reports: ${escapeHtml(err.message)}</div>`;
  }
}

function renderMyItems(items) {
  const grid = document.getElementById("my-item-grid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">You haven't posted any notices yet. Use the form above to report a lost or found item.</div>`;
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      const img = item.image
        ? `<img class="thumb" src="${imageUrl(item.image)}" alt="${escapeHtml(item.title)}" />`
        : `<div class="thumb-placeholder">No photo provided</div>`;

      const approvalBadge = `<span class="badge badge-${item.approvalStatus}">${item.approvalStatus}</span>`;

      return `
      <div class="card item-card no-pin">
        ${img}
        <span class="badge ${item.status === "Lost" ? "badge-lost" : "badge-found"}">${item.status}</span>
        ${approvalBadge}
        ${item.itemStatus === "claimed" ? '<span class="badge badge-claimed">Resolved</span>' : ""}
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">${escapeHtml(item.category)} · ${escapeHtml(item.location)} · ${formatDate(item.date)}</div>
        <p class="desc">${escapeHtml(item.description)}</p>
        ${item.rejectionReason && item.approvalStatus === "rejected" ? `<p class="desc" style="color:var(--danger);">Reason: ${escapeHtml(item.rejectionReason)}</p>` : ""}
        <div class="card-actions">
          ${item.itemStatus !== "claimed" ? `<button class="btn btn-outline btn-sm" onclick="markClaimed('${item._id}')">Mark as Claimed</button>` : ""}
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${item._id}')">Delete</button>
        </div>
      </div>`;
    })
    .join("");
}

async function markClaimed(itemId) {
  try {
    await apiRequest(`/items/${itemId}/claim`, { method: "PATCH" });
    loadMyItems();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteItem(itemId) {
  if (!confirm("Remove this notice from the board? This cannot be undone.")) return;
  try {
    await apiRequest(`/items/${itemId}`, { method: "DELETE" });
    loadMyItems();
  } catch (err) {
    alert(err.message);
  }
}

async function loadClaimsForMyItems(items) {
  const container = document.getElementById("claims-container");
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No items to show claims for yet.</div>`;
    return;
  }

  container.innerHTML = `<div class="empty-state">Loading claims...</div>`;

  try {
    const results = await Promise.all(
      items.map((item) =>
        apiRequest(`/claims/item/${item._id}`)
          .then((data) => ({ item, claims: data.claims }))
          .catch(() => ({ item, claims: [] }))
      )
    );

    const withClaims = results.filter((r) => r.claims.length > 0);

    if (!withClaims.length) {
      container.innerHTML = `<div class="empty-state">No one has claimed any of your items yet.</div>`;
      return;
    }

    container.innerHTML = withClaims
      .map(
        ({ item, claims }) => `
      <div class="card no-pin" style="margin-bottom:1.2rem;">
        <h3 style="font-family:var(--font-display); font-size:1rem;">${escapeHtml(item.title)}</h3>
        <table class="data-table" style="margin-top:0.6rem;">
          <thead>
            <tr><th>Claimant</th><th>Message</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${claims
              .map(
                (c) => `
              <tr>
                <td>${escapeHtml(c.claimedBy.name)}<br/><span style="color:var(--ink-soft); font-size:0.75rem;">${escapeHtml(c.claimedBy.email)}${c.claimedBy.phone ? " · " + escapeHtml(c.claimedBy.phone) : ""}</span></td>
                <td>${escapeHtml(c.message || "—")}</td>
                <td><span class="badge badge-${c.claimStatus === "pending" ? "pending" : c.claimStatus === "approved" ? "approved" : "rejected"}">${c.claimStatus}</span></td>
                <td>
                  ${
                    c.claimStatus === "pending"
                      ? `<button class="btn btn-primary btn-sm" onclick="respondClaim('${c._id}','approved')">Approve</button>
                         <button class="btn btn-danger btn-sm" onclick="respondClaim('${c._id}','rejected')">Reject</button>`
                      : "—"
                  }
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Couldn't load claims: ${escapeHtml(err.message)}</div>`;
  }
}

async function respondClaim(claimId, claimStatus) {
  try {
    await apiRequest(`/claims/${claimId}`, { method: "PATCH", body: { claimStatus } });
    loadMyItems();
  } catch (err) {
    alert(err.message);
  }
}
