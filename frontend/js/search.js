let currentItems = [];
let claimTargetItem = null;

document.addEventListener("DOMContentLoaded", () => {
  Auth.requireLogin();
  renderNav("search");

  document.getElementById("filter-form").addEventListener("submit", (e) => {
    e.preventDefault();
    loadItems();
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    document.getElementById("filter-form").reset();
    loadItems();
  });

  document.getElementById("claim-cancel").addEventListener("click", closeClaimModal);
  document.getElementById("claim-form").addEventListener("submit", submitClaim);

  loadItems();
});

async function loadItems() {
  const grid = document.getElementById("item-grid");
  const info = document.getElementById("results-info");
  grid.innerHTML = `<div class="empty-state">Loading the board...</div>`;

  const params = new URLSearchParams();
  const keyword = document.getElementById("f-keyword").value.trim();
  const status = document.getElementById("f-status").value;
  const category = document.getElementById("f-category").value;
  const location = document.getElementById("f-location").value.trim();
  const date = document.getElementById("f-date").value;

  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (date) params.set("date", date);

  try {
    const data = await apiRequest(`/items?${params.toString()}`);
    currentItems = data.items;
    info.textContent = `${data.count} item${data.count === 1 ? "" : "s"} currently pinned`;
    renderGrid(data.items);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load items: ${escapeHtml(err.message)}</div>`;
  }
}

function renderGrid(items) {
  const grid = document.getElementById("item-grid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No matching items on the board yet. Try clearing filters, or check back later.</div>`;
    return;
  }

  const me = Auth.getUser();

  grid.innerHTML = items
    .map((item) => {
      const isMine = item.user && item.user._id === me.id;
      const img = item.image
        ? `<img class="thumb" src="${imageUrl(item.image)}" alt="${escapeHtml(item.title)}" />`
        : `<div class="thumb-placeholder">No photo provided</div>`;

      return `
      <div class="card item-card no-pin">
        ${img}
        <span class="badge ${item.status === "Lost" ? "badge-lost" : "badge-found"}">${item.status}</span>
        ${item.itemStatus === "claimed" ? '<span class="badge badge-claimed">Resolved</span>' : ""}
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">${escapeHtml(item.category)} · ${escapeHtml(item.location)} · ${formatDate(item.date)}</div>
        <p class="desc">${escapeHtml(item.description)}</p>
        <div class="card-actions">
          ${
            isMine
              ? `<span class="badge badge-pending">This is your report</span>`
              : item.itemStatus === "claimed"
              ? ""
              : `<button class="btn btn-primary btn-sm" onclick="openClaimModal('${item._id}')">Claim / Contact</button>`
          }
        </div>
      </div>`;
    })
    .join("");
}

function openClaimModal(itemId) {
  claimTargetItem = currentItems.find((i) => i._id === itemId);
  if (!claimTargetItem) return;

  document.getElementById("claim-item-title").textContent =
    `${claimTargetItem.status}: ${claimTargetItem.title}`;
  document.getElementById("claim-owner-contact").textContent =
    `Reported by ${claimTargetItem.user.name}`;
  document.getElementById("claim-message").value = "";
  document.getElementById("claim-error").classList.remove("show");
  document.getElementById("claim-success").classList.remove("show");
  document.getElementById("claim-modal").classList.remove("hidden");
}

function closeClaimModal() {
  document.getElementById("claim-modal").classList.add("hidden");
  claimTargetItem = null;
}

async function submitClaim(e) {
  e.preventDefault();
  if (!claimTargetItem) return;

  const message = document.getElementById("claim-message").value.trim();
  const errorBox = document.getElementById("claim-error");
  const successBox = document.getElementById("claim-success");

  try {
    await apiRequest("/claims", {
      method: "POST",
      body: { itemId: claimTargetItem._id, message },
    });
    showMessage(successBox, "Claim sent! The reporter will review your message and contact you.", false);
    setTimeout(closeClaimModal, 1600);
  } catch (err) {
    showMessage(errorBox, err.message, true);
  }
}
