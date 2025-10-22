require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const app = express();
const { requireAuth, requireAdmin } = require('./auth');

const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN;
// ... ใส่ฟังก์ชัน absolutizeUploads ที่คุณเขียนไว้ ...

app.use((req, res, next) => {
  const origin =
    (PUBLIC_ORIGIN && PUBLIC_ORIGIN.replace(/\/+$/, '')) ||
    `${req.protocol}://${req.get('host')}`;

  const _json = res.json.bind(res);
  res.json = (data) => {
    try {
      const patched = absolutizeUploads(data, origin);
      return _json(patched);
    } catch {
      return _json(data);
    }
  };
  next();
});


const PORT = process.env.PORT || 3000;
const sharp = require('sharp');



// ====== Config ======
const uploadDir = "C:/Users/ADMIN/Desktop/อัพโหลดเสือผ้า/uploads";  // ✅ path เต็ม (Windows ใช้ / ได้)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// ====== Slip Upload (บีบอัดก่อนเก็บที่ uploads/slips) ======
const slipDir = path.join(uploadDir, 'slips');
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });

// รับได้ทั้งชื่อฟิลด์ 'image' และ 'file'
const slipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/jpg','image/avif'];
    if (!ok.includes(file.mimetype)) return cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น'));
    cb(null, true);
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'file',  maxCount: 1 },
]);


// ====== Profile Upload (บีบอัดก่อนเก็บ) ======
const profileDir = path.join(uploadDir, 'profile');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

// ใช้ memoryStorage (ไม่เขียนไฟล์ตรง ๆ แต่เก็บใน buffer)
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดไฟล์อัปโหลดไม่เกิน 5MB
});



/// ====== Product Upload (ไปที่ uploads/products) ======
const productDir = path.join(uploadDir, 'products');
if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/avif','image/jpg'
]);

// ใช้ memoryStorage
const productUploadFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // จำกัด 8MB/ไฟล์
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น'));
    }
    cb(null, true);
  },
}).fields([
  { name: 'image',  maxCount: 1  }, // ปก
  { name: 'images', maxCount: 10 }, // แกลเลอรี
]);
// helper: สร้างชื่อไฟล์และบันทึก webp
const newName = (prefix='product') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}.webp`;

async function saveWebp(buffer, {
  dir,
  maxW = 1600,
  maxH = 1600,
  quality = 82,
  prefix = 'product'
}) {
  const filename = newName(prefix);
  const outPath = path.join(dir, filename);

  await sharp(buffer)
    .rotate() // ตาม EXIF
    .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(outPath);

  // สมมุติว่ามี app.use('/uploads', express.static(uploadDir)) แล้ว
  const publicUrl = `/uploads/products/${filename}`;
  return publicUrl;
}

// serve static files
app.use('/uploads', express.static(uploadDir));
app.use(cors());
app.use(bodyParser.json());

// ====== DB Connect ======
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'clothing_store',
  password: process.env.PGPASSWORD || '123456',
  port: Number(process.env.PGPORT) || 5432,
});

pool.connect()
  .then(client => {
    console.log('เชื่อมต่อ PostgreSQL สำเร็จ');
    client.release();
  })
  .catch(err => {
    console.error('เชื่อมต่อ PostgreSQL ไม่สำเร็จ:', err.stack);
  });
/* ====== Upload ====== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });
// ====== Nodemailer (ใช้ POOL + อุ่นเครื่อง + คงท่อ) ======
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // ลดดีเลย์ DNS/IPv6 บน Windows

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  pool: true,            // ✅ ใช้ connection pool
  keepAlive: true,       // ✅ คงการเชื่อมต่อไว้เพื่อส่งไว
  maxConnections: 3,
  maxMessages: 200,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
  logger: false,
  debug: false,
  connectionTimeout: 10000,
  greetingTimeout: 7000,
  socketTimeout: 15000,
  tls: { rejectUnauthorized: true },
});

// อุ่นเครื่อง (ไม่ปิดท่อ)
(async () => {
  try {
    await transporter.verify();
    console.log('SMTP ready (pool warmed)');
    setInterval(() => transporter.verify().catch(()=>{}), 5 * 60 * 1000); // กันหลับทุก 5 นาที
  } catch (e) {
    console.error('SMTP verify failed:', e.message);
  }
})();
/* ====== OTP In-memory store ====== */
const otpStore = {};
const OTP_EXPIRE_MIN   = Number(process.env.OTP_EXPIRE_MIN || 10);
const OTP_EXPIRE_MS    = OTP_EXPIRE_MIN * 60 * 1000;


const OTP_COOLDOWN_MS  = 60 * 1000;

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const now = () => Date.now();
const iso = (t = Date.now()) => new Date(t).toISOString();
const cleanupOtp = (email) => { delete otpStore[email]; };
/* ====== อัปโหลดรูปโปรไฟล์ ====== */
// Route อัปโหลด
app.post('/api/profile/upload', profileUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ไม่มีไฟล์อัปโหลด' });
    }

    // ตั้งชื่อไฟล์ใหม่
    const filename = `profile_${Date.now()}.webp`;
    const outPath = path.join(profileDir, filename);

    // บีบอัดด้วย sharp
    await sharp(req.file.buffer)
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true }) // ไม่ให้เกิน 512px
      .webp({ quality: 80 })
      .toFile(outPath);

    res.json({ url: `/uploads/profile/${filename}` });
  } catch (err) {
    console.error('Profile upload error:', err);
    res.status(500).json({ message: 'อัปโหลดรูปไม่สำเร็จ' });
  }
});


/* ====== ส่ง OTP (สมัครสมาชิก) — ตอบทันที + ส่งหลังบ้าน ====== */
app.post('/api/send-otp', async (req, res) => {
  const email = (req.body?.email ?? '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'กรุณาส่งอีเมลให้ถูกต้อง' });
  }

  try {
    console.log(`[OTP] request  ${email} at ${iso()}`);

    // กันอีเมลซ้ำ
    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว กรุณาเข้าสู่ระบบ' });
    }

    // คูลดาวน์ (เฉพาะส่งสำเร็จรอบก่อน)
const rec = otpStore[email];
if (rec && rec.delivered && rec.lastSentAt && (now() - rec.lastSentAt) < OTP_COOLDOWN_MS) {
  const leftMs = (rec.lastSentAt + OTP_COOLDOWN_MS) - now();
  const leftSeconds = Math.ceil(leftMs / 1000); // ✅ ใช้วินาทีแทน

  return res.status(429).json({
    message: `ขอ OTP ได้อีกใน ${leftSeconds} วินาที`,
    cooldownSeconds: leftSeconds,
    nextAvailableAt: iso(now() + leftMs),
  });
}

    // สร้าง/เก็บ OTP
    const code = genOtp();
    otpStore[email] = { code, expireAt: now() + OTP_EXPIRE_MS, delivered: false, lastSentAt: 0 };

    // ✅ ตอบกลับ "ทันที" เพื่อให้หน้าเว็บขึ้นแจ้งเตือนได้เลย
    res.json({
      ok: true,
      showOtpInput: true,
      // ข้อความนี้ให้ UI เอาไปโชว์เป็น toast/snackbar ได้ทันที
      notice: 'กำลังส่งรหัสยืนยันไปที่อีเมลของคุณ… โปรดรอสักครู่',
      cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
    });

    // 🔥 ส่งอีเมลหลังบ้าน (HTML ตัวใหญ่ชัด)
    const preheader = `รหัส OTP ของคุณคือ ${code} (หมดอายุใน ${OTP_EXPIRE_MIN} นาที)`;
    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: 'รหัสยืนยันการสมัครสมาชิก (OTP)',
      text: preheader, // fallback
      html: `
        <!-- preheader (ซ่อนในบาง client) -->
        <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
          ${preheader}
        </span>
        <div style="font-family:Arial, Helvetica, sans-serif; color:#222; line-height:1.6; padding:8px 2px;">
          <h2 style="margin:0 0 8px 0; font-size:20px;">รหัส OTP ของคุณคือ</h2>
          <div style="
            font-size:36px;
            font-weight:700;
            letter-spacing:10px;
            color:#000;
            margin:12px 0 16px 0;
          ">
            ${code}
          </div>
          <p style="margin:0; font-size:14px; color:#555;">
            รหัสหมดอายุภายใน <strong>${OTP_EXPIRE_MIN} นาที</strong>
          </p>
        </div>
      `,
    });

    // มาร์กส่งสำเร็จ
    const t = now();
    const r = otpStore[email];
    if (r) { r.delivered = true; r.lastSentAt = t; }
    console.log(`[OTP] delivered ${email} at ${iso(t)}`);

    // ❌ ห้าม close transporter (ต้องคงท่อไว้)
  } catch (err) {
    console.error('send-otp error:', err?.message || err);
    if (email) cleanupOtp(email);
    // ไม่คูลดาวน์ในกรณีส่งล้มเหลว เพื่อให้ขอใหม่ได้
  }
});

// เช็คสถานะ OTP (ให้ฝั่ง UI poll ถ้าต้องการเด้งแจ้งเตือนเมื่อส่งถึง)
app.get('/api/otp-status', (req, res) => {
  const email = (req.query?.email ?? '').trim().toLowerCase();
  const rec = otpStore[email];
  if (!rec) return res.json({ exists: false });
  const remainingMs = Math.max(0, rec.expireAt - now());
  res.json({
    exists: true,
    delivered: !!rec.delivered,
    ttlMs: remainingMs,
  });
});

// ====== สมัครสมาชิก (ตรวจ OTP) ======
app.post('/api/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { password, otp } = req.body || {};
    if (!email || !isValidEmail(email) || !password || !otp) {
      return res.status(400).json({ message: 'กรุณากรอก email, password และ otp ให้ครบและถูกต้อง' });
    }

    // กันสมัครซ้ำ
    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [email]);
    if (exists.rowCount > 0) {
      cleanupOtp(email);
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว กรุณาเข้าสู่ระบบ' });
    }

    // ตรวจ OTP
    const rec = otpStore[email];
    if (!rec) return res.status(400).json({ message: 'ยังไม่ได้ส่ง OTP หรือ OTP หมดอายุ' });
    if (now() > rec.expireAt) { cleanupOtp(email); return res.status(400).json({ message: 'OTP หมดอายุ กรุณาขอรหัสใหม่' }); }
    if (String(otp) !== String(rec.code)) return res.status(400).json({ message: 'OTP ไม่ถูกต้อง' });

    // บันทึกผู้ใช้
    const hashed = await bcrypt.hash(password, 10);
    const role = 'user';
    const q = `
      INSERT INTO users (email, password, role, email_verified, created_at)
      VALUES ($1,$2,$3,$4,NOW())
      RETURNING email, role, email_verified, created_at
    `;
    const r = await pool.query(q, [email, hashed, role, true]);

    cleanupOtp(email);
    return res.status(201).json({ message: `สมัครสมาชิกสำเร็จ: ${email}`, user: r.rows[0] });
  } catch (err) {
    console.error('Error in register:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});
// ==================== นับจำนวนผู้ใช้ ====================
app.get('/api/users/count', async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count, 10);
    res.json({ count });
  } catch (err) {
    console.error('Error in counting users:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนับผู้ใช้' });
  }
});

// เก็บ user ล่าสุดที่ login
let lastLoggedInUser = null;

// ==================== ล็อกอิน (เช็กรหัสผ่าน + เช็กยืนยันอีเมล) ====================
// ==================== ล็อกอิน (เช็กรหัสผ่าน + เช็กยืนยันอีเมล) ====================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email=$1';
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];

    // ยังไม่ได้ยืนยันอีเมล
    if (user.email_verified === false) {
      return res.status(403).json({ message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ' });
    }

    // === รองรับทั้ง hash และ plain ===
    let ok = false;
    const pass = String(user.password || '');
    const isHash =
      pass.startsWith('$2a$') || pass.startsWith('$2b$') || pass.startsWith('$2y$');

    if (isHash) {
      ok = await bcrypt.compare(password, pass);
    } else {
      ok = password === pass;
    }

    if (!ok) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // login สำเร็จ
    lastLoggedInUser = email;
    console.log(`มีคนเข้าสู่ระบบ: ${email}`);

    // อย่าส่ง password กลับไป
    const { password: _ignored, ...safeUser } = user;

    // ✅ สร้าง JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ส่งกลับทั้ง user + token
    res.json({ message: `เข้าสู่ระบบสำเร็จ: ${email}`, user: safeUser, token });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

app.get('/api/last-logged-in-user', (req, res) => {
  if (!lastLoggedInUser) return res.json({ message: 'ไม่มีผู้ใช้ล็อกอินล่าสุด' });
  res.json({ lastLoggedInUser });
});

app.get('/api/profile', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: 'กรุณาส่ง email มา' });

  try {
    const query = `
      SELECT email, username, address, phone, profile_image,
             province, district, subdistrict, zipcode
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
  }
});

app.put('/api/profile', async (req, res) => {
  const { email, username, address, phone, profile_image, password,
          province, district, subdistrict, zipcode } = req.body;
  if (!email) return res.status(400).json({ message: 'กรุณาส่ง email มา' });

  try {
    const checkUsernameQuery = 'SELECT 1 FROM users WHERE username=$1 AND email<>$2';
    const checkUsernameResult = await pool.query(checkUsernameQuery, [username, email]);
    if (checkUsernameResult.rows.length > 0) {
      return res.status(400).json({ message: 'ชื่อนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น' });
    }

    let updateQuery, params;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updateQuery = `
        UPDATE users SET
          username=$1, address=$2, phone=$3, profile_image=$4, password=$5,
          province=$6, district=$7, subdistrict=$8, zipcode=$9
        WHERE email=$10
        RETURNING email, username, address, phone, profile_image,
                  province, district, subdistrict, zipcode
      `;
      params = [username, address, phone, profile_image, hashed,
                province, district, subdistrict, zipcode, email];
    } else {
      updateQuery = `
        UPDATE users SET
          username=$1, address=$2, phone=$3, profile_image=$4,
          province=$5, district=$6, subdistrict=$7, zipcode=$8
        WHERE email=$9
        RETURNING email, username, address, phone, profile_image,
                  province, district, subdistrict, zipcode
      `;
      params = [username, address, phone, profile_image,
                province, district, subdistrict, zipcode, email];
    }

    const result = await pool.query(updateQuery, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์' });
  }
});

// ===== helpers: measure variants (อก/ยาว) =====
function parseMeasureVariants(input) {
  let mv = input;
  if (!mv) return [];
  if (typeof mv === "string") {           // มาจาก multipart/form-data จะเป็นสตริง
    try { mv = JSON.parse(mv); } catch { mv = null; }
  }
  if (!Array.isArray(mv)) return [];

  // ทำให้เป็นตัวเลข และกรองรายการที่ไม่ครบ
  const cleaned = mv.map(v => ({
    chest_cm: Number(v?.chest_cm ?? v?.chest),
    length_cm: Number(v?.length_cm ?? v?.length),
    stock: Number(v?.stock ?? 0),
  })).filter(v => Number.isFinite(v.chest_cm) && Number.isFinite(v.length_cm));

  // รวมแถวที่อก/ยาวซ้ำกัน (กันสต๊อกซ้ำ)
  const agg = new Map(); // key: c{chest}-l{length}
  for (const v of cleaned) {
    const key = `c${v.chest_cm}-l${v.length_cm}`;
    agg.set(key, (agg.get(key) || 0) + (v.stock || 0));
  }
  return Array.from(agg.entries()).map(([key, stock]) => {
    const [cStr, lStr] = key.replace(/^c/, "").split("-l");
    return { chest_cm: Number(cStr), length_cm: Number(lStr), stock: Number(stock) };
  });
}

function sumStockFromMeasures(mv = []) {
  return (Array.isArray(mv) ? mv : []).reduce((a, b) => a + Number(b?.stock || 0), 0);
}

// ==================== CATEGORIES CRUD ====================
app.get('/api/admin/categories', async (req, res) => {
  try {
    const q = `SELECT id, name FROM categories ORDER BY id ASC`;
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'กรุณากรอกชื่อหมวดหมู่' });

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ==================== PRODUCTS CRUD ====================
app.get('/api/admin/products', async (req, res) => {
  try {
    const q = `
      SELECT id, name, price, stock, category_id, description, image,images_json, status,
             measure_variants, created_at, updated_at
      FROM products
      ORDER BY id DESC
    `;
    const result = await pool.query(q);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('GET /products error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ===================== Helpers (MV/Stock) ===================== */
// ถ้ามี toNum/toInt อยู่แล้ว ข้ามส่วนนี้ได้
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// แปลง/ทำความสะอาด measure_variants ให้เป็นรูปแบบกลาง
function normalizeMV(mvRaw) {
  let mv = mvRaw;
  if (!mv) return [];
  if (typeof mv === 'string') { try { mv = JSON.parse(mv); } catch { mv = []; } }
  if (!Array.isArray(mv)) return [];
  return mv.map(v => ({
    chest_in:  Number.isFinite(Number(v?.chest_in ?? v?.chest ?? v?.chest_cm)) ? Number(v?.chest_in ?? v?.chest ?? v?.chest_cm) : null,
    length_in: Number.isFinite(Number(v?.length_in ?? v?.length ?? v?.length_cm)) ? Number(v?.length_in ?? v?.length ?? v?.length_cm) : null,
    stock:     Number(v?.stock ?? 0),
  }));
}

// รวม stock จาก measure_variants
function stockFromMV(mv) {
  return (Array.isArray(mv) ? mv : []).reduce((a, v) => a + Number(v?.stock || 0), 0);
}


function sumStockFromMeasures(mv) { return stockFromMV(normalizeMV(mv)); }

// ===== helpers: measure variants =====
function parseMeasureVariants(input, body = {}) {
  let mv = input;
  if (!mv && (body?.chest_in || body?.length_in)) {
    // กรณีมาจาก form field array เช่น chest_in[], length_in[], stock[]
    const chestArr  = [].concat(body.chest_in || body.chest || body.chest_cm || []);
    const lengthArr = [].concat(body.length_in || body.length || body.length_cm || []);
    const stockArr  = [].concat(body.stock || []);
    mv = chestArr.map((c, idx) => ({
      chest_in:  toInt(c),
      length_in: toInt(lengthArr[idx]),
      stock:     toInt(stockArr[idx]),
    }));
  } else {
    if (typeof mv === "string") {
      try { mv = JSON.parse(mv); } catch { mv = null; }
    }
  }
  if (!Array.isArray(mv)) return [];
  return mv.map(v => ({
    chest_in:  toInt(v?.chest_in ?? v?.chest ?? v?.chest_cm ?? v?.อก),
    length_in: toInt(v?.length_in ?? v?.length ?? v?.length_cm ?? v?.ยาว),
    stock:     toInt(v?.stock),
  })).filter(v => Number.isFinite(v.chest_in) && Number.isFinite(v.length_in));
}
app.post('/api/admin/products', productUploadFields, async (req, res) => {
  try {
    const { name, price, stock, category_id, description } = req.body;
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'ชื่อสินค้าเป็นค่าว่างไม่ได้' });
    }

    const mv = parseMeasureVariants(req.body.measureVariants, req.body);
    const totalStock = mv.length > 0 ? sumStockFromMeasures(mv) : toInt(stock);

    // ✅ ประมวลผลรูปจาก buffer ด้วย sharp
    const files = req.files || {};
    let coverUrl = null;
    const galleryUrls = [];

    // ปก
    if (files.image?.[0]) {
      coverUrl = await saveWebp(files.image[0].buffer, {
        dir: productDir,
        maxW: 1280,
        maxH: 1280,
        quality: 82,
        prefix: 'product_cover'
      });
    }

    // แกลเลอรี
    if (files.images?.length) {
      for (const f of files.images) {
        const url = await saveWebp(f.buffer, {
          dir: productDir,
          maxW: 1600,
          maxH: 1600,
          quality: 82,
          prefix: 'product_img'
        });
        galleryUrls.push(url);
      }
    }

    // ถ้าไม่มี cover แต่มี gallery → ใช้รูปแรกเป็น cover
    const finalCover = coverUrl || galleryUrls[0] || null;

    const q = `
      INSERT INTO products (
        name, price, stock, category_id, description,
        image, images_json, status, measure_variants, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8::jsonb,NOW(),NOW())
      RETURNING *
    `;
    const params = [
      String(name).trim(),
      toNum(price) ?? 0,
      totalStock,
      category_id ? Number(category_id) : null,
      description || '',
      finalCover,
      JSON.stringify(galleryUrls),
      mv.length ? JSON.stringify(mv) : null,
    ];
    const result = await pool.query(q, params);
    return res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('POST /products error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
app.put('/api/admin/products/:id', productUploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, category_id, description, oldImage, keepImages } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'ชื่อสินค้าเป็นค่าว่างไม่ได้' });
    }

    // ของเดิม
    const cur = await pool.query('SELECT image, images_json FROM products WHERE id=$1', [Number(id)]);
    if (!cur.rowCount) return res.status(404).json({ message: 'ไม่พบสินค้า' });

    let cover = cur.rows[0].image || null;
    let gallery = [];
    try { gallery = JSON.parse(cur.rows[0].images_json || '[]'); } catch { gallery = []; }

    // ✅ keepImages: array ของ URL ที่ client ต้องการเก็บไว้
    let kept = gallery;
    try {
      if (typeof keepImages === 'string') kept = JSON.parse(keepImages || '[]');
      else if (Array.isArray(keepImages)) kept = keepImages;
    } catch {/* ignore */}

    // รูปใหม่จากอัปโหลด (แปลงผ่าน sharp)
    const files = req.files || {};
    const newGallery = [];

    if (files.images?.length) {
      for (const f of files.images) {
        const url = await saveWebp(f.buffer, {
          dir: productDir,
          maxW: 1600,
          maxH: 1600,
          quality: 82,
          prefix: 'product_img'
        });
        newGallery.push(url);
      }
    }

    // รวมแกลเลอรี: kept + ของใหม่
    gallery = [...kept, ...newGallery];

    // cover: ลำดับความสำคัญ ไฟล์ใหม่ > oldImage > รูปแรกใน gallery
    if (files.image?.[0]) {
      cover = await saveWebp(files.image[0].buffer, {
        dir: productDir,
        maxW: 1280,
        maxH: 1280,
        quality: 82,
        prefix: 'product_cover'
      });
    } else if (oldImage) {
      cover = oldImage;
    } else if (!cover || !gallery.includes(cover)) {
      cover = gallery[0] || null;
    }

    // stock จาก measure variants
    const mvRaw  = parseMeasureVariants(req.body.measureVariants, req.body);
    const mvNorm = normalizeMV(mvRaw);
    const totalStock = mvNorm.length > 0 ? stockFromMV(mvNorm) : toInt(stock);

    const q = `
      UPDATE products
      SET name=$1, price=$2, stock=$3, category_id=$4, description=$5,
          image=$6, images_json=$7, measure_variants=$8::jsonb, updated_at=NOW()
      WHERE id=$9
      RETURNING *`;
    const params = [
      String(name).trim(),
      toNum(price) ?? 0,
      totalStock,
      category_id ? Number(category_id) : null,
      description || '',
      cover,
      JSON.stringify(gallery),
      mvNorm.length ? JSON.stringify(mvNorm) : null,
      Number(id),
    ];
    const result = await pool.query(q, params);
    if (!result.rowCount) return res.status(404).json({ message: 'ไม่พบสินค้า' });

    return res.status(200).json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('PUT /products error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า' });
  }
});
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสสินค้าไม่ถูกต้อง' });

    const result = await pool.query('DELETE FROM products WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'ไม่พบสินค้า' });

    return res.status(200).json({ success: true, message: 'ลบสำเร็จ' });
  } catch (err) {
    console.error('DELETE /products error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const q = `
      SELECT id, name, price, stock, description, image, category_id, measure_variants, images_json
      FROM products
      WHERE category_id = $1
      ORDER BY id DESC`;
    const result = await pool.query(q, [categoryId]);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET /products/by-category error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT id, name, price, stock, description, image, category_id, measure_variants, images_json
      FROM products
      WHERE id = $1`;
    const result = await pool.query(q, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("GET /products/:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});



/* ===================== Helpers (Stock) ===================== */
const _toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function _normalizeMV(mvRaw) {
  let mv = mvRaw;
  if (!mv) return [];
  if (typeof mv === 'string') { try { mv = JSON.parse(mv); } catch { mv = []; } }
  if (!Array.isArray(mv)) return [];
  return mv.map(v => ({
    // ✅ เก็บ size ไว้ด้วยเพื่อให้เทียบได้
    size:      v?.size ?? null,
    chest_in:  _toNum(v?.chest_in ?? v?.chest ?? v?.chest_cm),
    length_in: _toNum(v?.length_in ?? v?.length ?? v?.length_cm),
    stock:     Number(v?.stock ?? 0),
  }));
}

function _stockFromMV(mv) {
  return (Array.isArray(mv) ? mv : []).reduce((a, v) => a + Number(v?.stock || 0), 0);
}

/* ===================== คืนสต๊อกทีละ product ===================== */
async function _restockItems(client, items) {
  for (const it of items) {
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const pQ = await client.query(
      `SELECT id, stock, measure_variants
         FROM products
        WHERE id=$1
        FOR UPDATE`,
      [it.product_id]
    );
    if (!pQ.rowCount) continue;

    const prod = pQ.rows[0];
    let mv = _normalizeMV(prod.measure_variants);

    // หา index ที่ต้องคืนสต๊อก
    let idx = -1;

    // 1) เทียบตาม size ตรง ๆ ก่อน
    if (it.size) {
      const s = String(it.size).trim().toLowerCase();
      idx = mv.findIndex(v => String(v.size || '').toLowerCase() === s);
    }
    // 2) ถ้าไม่เจอ ให้เทียบตามอก/ยาว (นิ้ว)
    if (idx < 0 && it.chest != null && it.length != null) {
      idx = mv.findIndex(v =>
        _toNum(v.chest_in) === _toNum(it.chest) &&
        _toNum(v.length_in) === _toNum(it.length)
      );
    }

    if (idx >= 0) {
      mv[idx].stock = Number(mv[idx].stock || 0) + qty;
    } else {
      // ไม่เจอช่อง → สร้างช่องใหม่ตามข้อมูลที่มี
      mv.push({
        size: it.size || null,
        chest_in: _toNum(it.chest),
        length_in: _toNum(it.length),
        stock: qty
      });
    }

    const total = _stockFromMV(mv);
    await client.query(
      `UPDATE products
          SET stock=$1,
              measure_variants=$2::jsonb,
              updated_at=NOW()
        WHERE id=$3`,
      [total, mv.length ? JSON.stringify(mv) : null, it.product_id]
    );
  }
}

/* ===================== โหลด order_items ===================== */
async function _loadOrderItemsForCancel(client, orderId) {
  const itQ = await client.query(
    `SELECT product_id, quantity, size, measures
       FROM order_items
      WHERE order_id=$1`,
    [orderId]
  );
  return itQ.rows.map(r => {
    let m = r.measures;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = {}; } }
    m = m || {};
    const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);
    return {
      product_id: r.product_id,
      quantity: Number(r.quantity || 0),
      size: r.size ? String(r.size).trim() : null,
      chest: num(m.chest_in ?? m.chest ?? m.chest_cm),
      length: num(m.length_in ?? m.length ?? m.length_cm),
    };
  });
}

// ✅ ผู้ใช้ยกเลิก (คืนสต๊อกเสมอ)
async function _cancelOrderHandler(req, res) {
  const client = await pool.connect();
  try {
    const orderId = Number(req.params.id);
    const reason  = (req.body?.reason || '').trim() || null; // << เพิ่มบรรทัดนี้
    if (!Number.isFinite(orderId)) return res.status(400).json({ message: 'invalid order id' });

    await client.query('BEGIN');

    const oQ = await client.query(
      `SELECT id, status, cancelled_restocked_at
         FROM orders
        WHERE id=$1
        FOR UPDATE`,
      [orderId]
    );
    if (!oQ.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'ไม่พบออเดอร์' }); }
    const order = oQ.rows[0];

    if (!['pending','ready_to_ship'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'สถานะนี้ยกเลิกไม่ได้' });
    }

    // คืนสต๊อก (ของผู้ใช้ให้คืนเสมอ)
    const items = await _loadOrderItemsForCancel(client, orderId);
    await _restockItems(client, items);

    // ✅ บันทึกเหตุผล + ผู้ยกเลิก + เวลา
    const upd = await client.query(
      `UPDATE orders
          SET status='cancelled',
              cancel_reason        = COALESCE($2, cancel_reason),
              cancelled_by         = COALESCE(cancelled_by, 'buyer'),
              cancelled_at         = COALESCE(cancelled_at, NOW()),
              cancelled_restocked_at = COALESCE(cancelled_restocked_at, NOW()),
              updated_at           = NOW()
        WHERE id=$1
        RETURNING id, status, cancel_reason, cancelled_by, cancelled_at, cancelled_restocked_at`,
      [orderId, reason]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      status: upd.rows[0].status,
      cancel_reason: upd.rows[0].cancel_reason,
      cancelled_by: upd.rows[0].cancelled_by,
      cancelled_at: upd.rows[0].cancelled_at,
      cancelled_restocked_at: upd.rows[0].cancelled_restocked_at
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกออเดอร์' });
  } finally {
    client.release();
  }
}
// ✅ ให้ผู้ใช้ยกเลิกออเดอร์ได้
app.patch('/api/orders/:id/cancel', _cancelOrderHandler);
app.put('/api/orders/:id/cancel', _cancelOrderHandler); // เผื่อบางที่เรียก PUT

app.patch('/api/admin/orders/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    const orderId = Number(req.params.id);
    const restock = !!req.body?.restock;
    const reason  = (req.body?.reason || '').trim() || null;

    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ message: 'invalid order id' });
    }

    await client.query('BEGIN');

    // โหลด order
    const oQ = await client.query(
      `SELECT id, status, cancelled_restocked_at
         FROM orders
        WHERE id=$1
        FOR UPDATE`,
      [orderId]
    );
    if (!oQ.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบออเดอร์' });
    }
    const order = oQ.rows[0];

    if (!['pending','ready_to_ship'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'สถานะนี้ยกเลิกไม่ได้' });
    }

    // ✅ คืนสต๊อกถ้า admin เลือก restock และยังไม่เคยคืน
    if (restock && !order.cancelled_restocked_at) {
      const items = await _loadOrderItemsForCancel(client, orderId);
      await _restockItems(client, items);
    }

    const upd = await client.query(
      `UPDATE orders
          SET status='cancelled',
              cancel_reason        = COALESCE($2, cancel_reason),
              cancelled_by         = 'admin',
              cancelled_at         = COALESCE(cancelled_at, NOW()),
              cancelled_restocked_at = CASE
                WHEN $3::boolean = true AND cancelled_restocked_at IS NULL THEN NOW()
                ELSE cancelled_restocked_at
              END,
              updated_at           = NOW()
        WHERE id=$1
        RETURNING id, status, cancel_reason, cancelled_by, cancelled_at, cancelled_restocked_at`,
      [orderId, reason, restock]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      status: upd.rows[0].status,
      cancel_reason: upd.rows[0].cancel_reason,
      cancelled_by: upd.rows[0].cancelled_by,
      cancelled_at: upd.rows[0].cancelled_at,
      cancelled_restocked_at: upd.rows[0].cancelled_restocked_at,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกออเดอร์' });
  } finally {
    client.release();
  }
});

// ===== util =====
const crypto = require('crypto');

const SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE_STANDARD = 50;
const SHIPPING_FEE_EXPRESS = 80;

function genOrderCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `OD-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// ใช้หน่วยนิ้วเป็นหลัก (รองรับข้อมูลเก่าที่เป็น *_cm)
function parseMeasureVariants(input) {
  let mv = input;
  if (!mv) return [];
  if (typeof mv === 'string') {
    try { mv = JSON.parse(mv); } catch { mv = null; }
  }
  if (!Array.isArray(mv)) return [];
  return mv
    .map(v => ({
      chest_in:  Number(v?.chest_in  ?? v?.chest  ?? v?.chest_cm),
      length_in: Number(v?.length_in ?? v?.length ?? v?.length_cm),
      stock:     Number(v?.stock ?? 0),
    }))
    .filter(v => Number.isFinite(v.chest_in) && Number.isFinite(v.length_in));
}

const mvKey = (c, l) => `c${Number(c)}-l${Number(l)}`;

// กัน “นิ้ว นิ้ว”
function cleanSizeLabel(s) {
  if (!s) return s;
  let out = String(s).trim();
  out = out.replace(/\s*นิ้ว\s*นิ้ว\s*$/u, ' นิ้ว');
  out = out.replace(/\s*นิ้ว\s*$/u, ' นิ้ว');
  return out;
}

// ====================== PUBLIC: สร้างคำสั่งซื้อ (รองรับ อก/ยาว แบบนิ้ว) ======================
app.post('/api/orders', async (req, res) => {
  const {
    userId, email,
    items = [],                 // [{ id, qty, size, variantKey, measures:{chest_in,length_in} }]
    shippingMethod, paymentMethod,
    address = {}, note = ''
  } = req.body || {};

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'ไม่มีรายการสินค้า' });
    }
    if (!shippingMethod || !paymentMethod) {
      return res.status(400).json({ message: 'กรุณาเลือกวิธีจัดส่งและวิธีชำระเงิน' });
    }

    const ids = [...new Set(items.map(i => Number(i.id)).filter(Boolean))];
    if (ids.length === 0) return res.status(400).json({ message: 'รายการสินค้าไม่ถูกต้อง' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // lock สินค้า + measure_variants
      const prodRes = await client.query(
        `SELECT id, name, price, stock, image, measure_variants
           FROM products
          WHERE id = ANY($1)
          FOR UPDATE`,
        [ids]
      );
      const prodMap = new Map(prodRes.rows.map(r => [Number(r.id), r]));

      let subtotal = 0;
      let totalQty = 0;
      const orderItems = [];

      const parseMV = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
      };

      // ตรวจสต็อก + สะสมยอด
      for (const it of items) {
        const pid = Number(it.id);
        const qty = Number(it.qty || 1);
        if (!pid || qty <= 0) throw new Error('ข้อมูลสินค้าไม่ถูกต้อง');

        const dbp = prodMap.get(pid);
        if (!dbp) throw new Error(`ไม่พบสินค้า id=${pid}`);

        const mvArr = parseMV(dbp.measure_variants);
        const unit = Number(dbp.price || 0);

        // อ่านค่าที่ client ส่งมา (นิ้ว) — รองรับ payload เก่า *_cm
        const chest  = Number(it?.measures?.chest_in  ?? it?.measures?.chest_cm  ?? NaN);
        const length = Number(it?.measures?.length_in ?? it?.measures?.length_cm ?? NaN);

        let picked = false;
        if (Number.isFinite(chest) && Number.isFinite(length) && mvArr.length > 0) {
          // หา variant อก/ยาว เท่ากัน (รองรับ key เก่า)
          const idx = mvArr.findIndex(v =>
            Number(v?.chest_in  ?? v?.chest  ?? v?.chest_cm)  === chest &&
            Number(v?.length_in ?? v?.length ?? v?.length_cm) === length
          );
          if (idx === -1) {
            throw new Error(`ไม่พบสต็อก อก ${chest} / ยาว ${length} ของสินค้า ${dbp.name}`);
          }
          const cur = Number(mvArr[idx]?.stock ?? 0);
          if (cur < qty) {
            throw new Error(`สต็อกไม่พอสำหรับ ${dbp.name} (อก ${chest} / ยาว ${length}) เหลือ ${cur}`);
          }
          // หักชั่วคราวในหน่วยความจำ
          mvArr[idx].stock = cur - qty;
          dbp.__mv_after = mvArr;
          picked = true;
        }

        // ไม่แยกไซซ์ → ใช้สต็อกรวม
        if (!picked) {
          const left = Number(dbp.stock || 0);
          if (left < qty) throw new Error(`สต็อกไม่พอสำหรับ ${dbp.name} (คงเหลือ ${left})`);
          dbp.__stock_after = left - qty;
        }

        // label ไซซ์ (กัน “นิ้ว นิ้ว”)
        let sizeLabel = null;
        if (it.size && String(it.size).trim()) {
          sizeLabel = cleanSizeLabel(it.size);
        } else if (Number.isFinite(chest) && Number.isFinite(length)) {
          sizeLabel = cleanSizeLabel(`อก ${chest} / ยาว ${length} นิ้ว`);
        }

        const lineTotal = unit * qty;
        subtotal += lineTotal;
        totalQty += qty;

        // เก็บไว้รอ insert order_items (ยังไม่ต้องมี order_id ตรงนี้)
        orderItems.push({
          product_id: pid,
          name: dbp.name,
          size: sizeLabel,
          unit_price: unit,
          qty,
          line_total: lineTotal,
          image: dbp.image || null,
          variant_key: it.variantKey ?? null,
          measures: (Number.isFinite(chest) && Number.isFinite(length))
            ? { chest_in: chest, length_in: length }
            : null,
        });
      }

      // ค่าขนส่ง
      let shipping = 0;
      if (shippingMethod === 'express') shipping = SHIPPING_FEE_EXPRESS;
      else shipping = (subtotal === 0 || subtotal >= SHIPPING_THRESHOLD) ? 0 : SHIPPING_FEE_STANDARD;

      const total = subtotal + shipping;
      const paymentStatus = (paymentMethod === 'cod') ? 'unpaid' : 'submitted';

     // บันทึก orders
const orderCode = genOrderCode();
const ordRes = await client.query(
  `INSERT INTO orders
     (order_code, user_id, email, full_name, phone, address_line,
      district, province, postcode, subdistrict,
      shipping_method, payment_method, payment_status,
      subtotal, shipping, total_price, total_qty, note, status, created_at)
   VALUES
     ($1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,
      $11,$12,$13,
      $14,$15,$16,$17,$18,'pending', NOW())
   RETURNING id, order_code`,
  [
    orderCode,
    userId ?? null,
    email ?? null,
    address.fullName ?? null,
    address.phone ?? null,
    address.addressLine ?? null,
    address.district ?? null,
    address.province ?? null,
    address.postcode ?? null,
    address.subdistrict ?? null,       // << ใส่ค่าตำบลตรงนี้

    shippingMethod,
    paymentMethod,
    paymentStatus,

    subtotal,
    shipping,
    total,
    totalQty,
    note || ''
  ]
);

      const orderId = ordRes.rows[0].id;

     // บันทึก order_items (ใส่ orderId ตรงนี้)
const insertItem = `
  INSERT INTO order_items (
    order_id, product_id, name, size,
    unit_price,
    quantity, line_total, image, variant_key, measures
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
`;

for (const oi of orderItems) {
  await client.query(insertItem, [
    orderId,            // $1
    oi.product_id,      // $2
    oi.name,            // $3
    oi.size,            // $4
    oi.unit_price,      // $5
    oi.qty,             // $6
    oi.line_total,      // $7
    oi.image,           // $8
    oi.variant_key,     // $9
    oi.measures ? JSON.stringify(oi.measures) : null, // $10
  ]);
}

      // อัปเดตสต็อกจริงใน products
      for (const pid of ids) {
        const dbp = prodMap.get(pid);
        if (dbp.__mv_after) {
          const newJson = JSON.stringify(dbp.__mv_after);
          const sumLeft = dbp.__mv_after.reduce((s, v) => s + Number(v?.stock || 0), 0);
          await client.query(
            `UPDATE products
                SET measure_variants = $1,
                    stock = $2,
                    updated_at = NOW()
              WHERE id = $3`,
            [newJson, sumLeft, pid]
          );
        } else if (typeof dbp.__stock_after === 'number') {
          await client.query(
            `UPDATE products
                SET stock = $1, updated_at = NOW()
              WHERE id = $2`,
            [dbp.__stock_after, pid]
          );
        }
      }

      await client.query('COMMIT');
      return res.status(201).json({ orderId, orderCode });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('POST /api/orders error:', e);
      return res.status(400).json({ message: e.message || 'สร้างคำสั่งซื้อไม่สำเร็จ' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/orders fatal:', err);
    return res.status(500).json({ message: 'สร้างคำสั่งซื้อไม่สำเร็จ' });
  }
});



// ================== 1) รายการออเดอร์ (สั้น) — รวมชำระเงิน + tracking ==================
app.get("/api/admin/orders", async (req, res) => {
  try {
    const q = `
      SELECT
  o.id, o.order_code, o.full_name, o.email, o.total_price, o.status, o.created_at,
  o.payment_status, o.slip_image, o.tracking_carrier, o.tracking_code,
  o.cancel_reason, o.cancelled_by, o.cancelled_at,
  u.email AS buyer_email
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC
    `;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error("GET /api/admin/orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ========== 2) รายละเอียดออเดอร์ + รายการสินค้า — รวมชำระเงิน + tracking ==========
app.get('/api/admin/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ordQ = `
      SELECT id, order_code, user_id, email,
       full_name, phone, address_line, district, subdistrict, province, postcode,
       shipping_method, payment_method,
       subtotal, shipping, total_price, total_qty, note,
       status, created_at,
       payment_status, paid_at, payment_amount, slip_image,
       tracking_carrier, tracking_code,
       cancel_reason, cancelled_by, cancelled_at
FROM orders
WHERE id = $1
    `;
    const ordR = await pool.query(ordQ, [id]);
    if (ordR.rowCount === 0) return res.status(404).json({ message: "ไม่พบออเดอร์" });

    const itemsQ = `
      SELECT id, product_id, name, size, unit_price, quantity, line_total, image
      FROM order_items
      WHERE order_id = $1
    `;
    const itemsR = await pool.query(itemsQ, [id]);

    res.json({ order: ordR.rows[0], items: itemsR.rows });
  } catch (err) {
    console.error("GET /api/admin/orders/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// เปลี่ยนสถานะออเดอร์
app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allow = ["pending", "ready_to_ship", "paid", "shipped", "done", "cancelled"];
    if (!allow.includes(status)) return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });

    let q, params;

    if (status === "done") {
      // ถ้ากดสำเร็จ -> ปักสถานะชำระเงินเป็น paid ด้วย
      q = `
        UPDATE orders
        SET status = $1,
            payment_status = CASE
              WHEN payment_status <> 'paid' THEN 'paid'
              ELSE payment_status
            END,
            paid_at = CASE
              WHEN payment_status <> 'paid' THEN NOW()
              ELSE paid_at
            END
        WHERE id = $2
        RETURNING id, status, payment_status, paid_at
      `;
      params = [status, id];
    } else {
      q = `
        UPDATE orders
        SET status = $1
        WHERE id = $2
        RETURNING id, status, payment_status, paid_at
      `;
      params = [status, id];
    }

    const r = await pool.query(q, params);
    if (r.rowCount === 0) return res.status(404).json({ message: "ไม่พบออเดอร์" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/orders/:id/status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ลบ txid ออกไปให้หมด เหลือแค่ amount + slip image
app.post('/api/orders/:id/upload-slip', slipUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {};          // ✅ เหลือแค่นี้

    const f = req.files?.image?.[0] || req.files?.file?.[0];
    if (!f) return res.status(400).json({ message: 'กรุณาแนบสลิป' });

    const filename = `slip_${Date.now()}_${Math.random().toString(36).slice(2,7)}.webp`;
    const outPath  = path.join(slipDir, filename);

    await sharp(f.buffer)
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);

    const img = `/uploads/slips/${filename}`;

    // ✅ ตัด payment_txid ออก, อัปเดตเฉพาะรูป + amount + สถานะ
    const q = `
      UPDATE orders
         SET slip_image = $1,
             payment_amount = COALESCE($2, payment_amount),
             payment_status = 'submitted',
             updated_at = NOW()
       WHERE id = $3
       RETURNING id, order_code, payment_status, slip_image, payment_amount
    `;
    const r = await pool.query(q, [
      img,
      amount ? Number(amount) : null,
      id
    ]);

    if (!r.rowCount) return res.status(404).json({ message: 'ไม่พบออเดอร์' });
    res.json(r.rows[0]);

  } catch (e) {
    console.error('upload-slip error', e);
    res.status(500).json({ message: 'อัปโหลดสลิปไม่สำเร็จ' });
  }
});

// ======================== 5) แอดมินยืนยันรับเงิน (→ ready_to_ship) ========================
// ======================== 5) แอดมินยืนยันรับเงิน (→ ready_to_ship) ========================
app.patch('/api/admin/orders/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {}; // ✅ เหลือแค่ amount

    const q = `
      UPDATE orders
      SET payment_status = 'paid',
          paid_at        = NOW(),
          payment_amount = COALESCE($1, payment_amount),
          status         = 'ready_to_ship'
      WHERE id = $2
      RETURNING id, status, payment_status, paid_at, payment_amount
    `;

    const r = await pool.query(q, [amount ? Number(amount) : null, id]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'ไม่พบออเดอร์' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('mark-paid error', e);
    res.status(500).json({ message: 'ยืนยันรับเงินไม่สำเร็จ' });
  }
});

// ============================= 6) แอดมินปฏิเสธสลิป =============================
app.patch('/api/admin/orders/:id/reject-slip', async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      UPDATE orders
      SET payment_status='rejected'
      WHERE id=$1
      RETURNING id, payment_status
    `;
    const r = await pool.query(q, [id]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'ไม่พบออเดอร์' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('reject-slip error', e);
    res.status(500).json({ message: 'ปฏิเสธสลิปไม่สำเร็จ' });
  }
});


app.patch("/api/admin/orders/:id/tracking", async (req, res) => {
  try {
    const { id } = req.params;
    let { tracking_carrier, tracking_code } = req.body || {};

    // ค่าว่าง -> null
    const norm = (v) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    };
    tracking_carrier = norm(tracking_carrier);
    tracking_code = norm(tracking_code);

    const allowCarriers = new Set(["thailandpost", "kerry", "flash", "jnt", "best", "ninjavan"]);
    if (tracking_carrier && !allowCarriers.has(tracking_carrier.toLowerCase())) {
      return res.status(400).json({ message: "ค่ายขนส่งไม่ถูกต้อง" });
    }

    const q = `
      UPDATE orders
      SET tracking_carrier = $1::text,
          tracking_code    = $2::text,
          status = CASE
                     WHEN ($2::text IS NOT NULL) AND status IN ('paid','ready_to_ship') THEN 'shipped'
                     ELSE status
                   END
      WHERE id = $3::int
      RETURNING id, status, tracking_carrier, tracking_code
    `;
    const r = await pool.query(q, [tracking_carrier, tracking_code, id]);
    if (r.rowCount === 0) return res.status(404).json({ message: "ไม่พบออเดอร์" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/orders/:id/tracking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// ==================== ORDERS API ====================
// ==================== ORDERS API ====================

// ✅ เหลืออันนี้อันเดียว
app.get('/api/my-orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const userId = req.user.id; // ดึงจาก JWT

    const ordQ = `
      SELECT id, order_code, user_id, email,
             full_name, phone, address_line, district, subdistrict, province, postcode,
             shipping_method, payment_method,
             subtotal, shipping, total_price, total_qty, note,
             status, created_at,
             payment_status, paid_at, payment_amount, slip_image,
             tracking_carrier, tracking_code,
             cancel_reason, cancelled_by, cancelled_at
      FROM orders
      WHERE id = $1 AND user_id = $2
    `;
    const ordR = await pool.query(ordQ, [orderId, userId]);
    if (ordR.rowCount === 0)
      return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });

    const itemsQ = `
      SELECT id, product_id, name, size, unit_price, quantity, line_total, image
      FROM order_items
      WHERE order_id = $1
    `;
    const itemsR = await pool.query(itemsQ, [orderId]);

    res.json({ order: ordR.rows[0], items: itemsR.rows });
  } catch (err) {
    console.error('GET /api/my-orders/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2️⃣ GET /api/orders/:id (สำรองให้ React)
app.get('/api/orders/:id', (req, res) => {
  // ✅ redirect ไป route ข้างบน พร้อมพารามิเตอร์ query เดิม
  const queryString = new URLSearchParams(req.query).toString();
  const targetUrl = `/api/my-orders/${req.params.id}${queryString ? `?${queryString}` : ''}`;
  res.redirect(307, targetUrl); // ใช้ 307 เพื่อคง method เดิม (GET)
});


app.get('/api/my-orders', async (req, res) => {
  let userId = req.query.userId;
  let email  = req.query.email;

  // บังคับให้เป็น null ถ้าไม่ใช่ตัวเลข
  userId = userId && !isNaN(userId) ? Number(userId) : null;
  email  = email && String(email).trim() !== '' ? String(email).trim() : null;

  if (!userId && !email) {
    return res.status(400).json({ message: 'ต้องส่ง userId หรือ email อย่างน้อยหนึ่งค่า' });
  }

  try {
    const head = await pool.query(
      `
      SELECT o.id AS order_id, o.order_code, o.created_at AS order_date,
             o.status, o.total_price AS total_amount,
             o.payment_method, o.payment_status, o.slip_image, o.payment_amount,o.shipping_method,
             o.tracking_carrier AS carrier, o.tracking_code,
             o.full_name AS receiver_name, o.phone AS receiver_phone,
             o.address_line, o.subdistrict, o.district, o.province, o.postcode,
             o.cancel_reason, o.cancelled_by, o.cancelled_at,
             COALESCE((SELECT SUM(oi.quantity)::int FROM order_items oi WHERE oi.order_id=o.id),0) AS total_items
      FROM orders o
      WHERE ($1::int IS NOT NULL AND o.user_id=$1)
         OR ($1::int IS NULL AND $2::text IS NOT NULL AND o.email=$2)
      ORDER BY o.created_at DESC
      `,
      [userId, email]
    );

    const orderIds = head.rows.map(r => r.order_id);
    if (orderIds.length === 0) return res.json([]);

    const items = await pool.query(
      `SELECT oi.id AS order_item_id, oi.order_id, oi.product_id, oi.name AS item_name,
              oi.image AS oi_image, p.image AS product_image,
              oi.size, oi.unit_price, oi.quantity, oi.line_total
       FROM order_items oi
       LEFT JOIN products p ON p.id=oi.product_id
       WHERE oi.order_id = ANY($1)
       ORDER BY oi.id ASC`,
      [orderIds]
    );

    const normalizeImage = (raw) => {
      if (!raw) return null;
      let s = String(raw).trim().replace(/\\/g, '/');
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith('/uploads/')) return s;
      return '/uploads/' + s.replace(/^\/+/, '');
    };

    const map = new Map(orderIds.map(id => [String(id), []]));
    for (const r of items.rows) {
      const img = normalizeImage(r.oi_image || r.product_image);
      map.get(String(r.order_id))?.push({ ...r, item_image: img });
    }

    const out = head.rows.map(ord => ({
      ...ord,
      items: map.get(String(ord.order_id)) || []
    }));

    res.json(out);
  } catch (e) {
    console.error('GET /api/my-orders error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// === ช่วยอ่านช่วงวัน ===
function range(req) {
  const from = req.query.from || '2000-01-01';
  const to   = req.query.to   || '2999-12-31';
  return [from, to];
}

// นับยอดเฉพาะออเดอร์ที่ถือว่าเสร็จ/คิดเงินแล้ว
const PAID_STATUSES = `('paid','shipped','done')`;

// ใช้ยอดต่อบรรทัดแบบปลอดภัย: line_total ถ้ามีใช้เลย ไม่มีก็ quantity
const LINE_EXPR = `
  COALESCE(
    oi.line_total,
    oi.unit_price * oi.quantity,
    0
  )::numeric
`;

/* ============ ADMIN METRICS ============ */
// 1) OVERVIEW
app.get('/api/admin/metrics/overview', async (req, res) => {
  try {
    const [from, to] = range(req);

    const q = `
      WITH per_order AS (
        SELECT
          o.id,
          COALESCE(SUM(${LINE_EXPR}), 0) AS items_total, 
          COALESCE(o.shipping, 0)::numeric AS shipping
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status IN ${PAID_STATUSES}
          AND o.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY o.id, o.shipping
      )
      SELECT
        COALESCE(SUM(items_total + shipping), 0) AS total_revenue,
        COUNT(*)::int AS orders_count
      FROM per_order
    `;

    const [agg, customersQ] = await Promise.all([
      pool.query(q, [from, to]),
      pool.query(
        `SELECT COUNT(DISTINCT LOWER(TRIM(o.email)))::int AS customers
           FROM orders o
          WHERE o.status IN ${PAID_STATUSES}
            AND o.created_at::date BETWEEN $1::date AND $2::date
            AND COALESCE(NULLIF(TRIM(o.email), ''), '') <> ''`,
        [from, to]
      )
    ]);

    res.json({
      total_revenue: Number(agg.rows[0]?.total_revenue || 0),
      orders_count : Number(agg.rows[0]?.orders_count  || 0),
      customers    : Number(customersQ.rows[0]?.customers || 0),
    });
  } catch (e) {
    console.error('metrics/overview error:', e);
    res.status(500).json({ message: 'Server error: overview' });
  }
});


// GET /api/admin/metrics/sales-series?group=month&ym=2025-10
app.get('/api/admin/metrics/sales-series', async (req, res) => {
  try {
    const group = String(req.query.group || 'day').toLowerCase(); // 'day' | 'month'
    const range = String(req.query.range || '7d').toLowerCase();  // สำหรับ group=day: '7d' | '30d'
    const ym    = String(req.query.ym || '').trim();              // สำหรับ group=month: 'YYYY-MM'

 

    if (group === 'day') {
      const days = range === '30d' ? 30 : 7;
      const { rows } = await pool.query(
        `
        WITH dates AS (
          SELECT generate_series(
            (now() AT TIME ZONE 'Asia/Bangkok')::date - ($1::int - 1),
            (now() AT TIME ZONE 'Asia/Bangkok')::date,
            '1 day'::interval
          )::date AS day
        ),
        -- รวมยอดสินค้า/ค่าส่งต่อ "ออเดอร์"
        per_order AS (
          SELECT
            o.id,
            o.created_at::date AS day,
            COALESCE(SUM(${LINE_EXPR}), 0) AS items_total,
            COALESCE(o.shipping, 0)::numeric AS shipping
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status IN ${PAID_STATUSES}
          GROUP BY o.id, o.created_at::date, o.shipping
        )
        SELECT
          d.day,
          COALESCE(SUM(p.items_total), 0)                   AS subtotal,
          COALESCE(SUM(p.shipping), 0)                      AS shipping,
          COALESCE(SUM(p.items_total + p.shipping), 0)      AS total
        FROM dates d
        LEFT JOIN per_order p ON p.day = d.day
        GROUP BY d.day
        ORDER BY d.day;
        `,
        [days]
      );
      return res.json(rows);
    }

    if (group === 'month') {
      const base = ym && /^\d{4}-\d{2}$/.test(ym)
        ? ym + '-01'
        : new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 7) + '-01';

      const { rows } = await pool.query(
        `
        WITH bounds AS (
          SELECT ($1::date) AS start_day,
                 (date_trunc('month', $1::date) + interval '1 month')::date AS next_month
        ),
        dates AS (
          SELECT generate_series((SELECT start_day FROM bounds),
                                 (SELECT next_month FROM bounds) - 1,
                                 '1 day'::interval)::date AS day
        ),
        per_order AS (
          SELECT
            o.id,
            o.created_at::date AS day,
            COALESCE(SUM(${LINE_EXPR}), 0) AS items_total,
            COALESCE(o.shipping, 0)::numeric AS shipping
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status IN ${PAID_STATUSES}
          GROUP BY o.id, o.created_at::date, o.shipping
        )
        SELECT
          d.day,
          COALESCE(SUM(p.items_total), 0)                   AS subtotal,
          COALESCE(SUM(p.shipping), 0)                      AS shipping,
          COALESCE(SUM(p.items_total + p.shipping), 0)      AS total
        FROM dates d
        LEFT JOIN per_order p ON p.day = d.day
        GROUP BY d.day
        ORDER BY d.day;
        `,
        [base]
      );
      return res.json(rows);
    }

    return res.status(400).json({ message: 'invalid group' });
  } catch (e) {
    console.error('metrics/sales-series error:', e);
    res.status(500).json({ message: 'Server error: sales-series' });
  }
});
// 2) SALES BY DAY
app.get('/api/admin/metrics/sales-by-day', async (req, res) => {
  try {
    const [from, to] = range(req);

    const q = `
      WITH per_order AS (
        SELECT
          o.id,
          o.created_at::date AS day,
          COALESCE(SUM(
            COALESCE(
              oi.line_total,
              oi.unit_price * oi.quantity,
              0
            )
          ), 0) AS items_total,
          COALESCE(o.shipping, 0)::numeric AS shipping
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status IN ${PAID_STATUSES}
          AND o.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY o.id, o.created_at::date, o.shipping
      )
      SELECT
        day,
        SUM(items_total)                     AS subtotal,
        SUM(shipping)                        AS shipping,
        SUM(items_total + shipping)          AS total
      FROM per_order
      GROUP BY day
      ORDER BY day
    `;
    const { rows } = await pool.query(q, [from, to]);
    res.json(rows);
  } catch (e) {
    console.error('metrics/sales-by-day error:', e);
    res.status(500).json({ message: 'Server error: sales-by-day' });
  }
});
app.get('/api/admin/metrics/sales-by-month', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const sql = `
    WITH months AS (SELECT generate_series(1,12) AS m)
    SELECT
      $1::int AS year,
      m.m     AS month,
      COALESCE(SUM(o.total_price),0)::numeric AS revenue,
      COUNT(DISTINCT CASE WHEN o.id      IS NOT NULL THEN o.id END)      AS orders,
      COUNT(DISTINCT CASE WHEN o.user_id IS NOT NULL THEN o.user_id END) AS customers
    FROM months m
    LEFT JOIN orders o
      ON EXTRACT(YEAR  FROM o.created_at) = $1
     AND EXTRACT(MONTH FROM o.created_at) = m.m
     AND o.status = 'done'
    GROUP BY m.m
    ORDER BY m.m;
  `;

  try {
    const { rows } = await pool.query(sql, [year]); // 👈 ใช้ pool แทน db
    res.json(rows.map(r => ({
      ym: `${r.year}-${String(r.month).padStart(2,'0')}`,
      month: Number(r.month),
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      customers: Number(r.customers),
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ success:false, message:'sales-by-month query failed' });
  }
});

// 3) TOP PRODUCTS

app.get('/api/admin/metrics/top-products', async (req, res) => {
  try {
    const [from, to] = range(req);
    const limit = Math.min(parseInt(req.query.limit || '5', 10), 50);

    const ORIGIN =
      process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;

    const buildImageUrl = (u) => {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;
      if (u.startsWith('/'))        return `${ORIGIN}${u}`;
      if (u.startsWith('uploads/')) return `${ORIGIN}/${u}`;
      return `${ORIGIN}/uploads/${u}`;
    };

    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        MIN(NULLIF(oi.image, ''))                AS image_any,  -- ✅ ใช้เฉพาะ oi.image
        SUM(oi.quantity)::int                    AS qty_sold,
        SUM(${LINE_EXPR})                        AS revenue
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products     p ON p.id = oi.product_id
      WHERE o.status IN ${PAID_STATUSES}
        AND o.created_at::date BETWEEN $1::date AND $2::date
      GROUP BY p.id, p.name
      ORDER BY qty_sold DESC NULLS LAST
      LIMIT $3
      `,
      [from, to, limit]
    );

    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      qty_sold: Number(r.qty_sold || 0),
      revenue: Number(r.revenue || 0),
      image_url: buildImageUrl(r.image_any),
    }));

    res.json(data);
  } catch (e) {
    console.error('metrics/top-products error:', e);
    res.status(500).json({ message: 'Server error: top-products' });
  }
});


// GET /api/admin/metrics/category-breakdown
app.get('/api/admin/metrics/category-breakdown', async (req, res) => {
  try {
    const [from, to] = range(req);

    const q = `
      /* 1) รวมยอดต่อ "ออเดอร์-หมวด" (เฉพาะยอดสินค้า) */
      WITH per_order_cat AS (
        SELECT
          o.id AS order_id,
          COALESCE(c.id, 0)                 AS category_id,
          COALESCE(c.name, 'Uncategorized') AS category,
          COALESCE(SUM(${LINE_EXPR}), 0)::numeric AS items_total_cat,
          COALESCE(SUM(oi.quantity), 0)::int       AS qty_cat,
          COALESCE(o.shipping, 0)::numeric         AS shipping
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products     p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE o.status IN ${PAID_STATUSES}
          AND o.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY o.id, c.id, c.name, o.shipping
      ),

      /* 2) รวมยอดสินค้า "ทั้งหมดของออเดอร์" ไว้เป็นตัวหาร */
      per_order_tot AS (
        SELECT
          order_id,
          COALESCE(SUM(items_total_cat), 0)::numeric AS items_total_all
        FROM per_order_cat
        GROUP BY order_id
      ),

      /* 3) กระจายค่าส่งตามสัดส่วนยอดสินค้าในออเดอร์นั้น ๆ */
      allocated AS (
        SELECT
          poc.category_id,
          poc.category,
          poc.qty_cat,
          poc.items_total_cat,
          /* สัดส่วน (หากทั้งออเดอร์ไม่มียอดสินค้าเลย → ให้สัดส่วนเป็น 0 เพื่อเลี่ยงหารศูนย์) */
          CASE
            WHEN pot.items_total_all > 0
            THEN (poc.items_total_cat / pot.items_total_all) * poc.shipping
            ELSE 0
          END AS shipping_alloc,
          /* รายได้รวมต่อหมวด = ยอดสินค้า + ค่าส่งที่จัดสรร */
          (poc.items_total_cat
             + CASE WHEN pot.items_total_all > 0
                    THEN (poc.items_total_cat / pot.items_total_all) * poc.shipping
                    ELSE 0
               END
          ) AS revenue
        FROM per_order_cat poc
        JOIN per_order_tot pot ON pot.order_id = poc.order_id
      )

      /* 4) สรุปรวมเป็นรายหมวด */
      SELECT
        category_id,
        category,
        SUM(qty_cat)::int           AS qty_sold,
        COALESCE(SUM(revenue), 0)   AS revenue
      FROM allocated
      GROUP BY category_id, category
      ORDER BY revenue DESC;
    `;

    const { rows } = await pool.query(q, [from, to]);
    res.json(rows);
  } catch (e) {
    console.error('metrics/category-breakdown error:', e);
    res.status(500).json({ message: 'Server error: category-breakdown' });
  }
});


// 5) RECENT ORDERS (10 ออเดอร์ล่าสุด + รายการสินค้า)
// 5) RECENT ORDERS (10 ออเดอร์ล่าสุด + รายการสินค้า)
app.get('/api/admin/metrics/recent-orders', async (req, res) => {
  try {
    const [from, to] = range(req);
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const { rows } = await pool.query(
      `
      WITH o10 AS (
        SELECT
          o.id,
          o.user_id,
          COALESCE(o.paid_at, o.created_at) AS order_time,
          o.status,
          COALESCE(o.shipping_method, '')   AS shipping_method,

          /* snapshot เผื่อ user ถูกลบ */
          COALESCE(NULLIF(o.full_name, ''), NULL) AS o_full_name,
          COALESCE(NULLIF(o.email, ''), NULL)     AS o_email,
          COALESCE(NULLIF(o.phone, ''), NULL)     AS o_phone,

          /* ✅ ฟิลด์ราคา */
          COALESCE(o.subtotal, 0)      AS subtotal,
          COALESCE(o.shipping, 0)      AS shipping,
          COALESCE(o.total_price, 0)   AS total_price
        FROM orders o
        WHERE o.status IN ${PAID_STATUSES}
          AND o.created_at::date BETWEEN $1::date AND $2::date
        ORDER BY order_time DESC NULLS LAST
        LIMIT $3
      ),
      items AS (
        SELECT
          oi.order_id,
          oi.product_id,
          p.name AS product_name,
          c.name AS category_name,
          oi.quantity,
          COALESCE(oi.unit_price, p.price, 0)::numeric AS unit_price,
    COALESCE(
      oi.line_total,
      oi.quantity * COALESCE(oi.unit_price, p.price, 0),
      0
    )::numeric AS line_total,
    COALESCE(NULLIF(oi.image, ''), NULLIF(p.image, '')) AS image_raw
  FROM order_items oi
  JOIN products p     ON p.id = oi.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE oi.order_id IN (SELECT id FROM o10)
)
      SELECT
        o.id AS order_id,
        o.order_time,
        o.status,
        o.shipping_method,

        u.id AS user_id,
        COALESCE(o.o_full_name, u.username, SPLIT_PART(u.email, '@', 1), 'ลูกค้า') AS buyer_name,
        COALESCE(o.o_email, u.email)  AS email,
        COALESCE(o.o_phone, u.phone)  AS phone,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'product_id',    i.product_id,
              'product_name',  i.product_name,
              'category_name', COALESCE(i.category_name, 'ไม่ระบุ'),
              'quantity',      i.quantity,
              'unit_price',    i.unit_price,
              'line_total',    i.line_total,
              'image',         i.image_raw,
              'image_url',
                CASE
                  WHEN i.image_raw IS NULL OR i.image_raw = '' THEN NULL
                  WHEN i.image_raw ~ '^https?://' THEN i.image_raw
                  WHEN i.image_raw LIKE '/%' THEN $4 || i.image_raw
                  ELSE $4 || '/uploads/' || i.image_raw
                END
            )
            ORDER BY i.product_name
          ), '[]'::json)
          FROM items i WHERE i.order_id = o.id
        ) AS items,

        /* ✅ ใช้ total_price จากตาราง orders โดยตรง */
        o.total_price::numeric AS order_total

      FROM o10 o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.order_time DESC NULLS LAST
      `,
      [from, to, limit, baseUrl]
    );

    res.json(rows);
  } catch (e) {
    console.error('metrics/recent-orders error:', e);
    res.status(500).json({ message: 'Server error: recent-orders' });
  }
});


app.get('/api/products/search', async (req, res) => {
  const client = await pool.connect();
  try {
    const qRaw  = String(req.query.q || '').trim();
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '24', 10)));
    const sort  = String(req.query.sort || 'relevance').toLowerCase();

    if (!qRaw) return res.json({ items: [], total: 0, page, limit });

    const likeFull  = `%${qRaw}%`;
    const likeFront = `${qRaw}%`;
    const offset    = (page - 1) * limit;

    // --- ORDER BY ---
    let orderBy = '';
    switch (sort) {
      case 'newest':     orderBy = 'p.created_at DESC NULLS LAST'; break;
      case 'price_asc':  orderBy = 'p.price ASC NULLS LAST'; break;
      case 'price_desc': orderBy = 'p.price DESC NULLS LAST'; break;
      case 'name_asc':   orderBy = 'p.name ASC NULLS LAST'; break;
      default: // relevance
        orderBy = `
          CASE
            WHEN p.name ILIKE $2 THEN 0
            WHEN p.name ILIKE $1 THEN 1
            ELSE 2
          END,
          p.name ASC
        `;
    }

    const where = `
      (COALESCE(p.name,'') ILIKE $1 OR
       COALESCE(p.description,'') ILIKE $1 OR
       COALESCE(c.name,'') ILIKE $1)
    `;

    // --- นับผลลัพธ์ ---
    const countSql = `
      SELECT COUNT(*)::int AS cnt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
    `;
    const countRes = await client.query(countSql, [likeFull]);
    const total = Number(countRes.rows?.[0]?.cnt || 0);

    // --- สร้าง LIMIT/OFFSET ให้สัมพันธ์กับจำนวนพารามิเตอร์จริง ---
    let listSql, listParams;

    if (sort === 'relevance') {
      // ใช้ $1, $2, $3, $4
      listSql = `
        SELECT
          p.id AS product_id, p.name, p.price, p.image, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT $3 OFFSET $4
      `;
      listParams = [likeFull, likeFront, limit, offset];
    } else {
      // ไม่มี $2 ใน ORDER BY → ใช้ $1, $2, $3 เท่านั้น
      listSql = `
        SELECT
          p.id AS product_id, p.name, p.price, p.image, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `;
      listParams = [likeFull, limit, offset];
    }

    const listRes = await client.query(listSql, listParams);
    res.json({ items: listRes.rows, total, page, limit });
  } catch (err) {
    console.error('search error:', err);
    // แนะนำให้ส่ง 400 ถ้าเป็นพารามิเตอร์ผิด แต่อย่างน้อย log ให้เห็นสาเหตุ
    res.status(500).json({ error: 'search_failed', message: String(err?.message || err) });
  } finally {
    client.release();
  }
});


// ==================== USERS API ====================

// GET: ดึงผู้ใช้ทั้งหมด
app.get("/api/admin/users", async (req, res) => {
  try {
    const q = `
      SELECT id, username, email, role, phone, address, profile_image, email_verified, created_at
      FROM users
      ORDER BY id ASC
    `;
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET: ผู้ใช้ตาม id
app.get("/api/admin/users/:id", async (req, res) => {
  try {
    const q = `
      SELECT id, username, email, role, phone, address, profile_image, email_verified, created_at
      FROM users WHERE id = $1
    `;
    const result = await pool.query(q, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: สร้างผู้ใช้ใหม่
app.post("/api/admin/users", async (req, res) => {
  try {
    const { username, password, email, role, phone, address } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ message: "username, password, email required" });
    }

    const q = `
      INSERT INTO users (username, password, email, role, phone, address, created_at, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), false)
      RETURNING id, username, email, role, phone, address, created_at, email_verified
    `;
    const result = await pool.query(q, [username, password, email, role || "user", phone, address]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT: อัปเดตผู้ใช้
app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { username, email, role, phone, address, profile_image, email_verified } = req.body;
    const q = `
      UPDATE users
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          role = COALESCE($3, role),
          phone = COALESCE($4, phone),
          address = COALESCE($5, address),
          profile_image = COALESCE($6, profile_image),
          email_verified = COALESCE($7, email_verified)
      WHERE id = $8
      RETURNING id, username, email, role, phone, address, profile_image, email_verified, created_at
    `;
    const result = await pool.query(q, [username, email, role, phone, address, profile_image, email_verified, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE: ลบผู้ใช้
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const q = "DELETE FROM users WHERE id = $1 RETURNING id";
    const result = await pool.query(q, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
