/* ===========================
   FRONTEND ADMIN (STABLE FINAL)
   + Publications PDF support (ONLY when category = Publications)
=========================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const API_BASE = "https://api.studio-miraycle.com/";

function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(0)}`;
}

/* ===========================
   AUTH
=========================== */
async function ensureAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) window.location.href = "admin-login.html";
  } catch {
    alert("Backend not reachable.");
    window.location.href = "admin-login.html";
  }
}

/* ===========================
   ELEMENTS
=========================== */
const productsGrid = $("#productsGrid");
const projectsGrid = $("#projectsGrid");
const productsCount = $("#productsCount");
const projectsCount = $("#projectsCount");

const modal = $("#modal");
const modalClose = $("#modalClose");
const modalTitle = $("#modalTitle");
const itemForm = $("#itemForm");

const itemType = $("#itemType");
const itemId = $("#itemId");

const fName = $("#fName");
const fPrice = $("#fPrice");
const fCategory = $("#fCategory");
const fImage = $("#fImage");
const fDesc = $("#fDesc");
const fFeatured = $("#fFeatured");
const fSoldOut = $("#fSoldOut");

const priceField = $("#priceField");
const checksBox = fFeatured.closest(".checks");

const btnSaveItem = $("#btnSaveItem");
const btnSaveText = $("#btnSaveText");
const btnSaveSpinner = $("#btnSaveSpinner");

/* ===== Publications PDF fields (ONLY if you added them in admin.html) =====
   Add inside the modal form:
   - <div id="pubFields"> ... <input id="fPdf" ...> <input id="fPdfUrl" ...> ...
*/
const pubFields = $("#pubFields");
const fPdf = $("#fPdf");
const fPdfUrl = $("#fPdfUrl");

/* ===========================
   STATE
=========================== */
let PRODUCTS = [];
let PROJECTS = [];
let CURRENT_IMAGE_URL = "";

/* ===========================
   HELPERS
=========================== */
function isInterior(cat) {
  return String(cat).trim().toLowerCase() === "interior design";
}

function isPublicationSelected() {
  return itemType.value === "project" && fCategory.value === "Publications";
}

function togglePublicationFields() {
  // If you didn't add the HTML fields yet, do nothing (won't break anything)
  if (!pubFields) return;

  const isPub = isPublicationSelected();
  pubFields.style.display = isPub ? "" : "none";

  // Clear pdf inputs when not Publications
  if (!isPub) {
    if (fPdf) fPdf.value = "";
    if (fPdfUrl) fPdfUrl.value = "";
  }
}

function setSaveLoading(loading) {
  if (!btnSaveItem) return;

  btnSaveItem.disabled = loading;

  if (btnSaveText)
    btnSaveText.textContent = loading ? "Saving..." : "Save";

  if (btnSaveSpinner)
    btnSaveSpinner.style.display = loading ? "inline-block" : "none";
}

function updateCategoryDropdown(type) {
  const productCategories = [
    "Interior Design",
    "Stained Glass",
    "Iconography",
    "Painting",
    "Ceramic Art",
    "Mosaic Art",
    "Art Restoration",
    "Lessons"
  ];

  const projectCategories = [
    ...productCategories,
    "Publications"
  ];

  const list = type === "project"
    ? projectCategories
    : productCategories;

  fCategory.innerHTML = list
    .map(c => `<option value="${c}">${c}</option>`)
    .join("");
}

function updateFormVisibility(type) {
  if (type === "project") {
    priceField.style.display = "none";
    checksBox.style.display = "none";
  } else {
    checksBox.style.display = "block";
    priceField.style.display = isInterior(fCategory.value)
      ? "none"
      : "block";
  }
}

/* ===========================
   MODAL
=========================== */
function openModal(type, mode, data = {}) {
  itemType.value = type;
  itemId.value = data.id || "";

  modalTitle.textContent =
    mode === "edit"
      ? type === "product"
        ? "Edit Product"
        : "Edit Project"
      : type === "product"
      ? "Add New Product"
      : "Add New Project";

  updateCategoryDropdown(type);

  fName.value = data.name || "";
  fDesc.value = data.description || "";
  fCategory.value = data.category || "Interior Design";

  if (type === "product" && !isInterior(fCategory.value)) {
    fPrice.value = data.price ?? "";
  } else {
    fPrice.value = "";
  }

  fFeatured.checked = !!data.featured;
  fSoldOut.checked = !!data.out_of_stock;

  CURRENT_IMAGE_URL = data.image_url || "";
  fImage.value = "";

  // Publications existing link (edit mode)
  if (fPdf) fPdf.value = "";
  if (fPdfUrl) fPdfUrl.value = data.pdf_url || "";

  updateFormVisibility(type);
  togglePublicationFields();

  modal.classList.add("is-open");
}

function closeModal() {
  modal.classList.remove("is-open");
  fImage.value = "";
  CURRENT_IMAGE_URL = "";

  if (fPdf) fPdf.value = "";
  if (fPdfUrl) fPdfUrl.value = "";
  if (pubFields) pubFields.style.display = "none";

  setSaveLoading(false);
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// React to category change (so Publications fields appear instantly)
if (fCategory) {
  fCategory.addEventListener("change", () => {
    updateFormVisibility(itemType.value);
    togglePublicationFields();
  });
}

/* ===========================
   TABS
=========================== */
$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    const tab = btn.dataset.tab;
    $("#panel-products").classList.toggle("is-visible", tab === "products");
    $("#panel-projects").classList.toggle("is-visible", tab === "projects");
  });
});

/* ===========================
   ADD BUTTONS
=========================== */
$("#btnAddProduct").addEventListener("click", () => {
  openModal("product", "add");
});

$("#btnAddProject").addEventListener("click", () => {
  openModal("project", "add");
});

/* ===========================
   RENDER
=========================== */
function cardHTML(item, type) {
  const hidePrice =
    type === "product" && isInterior(item.category);

  const priceHTML =
    type === "product" && !hidePrice
      ? `<div class="card-price">${money(item.price)}</div>`
      : "";

  return `
    <article class="card">
      <div class="card-img" style="background-image:url('${item.image_url || ""}')"></div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.description || ""}</p>
        ${priceHTML}
        <div class="card-actions">
          <button class="btn btn-teal" data-action="edit" data-type="${type}" data-id="${item.id}">Edit</button>
          <button class="btn btn-rose" data-action="delete" data-type="${type}" data-id="${item.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function render() {
  productsCount.textContent = PRODUCTS.length;
  projectsCount.textContent = PROJECTS.length;

  productsGrid.innerHTML = PRODUCTS.map(p => cardHTML(p, "product")).join("");
  projectsGrid.innerHTML = PROJECTS.map(p => cardHTML(p, "project")).join("");
}

/* ===========================
   API
=========================== */
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");

  return data;
}

/* ===========================
   UPLOAD
=========================== */
async function uploadImageIfAny() {
  const file = fImage.files[0];
  if (!file) return null;

  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const data = await res.json();
  if (!res.ok) throw new Error("Upload failed");

  return data.url;
}

// Upload PDF ONLY for Publications (uses same /api/upload)
async function uploadPdfIfAny() {
  if (!fPdf) return null;

  const file = fPdf.files[0];
  if (!file) return null;

  const fd = new FormData();
  fd.append("pdf", file); // ✅ MUST be "pdf"

  const res = await fetch(`${API_BASE}/api/upload-pdf`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "PDF upload failed");

  return data.url;
}

/* ===========================
   LOAD
=========================== */
async function loadAll() {
  PRODUCTS = await api("/api/products");
  PROJECTS = await api("/api/projects");
  render();
}

/* ===========================
   SUBMIT
=========================== */
itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setSaveLoading(true);

  try {
    const type = itemType.value;
    const id = itemId.value;

    const payload = {
      name: fName.value.trim(),
      category: fCategory.value,
      description: fDesc.value.trim(),
    };
    // upload image (works for all products/projects)
const uploadedImgUrl = await uploadImageIfAny();
payload.image_url = uploadedImgUrl || CURRENT_IMAGE_URL;

// pdf only for Publications projects
if (type === "project" && payload.category === "Publications") {
  const uploadedPdfUrl = await uploadPdfIfAny(); // uploads once
  const typedPdfUrl = fPdfUrl ? fPdfUrl.value.trim() : "";
  payload.pdf_url = uploadedPdfUrl || typedPdfUrl || "";
} else {
  payload.pdf_url = "";
}

    if (type === "product") {
      payload.price = isInterior(payload.category)
        ? 0
        : Number(fPrice.value || 0);

      payload.featured = !!fFeatured.checked;
      payload.out_of_stock = !!fSoldOut.checked;
    }

    if (!id) {
      await api(type === "product" ? "/api/products" : "/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await api(
        type === "product"
          ? `/api/products/${id}`
          : `/api/projects/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    }

    closeModal();
    await loadAll();
  } catch (err) {
    alert(err.message);
  }

  setSaveLoading(false);
});

/* ===========================
   DELETE / EDIT
=========================== */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const type = btn.dataset.type;
  const id = btn.dataset.id;
  const list = type === "product" ? PRODUCTS : PROJECTS;
  const item = list.find(x => String(x.id) === String(id));

  if (btn.dataset.action === "edit" && item) {
    openModal(type, "edit", item);
  }

  if (btn.dataset.action === "delete") {
    if (!confirm("Delete this item?")) return;

    await api(
      type === "product"
        ? `/api/products/${id}`
        : `/api/projects/${id}`,
      { method: "DELETE" }
    );

    await loadAll();
  }
});
document.getElementById("btnLogout").addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.log("Logout request failed");
  }

  window.location.href = "admin-login.html";
});
/* ===========================
   INIT
=========================== */
(async function init() {
  await ensureAuth();
  await loadAll();
})();