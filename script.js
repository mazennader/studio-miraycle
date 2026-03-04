/* ===========================
   PAGE LOADER + TRANSITIONS (SAFE + FAST)
   - NEVER keeps body hidden forever
   - Hides loader on DOM ready (not waiting for images)
=========================== */
(function () {
  const loader = document.getElementById("pageLoader");

  function showPage() {
    document.body.classList.add("is-ready");
    if (loader) loader.classList.add("hide");
  }

  function showLoader() {
    if (loader) loader.classList.remove("hide");
    document.body.classList.remove("is-ready");
  }

  document.addEventListener("DOMContentLoaded", () => showPage());
  setTimeout(showPage, 1200);
  window.addEventListener("error", showPage);
  window.addEventListener("unhandledrejection", showPage);

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    if (
      a.target === "_blank" ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    )
      return;

    const current = (window.location.pathname.split("/").pop() || "").toLowerCase();
    if (href.toLowerCase() === current) return;

    showLoader();
  });
})();

/* ===========================
   GLOBAL PAGE LOADER (SAFE)
   - Works on every page that has #pageLoader
   - Never gets stuck (fallback)
=========================== */
(function () {
  const loader = document.getElementById("pageLoader");

  function hideLoader() {
    if (!loader) return;
    loader.classList.add("is-hidden");
    document.documentElement.classList.add("page-ready");
  }

  function showLoader() {
    if (!loader) return;
    loader.classList.remove("is-hidden");
    document.documentElement.classList.remove("page-ready");
  }

  // Ensure it starts visible (in case cached navigation)
  showLoader();

  // Hide when DOM is ready (fast)
  document.addEventListener("DOMContentLoaded", hideLoader);

  // Extra safety: hide even if something fails
  window.addEventListener("load", hideLoader);
  window.addEventListener("error", hideLoader);
  window.addEventListener("unhandledrejection", hideLoader);
  setTimeout(hideLoader, 1500);

  // Optional: show loader on internal link navigation
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href") || "";
    const target = a.getAttribute("target");

    // ignore: new tab, downloads, hashes, external links
    if (target === "_blank") return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (href.startsWith("http") && !href.includes(location.host)) return;

    // if it's a normal page navigation, show loader
    showLoader();
  });
})();

/* ===========================
   CONFIG / API
=========================== */
const API_BASE = "https://artshop-backend.onrender.com";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ===========================
   ✅ CURRENCY SWITCHER (SAFE)
   - Base is USD
   - Converts displayed .price elements
   - Stores original USD in data-usd (one time)
   - ✅ Order: USD, GBP, EUR, AED, LBP
   - ✅ Always defaults to USD on reload (no localStorage saving)
=========================== */
const CURRENCY = {
  list: ["USD", "GBP", "EUR", "AED", "LBP"],

  // 1 USD = rate
  rates: {
    USD: 1,
    GBP: 0.79,
    EUR: 0.92,
    AED: 3.6725,
    LBP: 90000,
  },

  symbols: {
    USD: "$",
    GBP: "£",
    EUR: "€",
    AED: "AED ",
    LBP: "LBP ",
  },

  decimals: {
    USD: 2,
    GBP: 2,
    EUR: 2,
    AED: 2,
    LBP: 0,
  },

  key: "site_currency",
};

/* ✅ Always USD on reload */
function getCurrency() {
  return "USD";
}

/* ✅ Keep function to not break code, but do NOT persist */
function setCurrency(c) {
  // no-op (intentionally not saving)
}

function formatNumber(n, decimals) {
  const fixed = Number(n).toFixed(decimals);
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Convert ALL .price elements on the page
 * - If element has data-usd, use it
 * - Else try to parse its current text and save as data-usd once
 */
function applyCurrencyToDOM(root = document) {
  const select = document.getElementById("currencySelect");
  const currency = (select && CURRENCY.list.includes(select.value)) ? select.value : "USD";

  const rate = CURRENCY.rates[currency] || 1;
  const symbol = CURRENCY.symbols[currency] || "";
  const decimals = CURRENCY.decimals[currency] ?? 2;

  const els = root.querySelectorAll(".price");

  els.forEach((el) => {
    if (el.classList.contains("no-currency")) return;

    if (!el.dataset.usd) {
      const raw = (el.textContent || "").replace(/,/g, "").trim();
      const numMatch = raw.match(/-?\d+(\.\d+)?/);
      const parsed = numMatch ? Number(numMatch[0]) : NaN;

      if (!Number.isFinite(parsed)) return;
      el.dataset.usd = String(parsed);
    }

    const usd = Number(el.dataset.usd || 0);
    const converted = usd * rate;

    el.textContent = `${symbol}${formatNumber(converted, decimals)}`;
    el.dataset.currency = currency;
  });

  if (select && select.value !== currency) select.value = currency;
}

/* ✅ Dropdown handler (safe) */
function ensureCurrencyDropdown() {
  const select = document.getElementById("currencySelect");
  if (!select) return;

  select.innerHTML = CURRENCY.list.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = "USD";

  select.addEventListener("change", () => {
    applyCurrencyToDOM(document);
  });
}

/* ===========================
   ✅ Updated money() helper
   - Keeps USD base output
=========================== */
function money(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/* ===========================
   MOBILE MENU (DRAWER) - FIXED (NO DUPES / NO CRASH)
=========================== */
function setupMobileMenu() {
  const toggle = $("#navToggle");
  const drawer = $("#mobileNav");
  const linksWrap = $("#mobileNavLinks");

  if (!toggle || !drawer) return;

  function openMenu() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  // ✅ Build the mobile links ONCE (safe)
  document.addEventListener("DOMContentLoaded", () => {
    const mobileLinks = document.getElementById("mobileNavLinks");
    if (!mobileLinks) return;

    const currentPath = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    const desktopNav =
      document.getElementById("desktopNav") ||
      document.querySelector("nav.nav") ||
      document.querySelector(".nav");

    const homeHref =
      desktopNav?.querySelector('a[href="index.html"], a[href="./index.html"], a[href*="index"]')
        ?.getAttribute("href") || "index.html";

    const aboutHref =
      desktopNav?.querySelector('a[href*="about-us"]')?.getAttribute("href") || "about-us.html";

    const workHref =
      desktopNav?.querySelector('a[href*="our-projects"]')?.getAttribute("href") ||
      "our-projects.html";

    const ddMenu =
      desktopNav?.querySelector(".nav-dd-menu") ||
      desktopNav?.querySelector(".nav-dd-menu[role='menu']") ||
      document.querySelector(".nav-dd-menu");

    const collectionLinks = Array.from(ddMenu?.querySelectorAll("a") || []);

    mobileLinks.innerHTML = `
      <a class="mnav-link" href="${homeHref}">Home</a>
      <a class="mnav-link" href="${aboutHref}">About Us</a>
      <a class="mnav-link" href="${workHref}">Our Work</a>

      <button class="mnav-dd-btn" type="button" aria-expanded="false">
        Collections <span class="mnav-caret">▾</span>
      </button>

      <div class="mnav-dd">
        ${collectionLinks
          .map((a) => {
            const href = a.getAttribute("href") || "#";
            const text = (a.textContent || "").trim();
            return `<a class="mnav-dd-link" href="${href}">${text}</a>`;
          })
          .join("")}
      </div>
    `;

    // Active highlight
    mobileLinks.querySelectorAll("a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      const file = href.split("/").pop();
      if (file === currentPath) a.classList.add("is-active");
    });

    // Dropdown toggle
    const dd = mobileLinks.querySelector(".mnav-dd");
    const ddBtn = mobileLinks.querySelector(".mnav-dd-btn");

    function setOpen(open) {
      if (!dd || !ddBtn) return;
      dd.classList.toggle("is-open", open);
      ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    ddBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!dd.classList.contains("is-open"));
    });

    // click outside closes dropdown (only when drawer open)
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("is-open")) return;
      if (ddBtn && ddBtn.contains(e.target)) return;
      if (dd && dd.contains(e.target)) return;
      setOpen(false);
    });

    // if active link is inside collections -> open dropdown automatically
    const activeInside = dd?.querySelector("a.is-active");
    if (activeInside) setOpen(true);
  });

  // Toggle drawer
  toggle.addEventListener("click", () => {
    const open = drawer.classList.contains("is-open");
    open ? closeMenu() : openMenu();
  });

  // Close when clicking backdrop / X
  drawer.addEventListener("click", (e) => {
    const close = e.target.closest("[data-close='1']");
    if (close) closeMenu();
  });

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Clicking a link closes drawer
  if (linksWrap) {
    linksWrap.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      closeMenu();
    });
  }

  // Leaving mobile width closes drawer
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

/* ===========================
   FETCH JSON (NO CACHE)
=========================== */
async function fetchJSON(path, opts = {}) {
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`;

  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
      else if (j?.message) msg = j.message;
    } catch (_) {}
    throw new Error(msg);
  }

  return res.json();
}

/* ===========================
   CART (sessionStorage)
   ✅ Clears when tab/browser is closed
=========================== */
function getCart() {
  return JSON.parse(sessionStorage.getItem("artisan_cart") || "[]");
}

function setCart(items) {
  sessionStorage.setItem("artisan_cart", JSON.stringify(items));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = $("#cartBadge");
  if (!badge) return;

  const cart = getCart();
  const count = cart.reduce((sum, it) => sum + (it.qty || 0), 0);
  badge.textContent = count;
}

/* ===========================
   TOAST
=========================== */
function showToast(text) {
  const toast = $("#toast");
  const t = $("#toastText");
  if (!toast || !t) return;

  t.textContent = text;
  toast.classList.add("show");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1500);
}

/* ===========================
   REVEAL ON SCROLL
=========================== */
let __revealIO = null;

function setupReveal() {
  const items = $$(".reveal");

  if (!__revealIO) {
    __revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            __revealIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
  }

  items.forEach((el) => {
    if (!el.classList.contains("in")) __revealIO.observe(el);
  });
}

function observeReveal(el) {
  if (!el) return;
  if (!el.classList.contains("reveal")) return;

  if (__revealIO) __revealIO.observe(el);
  else el.classList.add("in");
}

/* ===========================
   LAZY BACKGROUND IMAGE
=========================== */
let __bgIO = null;

function setupLazyBgObserver() {
  if (__bgIO) return;

  __bgIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const url = el.dataset.bg;
        if (url) {
          el.style.backgroundImage = `url('${url}')`;
          delete el.dataset.bg;
        }
        __bgIO.unobserve(el);
      });
    },
    { rootMargin: "300px 0px" }
  );
}

function setBgLazy(el, url) {
  if (!el || !url) return;
  el.dataset.bg = url;
  setupLazyBgObserver();
  __bgIO.observe(el);
}

/* ===========================
   HELPERS
=========================== */
function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function isPhone() {
  return window.matchMedia("(max-width: 620px)").matches;
}

/* ✅ NEW: scroll to products top when changing page */
function scrollToProducts() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;

  const y = grid.getBoundingClientRect().top + window.pageYOffset - 80;

  window.scrollTo({
    top: y,
    behavior: "smooth",
  });
}

/* ===========================
   DATA CACHES
=========================== */
let __productsCache = null;
let __projectsCache = null;
let __configCache = null;

function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    desc: p.description ?? p.desc ?? "",
    price: Number(p.price || 0),
    category: p.category,
    featured: Boolean(p.featured),
    out_of_stock: Boolean(p.out_of_stock),
    img: p.image_url ?? p.img ?? "",
  };
}

async function getProducts() {
  if (__productsCache) return __productsCache;
  const list = await fetchJSON("/api/products");
  __productsCache = Array.isArray(list) ? list.map(normalizeProduct) : [];
  return __productsCache;
}

async function getProjects() {
  if (__projectsCache) return __projectsCache;

  try {
    const list = await fetchJSON("/api/projects");
    __projectsCache = Array.isArray(list) ? list : [];
  } catch (e) {
    const prods = await getProducts();
    __projectsCache = prods
      .filter((p) => p.img && String(p.category || "").toLowerCase() !== "lessons")
      .map((p) => ({ image_url: p.img, category: p.category, title: p.name }));
  }

  return __projectsCache;
}

async function getConfig() {
  if (__configCache) return __configCache;
  try {
    __configCache = await fetchJSON("/api/config");
  } catch (e) {
    __configCache = { whatsappNumber: "" };
  }
  return __configCache;
}

/* ===========================
   PAGER (PHONE ONLY)
=========================== */
function buildPager(mount, page, pages, onChange) {
  if (!mount) return;

  if (pages <= 1) {
    mount.innerHTML = "";
    return;
  }

  mount.innerHTML = `
    <button class="pbtn" type="button" data-act="prev" ${page <= 1 ? "disabled" : ""}>‹</button>
    <div class="pinfo">Page ${page} / ${pages}</div>
    <button class="pbtn" type="button" data-act="next" ${page >= pages ? "disabled" : ""}>›</button>
  `;

  mount.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      if (act === "prev") onChange(Math.max(1, page - 1));
      if (act === "next") onChange(Math.min(pages, page + 1));
    });
  });
}

/* ===========================
   RENDER PRODUCTS (DESKTOP ALL, PHONE PAGED)
=========================== */
function normCat(x) {
  return String(x || "").trim().toLowerCase();
}

function isInteriorDesign(cat) {
  return normCat(cat) === "interior design";
}

function isInteriorPage() {
  const grid = document.getElementById("featuredGrid");
  return normCat(grid?.dataset?.category) === "interior design";
}

function makeProductCard(p) {
  const card = document.createElement("div");
  const interiorMode = isInteriorPage();

  card.className = "pcard zoom-hover";

  const featuredPill = p.featured ? `<div class="pill">Featured</div>` : ``;
  const stockPill = p.out_of_stock
    ? `<div class="pill" style="left:auto;right:12px;">Out of stock</div>`
    : ``;

  const hidePrice = isInteriorDesign(p.category);

  card.innerHTML = `
    <div class="pimg">
      ${featuredPill}
      ${stockPill}
    </div>

    <div class="pbody">
      <div class="pname">${p.name}</div>
      <div class="pdesc">${String(p.desc || "").split("\n")[0] || ""}</div>
      <div class="pcard-hint">Click the card to see details</div>

      ${
        hidePrice
          ? ``
          : `
            <div class="label">PRICE</div>
            <div class="price" data-usd="${Number(p.price || 0)}">${money(p.price)}</div>
          `
      }

      ${
        interiorMode
          ? ``
          : `
            <div class="qty-row">
              <strong>Quantity:</strong>
              <div class="qty">
                <button class="qbtn" data-act="minus" ${p.out_of_stock ? "disabled" : ""}>−</button>
                <div class="qnum">1</div>
                <button class="qbtn" data-act="plus" ${p.out_of_stock ? "disabled" : ""}>+</button>
              </div>
            </div>

            <button class="addbtn zoom-hover" type="button" ${p.out_of_stock ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7h14l-1.5 8.5H8.2L7 7Z"/>
                <path d="M7 7 6.2 4.5H3"/>
                <path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
                <path d="M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
              </svg>
              ${p.out_of_stock ? "Out of Stock" : "Add to Cart"}
            </button>
          `
      }
    </div>
  `;

  const pimg = card.querySelector(".pimg");
  pimg.style.backgroundColor = "rgba(0,0,0,.05)";
  pimg.style.backgroundSize = "cover";
  pimg.style.backgroundPosition = "center";
  setBgLazy(pimg, p.img || "");

  if (!interiorMode) {
    let qty = 1;
    const qnum = card.querySelector(".qnum");

    card.querySelectorAll(".qbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (p.out_of_stock) return;
        const act = btn.dataset.act;
        if (act === "minus") qty = Math.max(1, qty - 1);
        if (act === "plus") qty = qty + 1;
        if (qnum) qnum.textContent = qty;
      });
    });

    const addBtn = card.querySelector(".addbtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (p.out_of_stock) {
          showToast("Sorry, this item is out of stock");
          return;
        }

        const cart = getCart();
        const found = cart.find((i) => i.id === p.id);

        const cartItem = {
          id: p.id,
          name: p.name,
          price: p.price,
          img: p.img,
          category: p.category,
          qty,
        };

        if (found) found.qty += qty;
        else cart.push(cartItem);

        setCart(cart);
        showToast(`Added ${p.name} to cart`);

        qty = 1;
        if (qnum) qnum.textContent = "1";
      });
    }
  }

  // ✅ Click card opens modal (but buttons still work)
  card.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;

    const hidePrice2 = isInteriorDesign(p.category);
    openProductModal({
      title: p.name,
      desc: p.desc,
      img: p.img,
      category: p.category,
      price: p.price,
      hidePrice: hidePrice2,
    });
  });

  observeReveal(card);
  return card;
}

async function renderFeatured(page = 1) {
  const grid = $("#featuredGrid");
  if (!grid) return;

  const pagerMount = $("#featuredPager");

  grid.innerHTML = "";
  if (pagerMount) pagerMount.innerHTML = "";

  let products = [];
  try {
    products = await getProducts();
  } catch (e) {
    grid.innerHTML = `<div class="empty reveal in"><h2>Couldn't load products</h2><p>${e.message}</p></div>`;
    return;
  }

  const cat = grid.dataset.category;
  let list = [];

  if (cat) {
    const want = normCat(cat);
    list = products.filter((p) => normCat(p.category) === want);
  } else {
    list = products.filter((p) => p.featured).slice(0, 6);
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty reveal in"><h2>No items found</h2><p>Please check back soon.</p></div>`;
    return;
  }

  const phone = isPhone();
  const perPage = phone ? Number(grid.dataset.perPage || 5) : list.length;

  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(Math.max(1, page), pages);

  const start = (safePage - 1) * perPage;
  const end = start + perPage;
  const visible = list.slice(start, end);

  const CHUNK = 12;
  for (let i = 0; i < visible.length; i += CHUNK) {
    const frag = document.createDocumentFragment();
    const chunk = visible.slice(i, i + CHUNK);

    chunk.forEach((p) => frag.appendChild(makeProductCard(p)));
    grid.appendChild(frag);
    await nextFrame();
  }

  if (pagerMount) {
    if (phone) {
      buildPager(pagerMount, safePage, pages, (newPage) => {
        renderFeatured(newPage);
        scrollToProducts();
      });
    } else {
      pagerMount.innerHTML = "";
    }
  }

  applyCurrencyToDOM(document);
}

/* ===========================
   CART PAGE
=========================== */
async function renderCartPage() {
  const mount = $("#cartMount");
  if (!mount) return;

  const cart = getCart();

  if (cart.length === 0) {
    mount.innerHTML = `
      <div class="empty reveal in">
        <h2>Your cart is empty</h2>
        <p>Add some products first</p>
        <a class="btn btn-gold zoom-hover" href="Home.html">Browse</a>
      </div>
    `;
    return;
  }

  let subtotal = 0;

  mount.innerHTML = `
    <div class="cart-layout reveal in">
      <div id="cartItems"></div>

      <aside class="summary">
        <h3>Order Summary</h3>
        <div class="row"><span>Subtotal</span><span id="sub"></span></div>
        <div class="row"><span>Total</span><span class="total" id="total"></span></div>
        <button class="checkout zoom-hover" id="waCheckout">Checkout WhatsApp</button>
        <div class="smallnote">You'll be redirected to WhatsApp to complete your order</div>
      </aside>
    </div>
  `;

  const list = $("#cartItems");

  cart.forEach((item) => {
    subtotal += item.price * item.qty;

    const row = document.createElement("div");
    row.className = "cart-item zoom-hover";

    row.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <p class="price" data-usd="${Number(item.price || 0)}">${money(item.price)}</p>
      </div>

      <div class="cart-controls">
        <button class="iconbtn" data-act="minus">−</button>
        <span style="width:32px;text-align:center;font-weight:900">${item.qty}</span>
        <button class="iconbtn" data-act="plus">+</button>
        <button class="iconbtn trash" data-act="remove">✖</button>
      </div>
    `;

    row.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;

        let c = getCart();
        const found = c.find((i) => i.id === item.id);
        if (!found) return;

        if (act === "minus") found.qty = Math.max(1, found.qty - 1);
        if (act === "plus") found.qty += 1;
        if (act === "remove") c = c.filter((i) => i.id !== item.id);

        setCart(c);
        renderCartPage();
      });
    });

    list.appendChild(row);
  });

  $("#sub").textContent = money(subtotal);
  $("#sub").dataset.usd = String(subtotal);
  $("#sub").classList.add("price");

  $("#total").textContent = money(subtotal);
  $("#total").dataset.usd = String(subtotal);
  $("#total").classList.add("price");

  applyCurrencyToDOM(document);

  const checkoutBtn = $("#waCheckout");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      const cfg = await getConfig();
      const phone = (cfg?.whatsappNumber || "").trim();

      if (!phone) {
        showToast("WhatsApp number not configured");
        return;
      }

      const c = getCart();
      const lines = c.map((i) => `• ${i.name} x${i.qty} = ${money(i.price * i.qty)}`);
      const total = c.reduce((s, i) => s + i.price * i.qty, 0);

      const msg = `Hello! I want to place an order:
${lines.join("\n")}

Total: ${money(total)}
Name:
Address:
Phone:`;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    });
  }
}

/* ===========================
   PUBLICATIONS PANEL (RIGHT SIDE)
=========================== */
let __pubFilter = "";

function splitPublications(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);

  return String(value || "")
    .split(/[\n,;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildPublicationsPanel(projects) {
  const listEl = document.getElementById("pubsList");
  const clearBtn = document.getElementById("pubsClear");
  if (!listEl) return;

  const counts = new Map();

  projects.forEach((p) => {
    const pubs = splitPublications(p.publications || p.publication || "");
    pubs.forEach((pub) => counts.set(pub, (counts.get(pub) || 0) + 1));
  });

  const items = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  if (!items.length) {
    listEl.innerHTML = `<div class="pubs-empty">No publications yet</div>`;
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  listEl.innerHTML = items
    .slice(0, 30)
    .map(([pub, count]) => {
      const active = __pubFilter === pub ? "is-active" : "";
      return `
        <div class="pubs-item ${active}" data-pub="${pub.replace(/"/g, "&quot;")}">
          <div class="pubs-name">${pub}</div>
          <div class="pubs-count">${count}</div>
        </div>
      `;
    })
    .join("");

  if (clearBtn) {
    clearBtn.style.display = __pubFilter ? "" : "none";
    clearBtn.onclick = () => {
      __pubFilter = "";
      const activeBtn = document.querySelector("#filterPills .pill-btn.is-active");
      renderProjects(activeBtn?.dataset?.filter || "all");
    };
  }

  listEl.onclick = (e) => {
    const item = e.target.closest(".pubs-item");
    if (!item) return;

    const pub = item.dataset.pub || "";
    __pubFilter = (__pubFilter === pub) ? "" : pub;

    const activeBtn = document.querySelector("#filterPills .pill-btn.is-active");
    renderProjects(activeBtn?.dataset?.filter || "all");
  };
}

/* ===========================
   OUR PROJECTS (FILTER + GRID)
=========================== */
async function renderProjects(filter) {
  const grid = $("#projectsGrid");
  if (!grid) return;

  const map = {
    all: null,
    interior: "Interior Design",
    glass: "Stained Glass",
    painting: "Painting",
    ceramic: "Ceramic Art",
    publications: "Publications",
  };

  const cat = map[filter] ?? null;

  let list = [];
  try {
    list = await getProjects();
    buildPublicationsPanel(list);
  } catch (e) {
    grid.innerHTML = `<div class="empty reveal in"><h2>Couldn't load projects</h2><p>${e.message}</p></div>`;
    return;
  }

  if (cat) {
    const want = normCat(cat);
    list = list.filter((p) => normCat(p.category || p.cat) === want);
  }

  if (__pubFilter) {
    list = list.filter((p) => {
      const pubs = splitPublications(p.publications || p.publication || "");
      return pubs.includes(__pubFilter);
    });
  }

  grid.innerHTML = "";
  const frag = document.createDocumentFragment();

  list.forEach((p) => {
    const img = p.image_url || p.img || "";
    const name = p.title || p.name || "Project";
    const desc = p.description || p.desc || "";
    const category = p.category || p.cat || "";

    const card = document.createElement("div");
    card.className = "project-card zoom-hover reveal";

    card.dataset.title = name;
    card.dataset.desc = desc;
    card.dataset.img = img;
    card.dataset.category = category;
    card.dataset.publications = (p.publications || p.publication || "").trim();
    card.dataset.pdf = (p.pdf_url || p.pdf || p.publications || p.publication || "").trim();

    card.innerHTML = `<img src="${img}" alt="${name}" loading="lazy" decoding="async">`;
    frag.appendChild(card);
  });

  grid.appendChild(frag);

  setupReveal();
}

/* ✅ Click projects to open modal */
function setupProjectClicks() {
  const grid = $("#projectsGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".project-card");
    if (!card) return;

    openProjectModal({
      title: card.dataset.title || "Project",
      desc: card.dataset.desc || "",
      img: card.dataset.img || "",
      category: card.dataset.category || "",
      publications: card.dataset.publications || "",
      pdfUrl: card.dataset.pdf || "",
    });
  });
}

/* ✅ MODAL (FIXED: closes correctly + no aria-hidden focus warning) */
function openProjectModal({ title, desc, img, category, publications, pdfUrl }) {
  const modal = document.getElementById("projectModal");
  if (!modal) return;

  const titleEl = document.getElementById("pmodalTitle");
  const descEl = document.getElementById("pmodalDesc");
  const imgEl = document.getElementById("pmodalImg");
  const catEl = document.getElementById("pmodalCat");
  const card = modal.querySelector(".pmodal-card");
  const closeBtn = modal.querySelector(".pmodal-close");

  if (titleEl) titleEl.textContent = title || "Project";
  if (descEl) descEl.textContent = desc || "";
  if (catEl) catEl.textContent = (category || "PROJECT").toUpperCase();

  // Publications / PDF
  const pubsWrap = document.getElementById("pmodalPubs");
  const pubsText = document.getElementById("pmodalPubsText");
  const pdfBtn = document.getElementById("pmodalPdfBtn");

  const pubs = String(publications || "").trim();
  const isPubCategory = String(category || "").trim().toLowerCase() === "publications";
  const pdf = String(pdfUrl || "").trim();

  if (pdfBtn) {
    pdfBtn.style.display = "none";
    pdfBtn.href = "#";
  }

  if (pubsWrap && pubsText) {
    if (!isPubCategory && pubs) {
      pubsText.textContent = pubs;
      pubsWrap.style.display = "";
    } else {
      pubsText.textContent = "";
      pubsWrap.style.display = "none";
    }
  }

  if (isPubCategory && pdfBtn && pdf) {
    pdfBtn.href = pdf;
    pdfBtn.style.display = "inline-flex";
  }

  if (imgEl) {
    if (img) {
      imgEl.src = img;
      imgEl.alt = title || "Project";
      imgEl.style.display = "";
    } else {
      imgEl.style.display = "none";
    }
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    (closeBtn || card || modal).focus?.();
  }, 0);

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (modal.__pmodalCleanup) modal.__pmodalCleanup();

  function onClick(e) {
    if (e.target.closest("[data-close='1']")) closeModal();
  }

  function onMouseDown(e) {
    if (!e.target.closest(".pmodal-card")) closeModal();
  }

  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  modal.addEventListener("click", onClick);
  modal.addEventListener("mousedown", onMouseDown);
  window.addEventListener("keydown", onKey);

  modal.__pmodalCleanup = () => {
    modal.removeEventListener("click", onClick);
    modal.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("keydown", onKey);
    modal.__pmodalCleanup = null;
  };
}

function setupProjectsFilter() {
  const pillsWrap = $("#filterPills");
  const grid = $("#projectsGrid");
  if (!pillsWrap || !grid) return;

  pillsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill-btn");
    if (!btn) return;

    $$(".pill-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    renderProjects(btn.dataset.filter || "all");
  });

  renderProjects("all");
}

/* ===========================
   FOOTER WHATSAPP BUTTON
=========================== */
async function setupFooterWhatsApp() {
  const btn = $("#waChatBtn");
  if (!btn) return;

  try {
    const cfg = await getConfig();
    const phone = (cfg?.whatsappNumber || "").trim();
    if (!phone) return;

    btn.addEventListener("click", () => {
      window.open(`https://wa.me/${phone}`, "_blank");
    });
  } catch (_) {}
}

function setupNavDropdown() {
  const dd = document.getElementById("collectionsDD") || document.querySelector(".nav-dd");
  if (!dd) return;

  const btn = dd.querySelector(".nav-dd-btn, .nav-dd-toggle");
  if (!btn) return;

  function openDD() {
    dd.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
  }

  function closeDD() {
    dd.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    dd.classList.contains("is-open") ? closeDD() : openDD();
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target)) closeDD();
  });
}

function openProductModal({ title, desc, img, category, price, hidePrice }) {
  const modal = document.getElementById("productModal");
  if (!modal) return;

  const imgEl = document.getElementById("prodModalImg");
  const titleEl = document.getElementById("prodModalTitle");
  const descEl = document.getElementById("prodModalDesc");
  const catEl = document.getElementById("prodModalCat");
  const priceWrap = document.getElementById("prodModalPriceWrap");
  const priceEl = document.getElementById("prodModalPrice");
  const card = modal.querySelector(".pmodal-card");

  if (catEl) catEl.textContent = (category || "").toUpperCase();
  if (titleEl) titleEl.textContent = title || "";
  if (descEl) descEl.textContent = desc || "";

  if (imgEl) {
    imgEl.src = img || "";
    imgEl.alt = title || "Product";
  }

  if (priceWrap && priceEl) {
    if (hidePrice) {
      priceWrap.style.display = "none";
    } else {
      priceWrap.style.display = "";
      priceEl.textContent = money(price);
      priceEl.dataset.usd = String(Number(price || 0));
      priceEl.classList.add("price");
      applyCurrencyToDOM(modal);
    }
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  function close() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (modal.__cleanup) modal.__cleanup();

  function onClick(e) {
    if (e.target.closest("[data-close='1']")) close();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  modal.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
  modal.__cleanup = () => {
    modal.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    modal.__cleanup = null;
  };

  setTimeout(() => (card || modal).focus?.(), 0);
}

function hidePublicationsPillIfNotProjects() {
  const pubPill = document.querySelector(".pill-btn[data-filter='publications']");
  if (!pubPill) return;

  const currentPage = window.location.pathname.split("/").pop().toLowerCase();
  if (currentPage !== "our-projects.html") {
    pubPill.style.display = "none";
  }
}

/* =========================================
   HOME HERO BACKGROUND SLIDER (AUTOPLAY)
========================================= */
(function () {
  const bg = document.getElementById("heroBg");
  if (!bg) return;

  const slides = Array.from(bg.querySelectorAll(".hero-bg-slide"));
  if (slides.length < 2) return;

  const dotsWrap = document.getElementById("heroDots");
  const intervalMs = 5000;
  let index = 0;
  let timer = null;

  let dots = [];
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hero-dot" + (i === 0 ? " is-active" : "");
      b.setAttribute("aria-label", `Go to slide ${i + 1}`);
      b.addEventListener("click", () => goTo(i, true));
      dotsWrap.appendChild(b);
      return b;
    });
  }

  function render() {
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  }

  function goTo(i, userAction) {
    index = (i + slides.length) % slides.length;
    render();
    if (userAction) restart();
  }

  function next() {
    goTo(index + 1, false);
  }

  function start() {
    stop();
    timer = setInterval(next, intervalMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function restart() {
    start();
  }

  const hero = document.getElementById("homeHero") || bg.closest(".hero");
  if (hero) {
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
  }

  render();
  start();
})();

/* ===========================
   INIT
=========================== */
(async function init() {
  updateCartBadge();
  setupMobileMenu();
  setupReveal();

  ensureCurrencyDropdown();
  applyCurrencyToDOM(document);

  getConfig().catch(() => {});
  getProducts().catch(() => {});

  await renderFeatured(1);
  await renderCartPage();

  setupProjectsFilter();
  setupProjectClicks();
  hidePublicationsPillIfNotProjects();

  await setupFooterWhatsApp();

  window.addEventListener("resize", () => {
    if ($("#featuredGrid")) renderFeatured(1);
  });

  setupReveal();
  setupNavDropdown();
})();