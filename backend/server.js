import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";

import { pool } from "./db.js";
import { uploadImage } from "./supabaseUpload.js";
import { uploadPdf } from "./supabaseUpload.js";
import { sendLoginCode } from "./mailer.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // ✅ ADD THIS LINE (Render needs it)
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5500";
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * ✅ DEV MODE:
 * true  => print code in terminal (no email)
 * false => send real email via Gmail
 */
const DEV_PRINT_LOGIN_CODE = false;

/* ===========================
   MIDDLEWARE
=========================== */
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "https://artshop-frontend.onrender.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

/* ===========================
   HELPERS
=========================== */
function toBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "on") return true;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  return false;
}

/* ===========================
   AUTH MIDDLEWARE
=========================== */
function requireAdmin(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "not logged in" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = payload.adminId;
    next();
  } catch {
    return res.status(401).json({ error: "invalid session" });
  }
}

/* ===========================
   PUBLIC CONFIG (for frontend)
=========================== */
app.get("/api/config", (req, res) => {
  res.json({
    whatsappNumber: process.env.WHATSAPP_NUMBER || "",
  });
});

/* ===========================
   HEALTH
=========================== */
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (err) {
    console.log("HEALTH ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

/* ===========================
   ADMIN SEED (RUN ONCE)
=========================== */
app.post("/api/admin/seed", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "email not allowed" });
    }

    const existing = await pool.query("SELECT id FROM admins WHERE email=$1", [
      email,
    ]);

    if (existing.rows.length) {
      return res.status(409).json({ error: "admin already exists" });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.query("INSERT INTO admins (email, password_hash) VALUES ($1,$2)", [
      email,
      hash,
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.log("SEED ERROR:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* ===========================
   LOGIN STEP 1 (SEND CODE)
=========================== */
function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "email not allowed" });
    }

    const r = await pool.query(
      "SELECT id,password_hash FROM admins WHERE email=$1",
      [email]
    );

    if (!r.rows.length) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const code = makeCode();
    const expires = new Date(Date.now() + 10 * 60000);

    await pool.query(
      "INSERT INTO login_codes(admin_id,code,expires_at) VALUES($1,$2,$3)",
      [r.rows[0].id, code, expires]
    );

    if (DEV_PRINT_LOGIN_CODE) {
      console.log("✅ DEV LOGIN CODE:", code);
    } else {
      await sendLoginCode(process.env.ADMIN_EMAIL, code);
      console.log("✅ Email code sent to:", process.env.ADMIN_EMAIL);
    }

    res.json({ ok: true });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* ===========================
   LOGIN STEP 2 (VERIFY CODE)
=========================== */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

app.post("/api/admin/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    const r = await pool.query("SELECT id FROM admins WHERE email=$1", [email]);
    if (!r.rows.length) return res.status(401).json({ error: "invalid" });

    const adminId = r.rows[0].id;

    const c = await pool.query(
      `SELECT id,code,expires_at,used
       FROM login_codes
       WHERE admin_id=$1
       ORDER BY created_at DESC
       LIMIT 1`,
      [adminId]
    );

    if (!c.rows.length) return res.status(401).json({ error: "no code" });

    const row = c.rows[0];

    if (row.used) return res.status(401).json({ error: "code used" });
    if (new Date(row.expires_at) < new Date())
      return res.status(401).json({ error: "expired" });
    if (String(row.code) !== String(code))
      return res.status(401).json({ error: "wrong code" });

    await pool.query("UPDATE login_codes SET used=true WHERE id=$1", [row.id]);

    const token = signToken({ adminId });

    res.cookie("session", token, {
      httpOnly: true,
      sameSite: IS_PROD ? "none" : "lax",
      secure: IS_PROD,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ ok: true });
  } catch (err) {
    console.log("VERIFY ERROR:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* ===========================
   LOGOUT / ME
=========================== */
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("session", {
    sameSite: IS_PROD ? "none" : "lax",
    secure: IS_PROD,
  });
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ ok: true, adminId: req.adminId });
});

/* ===========================
   IMAGE UPLOAD
=========================== */
app.post("/api/upload", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing image" });
    const url = await uploadImage(req.file);
    res.json({ ok: true, url });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ error: "upload failed" });
  }
});
app.post("/api/upload-pdf", requireAdmin, upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing pdf" });

    // Optional safety check
    if (!String(req.file.mimetype || "").includes("pdf")) {
      return res.status(400).json({ error: "file must be a PDF" });
    }

    const url = await uploadPdf(req.file);
    res.json({ ok: true, url });
  } catch (err) {
    console.log("PDF UPLOAD ERROR:", err);
    res.status(500).json({ error: "pdf upload failed" });
  }
});

/* ===========================
   PRODUCTS CRUD (already working)
=========================== */
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.log("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: "failed to load products" });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  try {
    const { name, price, category, image_url, description, featured, out_of_stock } =
      req.body;

    const result = await pool.query(
      `INSERT INTO products
      (name, price, category, image_url, description, featured, out_of_stock)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        name,
        price,
        category,
        image_url,
        description,
        toBool(featured),
        toBool(out_of_stock),
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("CREATE PRODUCT ERROR:", err);
    res.status(500).json({ error: "failed to create product" });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image_url, description, featured, out_of_stock } =
      req.body;

    const result = await pool.query(
      `UPDATE products SET
        name=$1,
        price=$2,
        category=$3,
        image_url=$4,
        description=$5,
        featured=$6,
        out_of_stock=$7,
        updated_at=now()
      WHERE id=$8
      RETURNING *`,
      [
        name,
        price,
        category,
        image_url,
        description,
        toBool(featured),
        toBool(out_of_stock),
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ error: "failed to update product" });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.log("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ error: "failed to delete product" });
  }
});

/* ===========================
   ✅ PROJECTS CRUD (UPDATED)
   - now supports pdf_url (optional)
=========================== */
app.get("/api/projects", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    console.log("GET PROJECTS ERROR:", err);
    res.status(500).json({ error: "failed to load projects" });
  }
});

app.post("/api/projects", requireAdmin, async (req, res) => {
  try {
    const { name, category, image_url, description, pdf_url } = req.body;

    if (!name || !category || !image_url || !description) {
      return res.status(400).json({ error: "missing fields" });
    }

    const r = await pool.query(
      `INSERT INTO projects (name, category, image_url, description, pdf_url)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [name, category, image_url, description, pdf_url || ""]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.log("CREATE PROJECT ERROR:", err);
    res.status(500).json({ error: "failed to create project" });
  }
});

app.put("/api/projects/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, image_url, description, pdf_url } = req.body;

    if (!id) return res.status(400).json({ error: "bad id" });

    const r = await pool.query(
      `UPDATE projects
       SET name=$1, category=$2, image_url=$3, description=$4, pdf_url=$5, updated_at=now()
       WHERE id=$6
       RETURNING *`,
      [name, category, image_url, description, pdf_url || "", id]
    );

    if (!r.rows.length) return res.status(404).json({ error: "not found" });

    res.json(r.rows[0]);
  } catch (err) {
    console.log("UPDATE PROJECT ERROR:", err);
    res.status(500).json({ error: "failed to update project" });
  }
});

app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });

    const r = await pool.query("DELETE FROM projects WHERE id=$1 RETURNING id", [
      id,
    ]);

    if (!r.rows.length) return res.status(404).json({ error: "not found" });

    res.json({ ok: true });
  } catch (err) {
    console.log("DELETE PROJECT ERROR:", err);
    res.status(500).json({ error: "failed to delete project" });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});
/* ===========================
   START
=========================== */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});