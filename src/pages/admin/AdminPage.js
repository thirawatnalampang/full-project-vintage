// src/pages/admin/AdminPage.jsx
import React, {  useEffect, useMemo, useState } from "react";
import { Link, useNavigate,useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaTshirt, FaShoppingBag, FaUsers,
  FaPlus, FaSearch, FaEdit, FaTrash, FaSave, FaTimes, FaHome,
  FaChartLine, FaBars, FaShoppingCart, FaClipboardList, FaUserShield
} from "react-icons/fa";


import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";



const API = {
  products: "http://localhost:3000/api/admin/products",
  categories: "http://localhost:3000/api/admin/categories",
  metrics: "http://localhost:3000/api/admin/metrics",
};


function classNames(...arr) { return arr.filter(Boolean).join(" "); }
function numberFormat(n) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n || 0);
}

/* -------------------- TopBar (มีปุ่มแฮมเบอร์เกอร์บนมือถือ) -------------------- */
function TopBar({ title, onMenu }) {
  return (
    <header className="sticky top-0 z-30 bg-[#111]/80 backdrop-blur border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger (mobile only) */}
          <button
            onClick={onMenu}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white"
            aria-label="เปิดเมนู"
          >
            <FaBars />
          </button>
          <Link to="/" className="hidden md:inline text-neutral-300 hover:text-white" title="กลับหน้าหลัก">
            <FaHome size={18} />
          </Link>
          <h1 className="text-white font-semibold">{title}</h1>
        </div>
        <div className="text-xs text-neutral-400">Admin Console</div>
      </div>
    </header>
  );
}

const menu = [
  { key: "products", label: "สินค้า",     icon: <FaTshirt /> },
  { key: "orders", label: "ออเดอร์",     icon: <FaShoppingBag /> },
  { key: "users", label: "ผู้ใช้",        icon: <FaUsers /> },
  { key: "dashboard", label: "แดชบอร์ด", icon: <FaChartLine /> },
];

/* -------------------- Sidebar (off-canvas บนมือถือ, sticky บนเดสก์ท็อป) -------------------- */
function Sidebar({ active, onChange, isOpen, onClose }) {
  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={onClose}
        />
      )}

      <aside
        className={classNames(
          "fixed md:static inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 bg-neutral-950 border-r border-neutral-800",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        )}
        style={{ height: "100dvh" }}
      >
        <div className="h-14 px-4 flex items-center justify-between md:hidden border-b border-neutral-800">
          <div className="text-white font-semibold">เมนูจัดการ</div>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-300 hover:bg-white/10" aria-label="ปิดเมนู">
            <FaTimes />
          </button>
        </div>

        <div className="p-4 h-[calc(100dvh-56px)] md:h-[calc(100dvh-56px)] overflow-y-auto">
          <div className="text-neutral-400 text-xs mb-2 hidden md:block">เมนูจัดการ</div>
          <ul className="space-y-1">
            {menu.map((m) => (
              <li key={m.key}>
                <button
                  onClick={() => { onChange(m.key); onClose?.(); }}
                  className={classNames(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm",
                    active === m.key
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                  )}
                >
                  <span className="text-neutral-300">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

/* -------------------- ProductsPanel -------------------- */
function ProductsPanel() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // รูปภาพ
  const [coverFile, setCoverFile] = useState(null);        // ปก (ไฟล์ใหม่)
  const [galleryFiles, setGalleryFiles] = useState([]);    // แกลเลอรี (ไฟล์ใหม่หลายไฟล์)
  const [galleryKeep, setGalleryKeep] = useState([]);      // path รูปเก่าที่ “จะเก็บไว้”
  const [previewCover, setPreviewCover] = useState("");    // url พรีวิวปก
// ====== ขนาด (อก/ยาว) ======
const [measureRows, setMeasureRows] = useState([]); // [{ chest: "28.5", length: "27", stock: 3 }]

// กัน e/E/+/- และ scroll เปลี่ยนค่าโดยไม่ตั้งใจ
const blockInvalidKeys = (e) => {
  const bad = ["e", "E", "+", "-"];
  if (bad.includes(e.key)) e.preventDefault();
};
const noWheelChange = (e) => e.currentTarget.blur();

// ✅ เก็บเป็น "ข้อความ" ระหว่างพิมพ์ แต่จำกัดรูปแบบให้ถูกต้อง
// - อนุญาตเฉพาะตัวเลขและจุด
// - มีจุดทศนิยมได้ 1 จุด
// - ทศนิยมไม่เกิน 2 ตำแหน่ง
const sanitizeDecimalStr = (v, maxDecimals = 2) => {
  let s = String(v ?? "");
  s = s.replace(/[^0-9.]/g, "");              // ตัดอักขระที่ไม่ใช่เลข/จุด
  const parts = s.split(".");
  if (parts.length > 2) {
    s = parts[0] + "." + parts.slice(1).join(""); // รวมจุดส่วนเกิน
  }
  let [intPart, decPart] = s.split(".");
  intPart = (intPart || "").replace(/^0+(?=\d)/, ""); // ลบ 0 นำหน้า (คง "0" ได้)
  if (decPart !== undefined) decPart = decPart.slice(0, maxDecimals);
  return decPart !== undefined ? `${intPart}.${decPart}` : intPart;
};

// ✅ สำหรับ stock: จำนวนเต็ม ≥ 0 (เก็บเป็น string เพื่อให้พิมพ์สะดวก)
const sanitizeIntStr = (v) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s.replace(/^0+(?=\d)/, ""); // ลบ 0 นำหน้า
};

// ===== helpers กันไฟล์ซ้ำ =====
const isSameFile = (a, b) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const mergeUniqueFiles = (oldArr, newArr) => {
  const out = [...oldArr];
  newArr.forEach((nf) => {
    if (!out.some((of) => isSameFile(of, nf))) out.push(nf);
  });
  return out;
};
// แปลงตอน "คำนวณ/บันทึก"
const toFloat = (s) => {
  const n = parseFloat(String(s || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const toInt = (s) => {
  const n = parseInt(String(s || ""), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const addMeasureRow = () =>
  setMeasureRows((rows) => [...rows, { chest: "", length: "", stock: "" }]);

const updateMeasureRow = (idx, key, val) =>
  setMeasureRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

const removeMeasureRow = (idx) =>
  setMeasureRows((rows) => rows.filter((_, i) => i !== idx));

// รวมสต็อก (ตอนโชว์)
const sumStockFromMeasures = useMemo(
  () => measureRows.reduce((a, b) => a + toInt(b.stock), 0),
  [measureRows]
);

// 👇 ถ้าโหลดจาก DB มาก่อน ให้ map เป็น string เพื่อแก้จุดหายตอนแก้ไข
const parseMeasureVariants = (raw) => {
  let mv = raw?.measure_variants ?? raw?.measureVariants ?? null;
  if (!mv) return [];
  if (typeof mv === "string") {
    try { mv = JSON.parse(mv); } catch { mv = []; }
  }
  if (!Array.isArray(mv)) return [];
  return mv
    .map((v) => ({
      chest:  (v?.chest_in  ?? v?.chest_cm  ?? v?.chest  ?? "").toString(),
      length: (v?.length_in ?? v?.length_cm ?? v?.length ?? "").toString(),
      stock:  (v?.stock ?? "").toString(),
    }))
    .filter((r) => r.chest !== "" && r.length !== "");
};

  // ====== ค้นหา/กรอง ======
  const filtered = useMemo(() => {
    const kw = q.toLowerCase().trim();
    let items = Array.isArray(list) ? list : [];
    if (kw) {
      items = items.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(kw) ||
          (i.description || "").toLowerCase().includes(kw)
      );
    }
    return items;
  }, [q, list]);

  // ====== โหลดข้อมูล ======
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch(API.products);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("loadProducts error:", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API.categories);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("loadCategories error:", e);
      }
    })();
  }, []);

  // ====== ฟอร์ม ======
  function openCreate() {
    setEditing({
      id: null,
      name: "",
      price: 0,
      category_id: "",
      description: "",
      stock: 0,
      image: "",
      images_json: "[]",
    });
    setCoverFile(null);
    setGalleryFiles([]);
    setGalleryKeep([]);
    setPreviewCover("");
    setMeasureRows([]);
    setDrawerOpen(true);
  }

  function openEdit(row) {
    const arr = (() => {
      try { return JSON.parse(row.images_json || "[]"); }
      catch { return []; }
    })();
    setEditing({ ...row });
    setCoverFile(null);
    setGalleryFiles([]);
    setGalleryKeep(arr); // เก็บรูปเก่าไว้ทั้งหมดก่อน
    setPreviewCover(row.image ? `http://localhost:3000${row.image}` : "");
    setMeasureRows(parseMeasureVariants(row));
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setCoverFile(null);
    setGalleryFiles([]);
    setGalleryKeep([]);
    setPreviewCover("");
    setMeasureRows([]);
  }

  async function save() {
    if (!editing) return;
    if (!editing.name?.trim()) return alert("กรุณากรอกชื่อสินค้า");

    const formData = new FormData();
    formData.append("name", editing.name);
    formData.append("price", editing.price ?? 0);

    const cleaned = measureRows
  .filter((r) => r.chest !== "" && r.length !== "")
  .map((r) => ({
    chest_in:  toFloat(r.chest),
    length_in: toFloat(r.length),
    stock:     toInt(r.stock),
  }));

formData.append("measureVariants", JSON.stringify(cleaned));
formData.append(
  "stock",
  cleaned.reduce((a, b) => a + (b.stock || 0), 0)
);

    if (editing.category_id) formData.append("category_id", editing.category_id);
    if (editing.description) formData.append("description", editing.description);

    // ปก
    if (coverFile) formData.append("image", coverFile);
    else if (editing.image) formData.append("oldImage", editing.image);

    // แกลเลอรี
    formData.append("keepImages", JSON.stringify(galleryKeep));
    galleryFiles.forEach((f) => formData.append("images", f));

    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `${API.products}/${editing.id}` : API.products;

    try {
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("save failed:", data);
        return alert(data?.message || "บันทึกไม่สำเร็จ");
      }
      await loadProducts();
      closeDrawer();
    } catch (err) {
      console.error("save error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  }

  async function remove(id) {
    if (!window.confirm("ลบสินค้านี้หรือไม่?")) return;
    const res = await fetch(`${API.products}/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("ลบไม่สำเร็จ");
    await loadProducts();
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">จัดการสินค้า</h2>
          <p className="text-neutral-400 text-sm">เพิ่ม/แก้ไข/ลบ และอัปโหลดรูปจากเครื่อง</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อ / รายละเอียด"
              className="pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-600"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-white text-black px-3 py-2 rounded-xl text-sm font-medium hover:bg-neutral-200"
          >
            <FaPlus /> เพิ่มสินค้า
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-800 rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-950 text-neutral-400">
            <tr>
              <th className="px-4 py-3 text-left">สินค้า</th>
              <th className="px-4 py-3 text-left">หมวดหมู่</th>
              <th className="px-4 py-3 text-right">ราคา</th>
              <th className="px-4 py-3 text-right">สต็อก</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-900">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">กำลังโหลด...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">ไม่พบข้อมูล</td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-800/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image ? `http://localhost:3000${p.image}` : "/assets/placeholder.png"}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded-xl border border-neutral-800"
                      />
                      <div>
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-neutral-500 text-xs">ID: {p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {categories.find((c) => c.id === p.category_id)?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-white">{numberFormat(p.price)}</td>
                  <td className="px-4 py-3 text-right">{p.stock ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white">
                        <FaEdit /> แก้ไข
                      </button>
                      <button onClick={() => remove(p.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white">
                        <FaTrash /> ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer ฟอร์มสินค้า */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-neutral-950 border-l border-neutral-800 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{editing?.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h3>
              <button onClick={closeDrawer} className="text-neutral-400 hover:text-white"><FaTimes /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">ชื่อสินค้า</label>
                <input
                  value={editing?.name || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">หมวดหมู่</label>
                <select
                  value={editing?.category_id || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, category_id: Number(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">ราคา (บาท)</label>
                  <input
                    type="number"
                    value={editing?.price ?? 0}
                    onChange={(e) => setEditing((s) => ({ ...s, price: Number(e.target.value) }))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">รายละเอียดสินค้า</label>
                <textarea
                  value={editing?.description || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* รูปหน้าปก (1 รูป) */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">รูปหน้าปก</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setCoverFile(f);
                    setPreviewCover(
                      f
                        ? URL.createObjectURL(f)
                        : editing?.image
                        ? `http://localhost:3000${editing.image}`
                        : ""
                    );
                  }}
                  className="w-full text-neutral-300"
                />
                {previewCover && (
                  <img
                    src={previewCover}
                    alt="cover"
                    className="mt-3 w-36 h-36 object-cover rounded-xl border border-neutral-800"
                  />
                )}
              </div>

              {/* แกลเลอรี (หลายรูป) */}
              <div className="mt-4">
                <label className="block text-sm text-neutral-400 mb-1">แกลเลอรี (อัปโหลดได้หลายรูป)</label>
               <input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    const picked = Array.from(e.target.files || []);
    // ✅ ต่อท้าย + กันซ้ำ
    setGalleryFiles((prev) => mergeUniqueFiles(prev, picked));
    // ✅ รีเซ็ตค่า input เพื่อให้เลือกไฟล์ชุดเดิมซ้ำได้ (เช่น ลืมเลือกครบ)
    e.target.value = "";
  }}
  className="w-full text-neutral-300"
/>

                {/* แสดงรูปเก่า (กดลบ = เอาออกจาก keep) */}
                {galleryKeep.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-neutral-400 mb-1">รูปเก่า</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {galleryKeep.map((p, idx) => (
                        <div key={`old-${idx}`} className="relative">
                          <img
                            src={`http://localhost:3000${p}`}
                            alt=""
                            className="w-24 h-24 object-cover rounded-lg border border-neutral-800"
                          />
                          <button
                            type="button"
                            onClick={() => setGalleryKeep((arr) => arr.filter((x) => x !== p))}
                            className="absolute -top-2 -right-2 px-2 py-1 text-xs rounded bg-rose-600 text-white"
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* แสดงรูปใหม่ (กดลบ = เอาออกจาก files) */}
                {galleryFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-neutral-400 mb-1">รูปใหม่</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {galleryFiles.map((f, idx) => {
                        const url = URL.createObjectURL(f);
                        return (
                          <div key={`new-${idx}`} className="relative">
                            <img
                              src={url}
                              alt=""
                              className="w-24 h-24 object-cover rounded-lg border border-neutral-800"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setGalleryFiles((files) => files.filter((_, i) => i !== idx))
                              }
                              className="absolute -top-2 -right-2 px-2 py-1 text-xs rounded bg-rose-600 text-white"
                            >
                              ลบ
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* === ขนาด (อก/ยาว) === */}
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-neutral-400 mb-1">ขนาด (อก/ยาว)</label>
                  <div className="text-xs text-neutral-400">
                    สต็อกรวมจากตารางนี้:{" "}
                    <span className="text-white font-semibold">{sumStockFromMeasures}</span> ชิ้น
                  </div>
                </div>

                <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-950 text-neutral-400">
                      <tr>
                        <th className="px-3 py-2 text-left">อก (นิ้ว)</th>
                        <th className="px-3 py-2 text-left">ยาว (นิ้ว)</th>
                        <th className="px-3 py-2 text-left">สต็อก</th>
                        <th className="px-3 py-2 text-right">จัดการ</th>
                      </tr>
                    </thead>
                   <tbody className="divide-y divide-neutral-800 bg-neutral-900">
  {measureRows.length === 0 ? (
    <tr>
      <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
        ยังไม่มีแถว กด “เพิ่มแถว” เพื่อเริ่มต้น
      </td>
    </tr>
  ) : (
    measureRows.map((r, idx) => (
      <tr key={idx}>
{/* อก (ทศนิยมได้) */}
<td className="px-3 py-2">
  <input
    type="text"
    inputMode="decimal"
    placeholder=""
    value={r.chest}
    onChange={(e) => updateMeasureRow(idx, "chest", sanitizeDecimalStr(e.target.value, 2))}
    onKeyDown={blockInvalidKeys}
    onWheel={noWheelChange}
    className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-right"
  />
</td>

{/* ยาว (ทศนิยมได้) */}
<td className="px-3 py-2">
  <input
    type="text"
    inputMode="decimal"
    placeholder=""
    value={r.length}
    onChange={(e) => updateMeasureRow(idx, "length", sanitizeDecimalStr(e.target.value, 2))}
    onKeyDown={blockInvalidKeys}
    onWheel={noWheelChange}
    className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-right"
  />
</td>

{/* สต็อก (จำนวนเต็ม) */}
<td className="px-3 py-2">
  <input
    type="text"
    inputMode="numeric"
    placeholder="0"
    value={r.stock}
    onChange={(e) => updateMeasureRow(idx, "stock", sanitizeIntStr(e.target.value))}
    onKeyDown={blockInvalidKeys}
    onWheel={noWheelChange}
    className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-right"
  />
</td>


        <td className="px-3 py-2 text-right">
          <button
            onClick={() => removeMeasureRow(idx)}
            className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white"
          >
            ลบ
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>
                  </table>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={addMeasureRow}
                    className="px-3 py-1.5 rounded-lg bg-neutral-200 text-black hover:bg-white"
                  >
                    เพิ่มแถว
                  </button>
                </div>

                <p className="text-xs text-neutral-500 mt-2">
                  * ค่าที่กรอกจะถูกส่งเป็น <code>measureVariants</code> เช่น{" "}
                  <code>[&#123; chest_cm:40, length_cm:27, stock:3 &#125;]</code>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={closeDrawer} className="px-4 py-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700">
                  ยกเลิก
                </button>
                <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-medium hover:bg-emerald-400">
                  <FaSave /> บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ===== helpers สำหรับค้นหาด้วยสถานะ =====
const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  ready_to_ship: "รอจัดส่ง",
  paid: "ชำระเงินแล้ว",
  shipped: "จัดส่งแล้ว",
  done: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const PAY_LABELS = {
  unpaid: "ยังไม่ชำระ",
  submitted: "ส่งสลิปแล้ว",
  paid: "ชำระแล้ว",
  rejected: "สลิปถูกปฏิเสธ",
}; 
// 1) แปลบทบาทเป็นไทย
const ROLE_TH = {
  buyer: "ผู้ซื้อ",
  admin: "ผู้ขาย" 
};


function matchStatusKeyword(order, kw) {
  const statusTh = STATUS_LABELS[order.status] || "";
  const payTh    = PAY_LABELS[order.payment_status || "unpaid"] || "";

  const tokens = [
    String(order.status || ""),          // pending, ready_to_ship, ...
    statusTh,                            // ไทย
    String(order.payment_status || ""),  // unpaid, submitted, paid, rejected
    payTh,                               // ไทย
  ].map((s) => String(s).toLowerCase().trim()).filter(Boolean);

  return tokens.some((t) => t.includes(kw));
}


function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null); // { order, items }
  const [statusDraft, setStatusDraft] = useState("pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [paying, setPaying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
 // 🔎 ค้นหา/ฟิลเตอร์
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");     // YYYY-MM-DD

  // 🔢 แบ่งหน้า
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

// ช่วย normalize string
const norm = (s) => String(s || "").toLowerCase().trim();

const filtered = useMemo(() => {
  const kw = norm(q);

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const to   = dateTo   ? new Date(`${dateTo}T23:59:59`)   : null;

  return (orders || []).filter((o) => {
    const created = new Date(o.created_at);
    if (from && created < from) return false;
    if (to && created > to) return false;

    if (!kw) return true;
    const code = o.order_code ? String(o.order_code) : `#${o.id}`;

    return (
      norm(o.full_name).includes(kw) ||
      norm(o.email).includes(kw) ||
      norm(code).includes(kw) ||
      norm(o.tracking_code).includes(kw) ||
      String(o.total_price || "").includes(kw) ||
      norm(new Date(o.created_at).toLocaleDateString("th-TH")).includes(kw) ||
      matchStatusKeyword(o, kw)                    // ⬅️ ต้องมี || ตรงนี้
    );
  });
}, [q, orders, dateFrom, dateTo]);

// ⬇️ ADD: รีเซ็ตหน้าเมื่อเปลี่ยนเงื่อนไขค้นหา/วันที่/รายการ
useEffect(() => {
  setPage(1);
}, [q, dateFrom, dateTo, orders]);

// ⬇️ ADD: คำนวณเพจจิ้ง (ใช้ PAGE_SIZE, page)
const total = filtered.length;
const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
const pageItems = useMemo(() => {
  const start = (page - 1) * PAGE_SIZE;
  return filtered.slice(start, start + PAGE_SIZE);
}, [filtered, page]);
  const API_ORDERS = "http://localhost:3000/api/admin/orders";

  const CURRENCY = (n) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0));

  // ===== helpers สำหรับค้นหาด้วยสถานะ =====
const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  ready_to_ship: "รอจัดส่ง",
  paid: "ชำระเงินแล้ว",
  shipped: "จัดส่งแล้ว",
  done: "สำเร็จ",
  cancelled: "ยกเลิก",
};

const PAY_LABELS = {
  unpaid: "ยังไม่ชำระ",
  submitted: "ส่งสลิปแล้ว",
  paid: "ชำระแล้ว",
  rejected: "สลิปถูกปฏิเสธ",
};


  // ชื่อวิธีชำระเป็นไทย
  const PAYMENT_METHOD_TH = {
    cod: "เก็บเงินปลายทาง",
    transfer: "โอนเงิน/สลิป",
  };

  const statusClass = (s) => {
    switch (s) {
      case "ready_to_ship": return "bg-purple-500 text-white";
      case "paid": return "bg-sky-600 text-white";
      case "shipped": return "bg-amber-500 text-black";
      case "done": return "bg-emerald-500 text-black";
      case "cancelled": return "bg-rose-600 text-white";
      default: return "bg-neutral-700 text-white"; // pending
    }
  };
  const payClass = (p) => {
    switch (p) {
      case "submitted": return "bg-indigo-500 text-white";
      case "paid": return "bg-emerald-500 text-black";
      case "rejected": return "bg-rose-600 text-white";
      default: return "bg-neutral-700 text-white";
    }
  };

  /* ================= Tracking helpers & state ================= */
  const TRACK_CARRIERS = {
    thailandpost: { label: "ไปรษณีย์ไทย (Thailand Post)" },
    kerry:        { label: "Kerry Express" },
    flash:        { label: "Flash Express" },
    jnt:          { label: "J&T Express" },
    best:         { label: "BEST Express" },
    ninjavan:     { label: "NinjaVan" },
  };

  const trackingUrl = (carrier, code) => {
    const c = String(carrier || "").toLowerCase();
    const t = String(code || "").trim();
    if (!t) return null;

    switch (c) {
      case "thailandpost":
        return `https://track.thailandpost.com/?trackNumber=${encodeURIComponent(t)}`;
      case "kerry":
        return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(t)}`;
      case "flash":
        return `https://www.flashexpress.com/fle/tracking?se=${encodeURIComponent(t)}`;
      case "jnt":
        return `https://www.jtexpress.co.th/service/track/${encodeURIComponent(t)}`;
      case "best":
        return `https://www.best-inc.co.th/track?billcode=${encodeURIComponent(t)}`;
      case "ninjavan":
        return `https://www.ninjavan.co/th-th/tracking?id=${encodeURIComponent(t)}`;
      default:
        return `https://www.track.in.th/th/tracking/${encodeURIComponent(t)}`;
    }
  };

  const [trackingDraft, setTrackingDraft] = useState({ carrier: "", code: "" });
  const [savingTracking, setSavingTracking] = useState(false);

  /* ================= Data loading ================= */
  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch(API_ORDERS);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("loadOrders error:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadOrders(); }, []);

  const normalizeDetail = (raw) => {
    if (raw?.order) return { order: raw.order, items: Array.isArray(raw.items) ? raw.items : [] };
    if (raw && (raw.id || raw.status || raw.total_price)) {
      const { items, ...order } = raw;
      return { order, items: Array.isArray(items) ? items : [] };
    }
    return null;
  };

  async function openDetail(id) {
    try {
      const res = await fetch(`${API_ORDERS}/${id}`);
      const raw = await res.json();
      if (!res.ok) throw new Error(raw?.message || "โหลดรายละเอียดไม่สำเร็จ");
      const data = normalizeDetail(raw);
      if (!data?.order) throw new Error("รูปแบบข้อมูลไม่ถูกต้อง (ไม่มี order)");
      setDetail(data);
      setStatusDraft(data.order?.status ?? "pending");
      setTrackingDraft({
        carrier: data.order?.tracking_carrier || "",
        code: data.order?.tracking_code || "",
      });
      setDetailOpen(true);
    } catch (e) {
      alert(e.message);
    }
  }

async function saveStatus() {
  const oid = detail?.order?.id;
  if (!oid) return;

  // ถ้าเลือกว่า "ยกเลิก" → ใช้ /cancel (จะถามคืนสต๊อกและทำคืนสต๊อกให้)
  if (statusDraft === 'cancelled') {
    const restock = window.confirm('ต้องการคืนสต็อกสินค้าด้วยหรือไม่? กด OK = คืนสต็อก, Cancel = ไม่คืน');

    try {
      const res = await fetch(`${API_ORDERS}/${oid}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "ยกเลิกออเดอร์ไม่สำเร็จ");

      // อัปเดต state ให้ UI สอดคล้อง
      setOrders(os => os.map(o => o.id === oid ? { ...o, status: data.status } : o));
      setDetail(d => d ? { ...d, order: { ...d.order, status: data.status } } : d);

      alert("ยกเลิกออเดอร์เรียบร้อย" + (restock ? " (คืนสต๊อกแล้ว)" : ""));
    } catch (e) {
      alert(e.message);
    }
    return; // จบ ไม่ต้องยิง /status ต่อ
  }

  // กรณีสถานะอื่น ๆ ใช้ /status ตามเดิม
  setSavingStatus(true);
  try {
    const res = await fetch(`${API_ORDERS}/${oid}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDraft }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "บันทึกสถานะไม่สำเร็จ");

    setOrders(os =>
      os.map(o =>
        o.id === oid
          ? {
              ...o,
              status: data.status,
              payment_status: data.payment_status ?? o.payment_status,
            }
          : o
      )
    );
    setDetail(d =>
      d
        ? {
            ...d,
            order: {
              ...d.order,
              status: data.status,
              payment_status: data.payment_status ?? d.order.payment_status,
              paid_at: data.paid_at ?? d.order.paid_at,
            },
          }
        : d
    );

    alert("อัปเดตสถานะเรียบร้อย");
  } catch (e) {
    alert(e.message);
  } finally {
    setSavingStatus(false);
  }
}
  async function markPaid() {
    const oid = detail?.order?.id;
    if (!oid) return;
    setPaying(true);
    try {
      const res = await fetch(`${API_ORDERS}/${oid}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "ยืนยันรับเงินไม่สำเร็จ");
      setOrders(os => os.map(o => o.id === oid ? { ...o, status: data.status, payment_status: data.payment_status } : o));
      setDetail(d => d ? { ...d, order: { ...d.order, status: data.status, payment_status: data.payment_status, paid_at: data.paid_at } } : d);
    } catch (e) {
      alert(e.message);
    } finally {
      setPaying(false);
    }
  }

  async function rejectSlip() {
    const oid = detail?.order?.id;
    if (!oid) return;
    if (!window.confirm("ยืนยันปฏิเสธสลิปนี้หรือไม่?")) return;
    setRejecting(true);
    try {
      const res = await fetch(`${API_ORDERS}/${oid}/reject-slip`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "ปฏิเสธสลิปไม่สำเร็จ");
      setOrders(os => os.map(o => o.id === oid ? { ...o, payment_status: data.payment_status } : o));
      setDetail(d => d ? { ...d, order: { ...d.order, payment_status: data.payment_status } } : d);
    } catch (e) {
      alert(e.message);
    } finally {
      setRejecting(false);
    }
  }

  async function cancelOrder() {
  const oid = detail?.order?.id;
  if (!oid) return;

  const reason = window.prompt("กรุณากรอกเหตุผลในการยกเลิก:", "");
  if (reason === null) return;

  const restock = window.confirm("ต้องการคืนสต๊อกสินค้าด้วยหรือไม่? OK = คืนสต๊อก, Cancel = ไม่คืน");

  try {
    const res = await fetch(`${API_ORDERS}/${oid}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restock, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "ยกเลิกออเดอร์ไม่สำเร็จ");

    setOrders(os => os.map(o =>
      o.id === oid ? { ...o, status: data.status, cancel_reason: data.cancel_reason } : o
    ));
    setDetail(d => d ? {
      ...d,
      order: { ...d.order, status: data.status, cancel_reason: data.cancel_reason, cancelled_by: data.cancelled_by, cancelled_at: data.cancelled_at }
    } : d);

    alert("ยกเลิกออเดอร์เรียบร้อย");
  } catch (e) {
    alert(e.message);
  }
}


  /* ================= Actions: tracking ================= */
  async function saveTracking() {
    const oid = detail?.order?.id;
    if (!oid) return;
    setSavingTracking(true);
    try {
      const body = {
        tracking_carrier: trackingDraft.carrier || null,
        tracking_code: (trackingDraft.code || "").trim() || null,
      };
      const res = await fetch(`${API_ORDERS}/${oid}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "บันทึกเลขพัสดุไม่สำเร็จ");

      setOrders(os => os.map(o =>
        o.id === oid ? { ...o, tracking_carrier: data.tracking_carrier, tracking_code: data.tracking_code } : o
      ));
      setDetail(d => d ? {
        ...d,
        order: { ...d.order, tracking_carrier: data.tracking_carrier, tracking_code: data.tracking_code }
      } : d);

      alert("บันทึกเลขพัสดุเรียบร้อย");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingTracking(false);
    }
  }

  function clearTracking() {
    setTrackingDraft({ carrier: "", code: "" });
  }

  function copyTracking() {
    const txt = trackingDraft.code || detail?.order?.tracking_code || "";
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      alert("คัดลอกเลขพัสดุแล้ว");
    });
  }

  /* ================= Render ================= */
  const chip = (extra = "") =>
    `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${extra}`;

  return (
   <div className="p-6">
  <h2 className="text-xl font-semibold text-white mb-4">รายการออเดอร์</h2>

  {/* 🔍 ค้นหา + วันที่ */}
<div className="mb-4 flex flex-col md:flex-row gap-2 md:items-end">
  <div className="flex-1">
    <label className="block text-sm text-neutral-300 mb-1">ค้นหา</label>
    <input
      type="text"
      placeholder="ชื่อ, อีเมล, รหัสออเดอร์, เลขพัสดุ, ยอดรวม,สถานะ"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      className="w-full px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-300 mb-1">จากวันที่</label>
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className="px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-white"
    />
  </div>

  <div>
    <label className="block text-sm text-neutral-300 mb-1">ถึงวันที่</label>
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
      className="px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-white"
    />
  </div>

  {(q || dateFrom || dateTo) && (
    <button
      onClick={() => { setQ(""); setDateFrom(""); setDateTo(""); }}
      className="h-10 px-4 border border-neutral-700 rounded-lg bg-neutral-900 text-neutral-200"
      title="ล้างฟิลเตอร์ทั้งหมด"
    >
      ล้าง
    </button>
  )}
</div>

  <div className="overflow-x-auto border border-neutral-800 rounded-2xl">
    <table className="min-w-full text-sm">
      <thead className="bg-neutral-950 text-neutral-400">
        <tr>
          <th className="px-4 py-3 text-left">รหัสออเดอร์</th>
          <th className="px-4 py-3 text-left">ลูกค้า</th>
          <th className="px-4 py-3 text-left">สถานะ</th>
          <th className="px-4 py-3 text-left">การชำระเงิน</th>
          <th className="px-4 py-3 text-left">ติดตาม</th>
          <th className="px-4 py-3 text-right">ยอดรวม</th>
          <th className="px-4 py-3 text-left">วันที่</th>
          <th className="px-4 py-3 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-800 bg-neutral-900">
        {loading ? (
          <tr>
            <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
              กำลังโหลด...
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
              {q ? <>ไม่พบออเดอร์ที่ตรงกับ “{q}”</> : <>ยังไม่มีออเดอร์</>}
            </td>
          </tr>
        ) : (
          pageItems.map((o) => (
            <tr key={o.id} className="hover:bg-neutral-800/60">
              <td className="px-4 py-3 text-white font-medium">
                {o.order_code ? o.order_code : `#${o.id}`}
              </td>

              <td className="px-4 py-3 text-neutral-300">
                <div className="flex flex-col">
                  <span className="font-medium text-white">{o.full_name || "-"}</span>
                  <span className="text-xs text-neutral-400">{o.email || "-"}</span>
                </div>
              </td>

              {/* สถานะ */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={chip(statusClass(o.status))}>
                  {STATUS_LABELS[o.status] || "รอดำเนินการ"}
                </span>
              </td>

              {/* การชำระเงิน */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={chip(payClass(o.payment_status))}>
                  {PAY_LABELS[o.payment_status || "unpaid"]}
                </span>

                {o.payment_method && (
                  <span className="ml-2 text-xs text-neutral-400">
                    {PAYMENT_METHOD_TH[o.payment_method] || o.payment_method}
                  </span>
                )}

                {o.payment_status === "submitted" && !o.slip_image && (
                  <span className="ml-2 text-xs text-amber-400">(ไม่มีไฟล์)</span>
                )}

                {o.slip_image && (
                  <a
                    href={`http://localhost:3000${o.slip_image}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 underline text-xs text-neutral-300"
                  >
                    ดูสลิป
                  </a>
                )}
              </td>

              {/* คอลัมน์ติดตาม */}
              <td className="px-4 py-3">
                {o.tracking_code ? (
                  <a
                    href={trackingUrl(o.tracking_carrier, o.tracking_code)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline text-sky-300"
                    title={o.tracking_code}
                  >
                    {(TRACK_CARRIERS[o.tracking_carrier]?.label || "ติดตาม")} • {o.tracking_code}
                  </a>
                ) : (
                  <span className="text-neutral-500 text-sm">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-right text-white">{CURRENCY(o.total_price)}</td>
              <td className="px-4 py-3 text-neutral-400">
                {o.created_at ? new Date(o.created_at).toLocaleString("th-TH") : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openDetail(o.id)}
                  className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200"
                >
                  รายละเอียด
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

    {/* ⬇️ ADD: สรุปผล + เพจจิ้ง */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-4 py-3 bg-neutral-900 border-t border-neutral-800 rounded-b-2xl">
      <div className="text-sm text-neutral-400">
        แสดง {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
        –
        {Math.min(page * PAGE_SIZE, total)} จาก {total} รายการ
      </div>

      <div className="flex items-center gap-1">
        <button
          className="px-3 py-1.5 border border-neutral-700 rounded-lg text-neutral-200 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage(1)}
        >
          « หน้าแรก
        </button>
        <button
          className="px-3 py-1.5 border border-neutral-700 rounded-lg text-neutral-200 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ‹ ก่อนหน้า
        </button>

        <span className="px-2 text-sm text-neutral-300">
          หน้า {page} / {totalPages}
        </span>

        <button
          className="px-3 py-1.5 border border-neutral-700 rounded-lg text-neutral-200 disabled:opacity-50"
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          ถัดไป ›
        </button>
        <button
          className="px-3 py-1.5 border border-neutral-700 rounded-lg text-neutral-200 disabled:opacity-50"
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
        >
          หน้าสุดท้าย »
        </button>
      </div>
    </div>




      {detailOpen && detail?.order ? (
  <div className="fixed inset-0 z-30">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => setDetailOpen(false)}
    />
    <div
      className="absolute right-0 top-0 h-full w-full sm:w-[680px] 
                 bg-neutral-950 border-l border-neutral-800 
                 p-5 overflow-y-auto pb-28"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">
          ออเดอร์ {detail.order.order_code || `#${detail.order.id}`}
        </h3>
        <button
          onClick={() => setDetailOpen(false)}
          className="text-neutral-400 hover:text-white"
        >
          ปิด
        </button>
      </div>
            {/* สถานะคำสั่งซื้อ */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-1">สถานะคำสั่งซื้อ</label>
              <div className="flex gap-2">
                <select
                  value={statusDraft ?? detail.order.status ?? "pending"}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={saveStatus}
                  disabled={savingStatus}
                  className="px-3 py-2 rounded-xl bg-emerald-500 text-black font-medium hover:bg-emerald-400 disabled:opacity-60"
                >
                  {savingStatus ? "กำลังบันทึก..." : "บันทึกสถานะ"}
                </button>
              </div>
            </div>

            {/* การชำระเงิน */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-neutral-400 text-sm">การชำระเงิน</div>
                  <div className="mt-1">
                    <span className={chip(payClass(detail.order.payment_status))}>
                      {PAY_LABELS[detail.order.payment_status || "unpaid"]}
                    </span>
                    {detail.order.paid_at && (
                      <span className="ml-2 text-xs text-neutral-400">
                        ชำระเมื่อ {new Date(detail.order.paid_at).toLocaleString("th-TH")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {detail.order.payment_method === "transfer" ? (
                    <>
                      <button
                        onClick={markPaid}
                        disabled={paying || detail.order.payment_status === "paid"}
                        className="px-3 py-2 rounded-xl bg-emerald-500 text-black font-medium hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {paying ? "กำลังยืนยัน..." : "ยืนยันรับเงิน"}
                      </button>
                      <button
                        onClick={rejectSlip}
                        disabled={rejecting || detail.order.payment_status === "rejected" || !detail.order.slip_image}
                        className="px-3 py-2 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-500 disabled:opacity-60"
                      >
                        {rejecting ? "กำลังปฏิเสธ..." : "ปฏิเสธสลิป"}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400 self-center">
                      วิธีชำระ: เก็บเงินปลายทาง (ไม่ต้องยืนยันสลิป)
                    </span>
                  )}

{detail.order.status === "cancelled" && (
  <div className="mb-6 rounded-xl border border-rose-700 bg-rose-950/40 p-4 text-rose-200">
    <div className="text-sm font-semibold">เหตุผลการยกเลิก</div>
    <div className="mt-1 text-sm whitespace-pre-wrap">
      {detail.order.cancel_reason || "—"}
    </div>

    <div className="mt-1 text-xs text-rose-300/80">
      โดย: {ROLE_TH[detail.order.cancelled_by] || "ไม่ระบุ"}
      {detail.order.cancelled_at && (
        <>
          {" "}
          • เมื่อ{" "}
          {new Date(detail.order.cancelled_at).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </>
      )}
    </div>
  </div>
)}

                  <button
                    onClick={cancelOrder}
                    disabled={['cancelled','done','shipped'].includes(detail.order.status)}
                    className="px-3 py-2 rounded-xl bg-neutral-700 text-white font-medium hover:bg-neutral-600 disabled:opacity-60"
                  >
                    ยกเลิกออเดอร์
                  </button>
                </div>
              </div>

              {detail.order.slip_image && (
                <div className="mt-3">
                  <a
                    href={`http://localhost:3000${detail.order.slip_image}`}
                    target="_blank" rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={`http://localhost:3000${detail.order.slip_image}`}
                      alt="slip"
                      className="w-56 rounded-xl border border-neutral-800"
                    />
                  </a>
                  {detail.order.payment_amount != null && (
                    <div className="mt-2 text-sm text-neutral-300">
                      ยอดที่แจ้งโอน: <span className="font-medium">{CURRENCY(detail.order.payment_amount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ที่อยู่/การจัดส่ง */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-neutral-400 text-sm mb-1">ผู้รับ</div>
                <div className="text-white">{detail.order.full_name || "-"}</div>
                <div className="text-neutral-300 text-sm">{detail.order.phone || "-"}</div>
                <div className="text-neutral-300 text-sm">
                  {(detail.order.address_line || "-")}
                  {detail.order.subdistrict ? ` ${detail.order.subdistrict}` : ""}
                  {detail.order.district ? ` ${detail.order.district}` : ""}
                  {detail.order.province ? ` ${detail.order.province}` : ""}
                  {detail.order.postcode ? ` ${detail.order.postcode}` : ""}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="text-neutral-400 text-sm mb-1">การจัดส่ง/ชำระเงิน</div>
                <div className="text-neutral-300 text-sm">จัดส่ง: {detail.order.shipping_method || "-"}</div>
                <div className="text-neutral-300 text-sm">
                  ชำระเงิน: {detail.order.payment_method
  ? (PAYMENT_METHOD_TH[detail.order.payment_method] || detail.order.payment_method)
  : "—"}
                </div>
                {detail.order.note && <div className="text-neutral-300 text-sm mt-1">หมายเหตุ: {detail.order.note}</div>}

                {/* —— Tracking Form —— */}
                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <div className="text-white font-medium mb-2">ค่าขนส่ง/เลขพัสดุ</div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={trackingDraft.carrier}
                      onChange={(e) => setTrackingDraft(d => ({ ...d, carrier: e.target.value }))}
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="">— เลือกค่าย —</option>
                      {Object.entries(TRACK_CARRIERS).map(([val, obj]) => (
                        <option key={val} value={val}>{obj.label}</option>
                      ))}
                    </select>

                    <input
                      value={trackingDraft.code}
                      onChange={(e) => setTrackingDraft(d => ({ ...d, code: e.target.value }))}
                      onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
  }}
                      placeholder="เลขพัสดุ เช่น TH1234..., KEX..."
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white sm:col-span-2"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={saveTracking}
                      disabled={savingTracking}
                      className="px-3 py-2 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 disabled:opacity-60"
                    >
                      {savingTracking ? "กำลังบันทึก..." : "บันทึกเลขพัสดุ"}
                    </button>

                    <button
                      onClick={clearTracking}
                      className="px-3 py-2 rounded-xl bg-neutral-700 text-white hover:bg-neutral-600"
                    >
                      ล้าง
                    </button>

                    <button
                      onClick={copyTracking}
                      className="px-3 py-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700"
                    >
                      คัดลอกเลขพัสดุ
                    </button>

                    {(trackingDraft.code || detail.order.tracking_code) && (
                      <a
                        href={trackingUrl(trackingDraft.carrier || detail.order.tracking_carrier, trackingDraft.code || detail.order.tracking_code)}
                        target="_blank" rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500"
                      >
                        เปิดลิงก์ติดตาม
                      </a>
                    )}

                    {detail.order.tracking_code && (
                      <span className="text-xs text-neutral-400 self-center">
                        ล่าสุดบันทึก: {(TRACK_CARRIERS[detail.order.tracking_carrier]?.label || "—")} • {detail.order.tracking_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* รายการสินค้า */}
            <div className="mb-4">
              <div className="text-white font-semibold mb-2">สินค้า</div>
              <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-950 text-neutral-400">
                    <tr>
                      <th className="px-3 py-2 text-left">สินค้า</th>
                      <th className="px-3 py-2 text-right">ราคา/ชิ้น</th>
                      <th className="px-3 py-2 text-right">จำนวน</th>
                      <th className="px-3 py-2 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                    {(detail.items || []).map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {it.image && (
                              <img
                                src={`http://localhost:3000${it.image}`}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-neutral-800"
                              />
                            )}
                            <div className="text-white">
                              {(it.name || `#${it.product_id || "-"}`)} {it.size ? `• ${it.size}` : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-300">
                          {CURRENCY(it.unit_price ?? it.price_per_unit ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-300">{it.quantity ?? 0}</td>
                        <td className="px-3 py-2 text-right text-white">{CURRENCY(it.line_total ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* สรุปยอด */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 rounded-xl p-4 bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-inner">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-300">ยอดสินค้า</dt>
                    <dd className="font-medium tabular-nums">{CURRENCY(detail.order.subtotal ?? 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-300">ค่าส่ง</dt>
                    <dd className="font-medium tabular-nums">{CURRENCY(detail.order.shipping ?? 0)}</dd>
                  </div>
                  <div className="mt-2 pt-2 border-t border-neutral-600 flex items-baseline justify-between text-base">
                    <dt className="font-semibold text-white">ยอดรวม</dt>
                    <dd className="text-xl font-extrabold tracking-tight tabular-nums">
                      {CURRENCY(detail.order.total_price ?? 0)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



// ==== พาเล็ตและสไตล์กราฟ (โหมดมืดอ่านง่าย) ====
const CHART = {
  text: "#EAEAEA",
  subtext: "#B3B3B3",
  grid: "#3A3A3A",
  line: "#7DD3FC", // ฟ้า (เส้น line)
  bar:  "#A78BFA", // ม่วง (แท่ง)
  pie:  ["#60A5FA","#34D399","#FBBF24","#F472B6","#F87171","#22D3EE","#C084FC","#4ADE80"],
};
const axisTick = { fill: CHART.subtext, fontSize: 12 };
const gridStyle = { stroke: CHART.grid, strokeDasharray: "3 3" };
// ===== Helpers for recent-orders (วางนอก component) =====
const SERVER_ORIGIN = (() => {
  try { return new URL(API.products).origin; }
  catch { return window.location.origin; }
})();

// ต่อ URL ให้ครบทุกเคส: https://..., /uploads/xxx, uploads/xxx, หรือชื่อไฟล์ล้วน
function makeUrl(u) {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;               // URL เต็ม
  if (u.startsWith("/")) return `${SERVER_ORIGIN}${u}`; // "/uploads/xxx.jpg"
  if (u.startsWith("uploads/")) return `${SERVER_ORIGIN}/${u}`; // "uploads/xxx.jpg"
  return `${SERVER_ORIGIN}/uploads/${u}`;               // "xxx.jpg"
}

// ปรับ recent-orders ให้พร้อมใช้ (ฝั่งหน้าเว็บ)
function normalizeOrders(arr) {
  return (Array.isArray(arr) ? arr : []).map(o => ({
    order_id: o.order_id,
    order_time: o.order_time,
    status: o.status,
    shipping_method: o.shipping_method || "",
    buyer_name: o.buyer_name || "ลูกค้า",
    email: o.email || "",
    phone: o.phone || "",
    order_total: Number(o.order_total || 0),
    items: Array.isArray(o.items)
      ? o.items.map(it => {
          const raw = it.image || it.product_image || null; // รองรับหลายชื่อจาก API
          return {
            product_id: it.product_id,
            product_name: it.product_name,
            category_name: it.category_name || "ไม่ระบุ",
            quantity: Number(it.quantity || 0),
            unit_price: Number(it.unit_price || 0),
            line_total: Number(it.line_total || 0),
            image: raw,
            image_url: it.image_url || makeUrl(raw),
          };
        })
      : [],
  }));
}

const renderPieLabel = (p) => {
  const RAD = Math.PI / 180;
  const r = p.outerRadius + 18; 
  const x = p.cx + r * Math.cos(-p.midAngle * RAD);
  const y = p.cy + r * Math.sin(-p.midAngle * RAD);
  const anchor = x > p.cx ? "start" : "end";

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
    >
      <tspan fill="#AAA" fontSize={12}>{p.name}</tspan>
      <tspan dx="6" fontSize={16} fontWeight="bold" fill="#FFF" style={{ textShadow: "0 0 4px rgba(0,0,0,0.6)" }}>
        {(p.percent * 100).toFixed(0)}%
      </tspan>
    </text>
  );
};


function DashboardPanel() {
  const [overview, setOverview] = useState({ total_revenue: 0, orders_count: 0, customers: 0 });
  const [salesByDay, setSalesByDay] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===== helpers: image thumbs (ใน component ได้) =====
  const PLACEHOLDER = "https://placehold.co/64x64?text=IMG";
 const BarTT = ({ active, payload, label }) =>
  active && payload?.length ? (() => {
    const p = payload[0].payload; // ✅ เอา object ทั้งแถวของ bar
    return (
      <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white">
        <img
          src={p.image_url || p.image || PLACEHOLDER}
          alt={p.name}
          className="w-10 h-10 rounded object-cover border border-neutral-700"
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
        />
        <div>
          <div className="font-medium">{p.name || label}</div>
          <div className="text-neutral-400">ขายได้ {p.qty_sold} ชิ้น</div>
        </div>
      </div>
    );
  })() : null;
  // ===== Formatters =====
  const fmtTHB = (n) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtCompact = (n) =>
    new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n || 0));
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("th-TH", { month: "short", day: "numeric" }); }
    catch { return d; }
  };
  const fmtTimeAgo = (date) => {
    try {
      const d = new Date(date);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "เมื่อสักครู่";
      if (mins < 60) return `${mins} นาทีที่แล้ว`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
      const days = Math.floor(hrs / 24);
      if (days < 30) return `${days} วันก่อน`;
      return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    } catch { return ""; }
  };
  const fmtDateTime = (d) => {
    try { return new Date(d).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }); }
    catch { return d; }
  };

  // ===== Normalizers สำหรับกราฟ (ยังอยู่ใน component ได้) =====
  const normalizeSales = (arr) =>
    (Array.isArray(arr) ? arr : []).map((x, i) => ({
      day: x.day || x.date || x.created_at || `#${i + 1}`,
      revenue: Number(x.revenue ?? x.total ?? x.amount ?? x.sum ?? 0),
    }));
  const normalizeTop = (arr) =>
  (Array.isArray(arr) ? arr : []).map(x => ({
    product_id: x.product_id ?? x.id,
    name: x.name || `#${x.id ?? '-'}`,
    qty_sold: Number(x.qty_sold ?? 0),
    revenue: Number(x.revenue ?? 0),
    image_url: x.image_url || null,
  }));
  const normalizeCat = (arr) =>
    (Array.isArray(arr) ? arr : []).map((x) => ({
      category: x.category || x.category_name || x.name || "ไม่ระบุ",
      revenue: Number(x.revenue ?? x.total ?? x.amount ?? 0),
    }));

  // ===== Fetch =====
  useEffect(() => {
    const query = new URLSearchParams({
      from: `${new Date().getFullYear()}-01-01`,
      to: "2999-12-31",
      limit: "5",
    }).toString();

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [oRes, dRes, tRes, cRes, roRes] = await Promise.all([
          fetch(`${API.metrics}/overview?${query}`),
          fetch(`${API.metrics}/sales-by-day?${query}`),
          fetch(`${API.metrics}/top-products?${query}`),
          fetch(`${API.metrics}/category-breakdown?${query}`),
          fetch(`${API.metrics}/recent-orders?limit=10`)
        ]);

        const [o, d, t, c, ro] = await Promise.all([
          oRes.json(), dRes.json(), tRes.json(), cRes.json(),
          roRes.ok ? roRes.json() : Promise.resolve([]),
        ]);

        if (!oRes.ok || !dRes.ok || !tRes.ok || !cRes.ok) {
          throw new Error(`metrics error: ${oRes.status}/${dRes.status}/${tRes.status}/${cRes.status}`);
        }

        setOverview({
          total_revenue: Number(o?.total_revenue ?? o?.total ?? 0),
          orders_count: Number(o?.orders_count ?? o?.orders ?? 0),
          customers: Number(o?.customers ?? o?.unique_customers ?? 0),
        });
        setSalesByDay(normalizeSales(d));
        setTopProducts(normalizeTop(t));
        setByCategory(normalizeCat(c));
        setRecentOrders(normalizeOrders(ro)); // ← ใช้ helper นอก component
      } catch (err) {
        console.error("metrics fetch error:", err);
        setError(err?.message || "โหลดข้อมูลล้มเหลว");
        setOverview({ total_revenue: 0, orders_count: 0, customers: 0 });
        setSalesByDay([]);
        setTopProducts([]);
        setByCategory([]);
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // ✅ ไม่มี warning อีก เพราะ normalizeOrders อยู่ "นอก" component

  // ===== Fetch =====
  useEffect(() => {
    const query = new URLSearchParams({
      from: `${new Date().getFullYear()}-01-01`,
      to: "2999-12-31",
      limit: "5",
    }).toString();

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [oRes, dRes, tRes, cRes, roRes] = await Promise.all([
          fetch(`${API.metrics}/overview?${query}`),
          fetch(`${API.metrics}/sales-by-day?${query}`),
          fetch(`${API.metrics}/top-products?${query}`),
          fetch(`${API.metrics}/category-breakdown?${query}`),
          fetch(`${API.metrics}/recent-orders?limit=10`)
        ]);
        const [o, d, t, c, ro] = await Promise.all([
          oRes.json(), dRes.json(), tRes.json(), cRes.json(),
          roRes.ok ? roRes.json() : Promise.resolve([]),
        ]);
        if (!oRes.ok || !dRes.ok || !tRes.ok || !cRes.ok) {
          throw new Error(`metrics error: ${oRes.status}/${dRes.status}/${tRes.status}/${cRes.status}`);
        }

        setOverview({
          total_revenue: Number(o?.total_revenue ?? o?.total ?? 0),
          orders_count: Number(o?.orders_count ?? o?.orders ?? 0),
          customers: Number(o?.customers ?? o?.unique_customers ?? 0),
        });
        setSalesByDay(normalizeSales(d));
        setTopProducts(normalizeTop(t));
        setByCategory(normalizeCat(c));
        setRecentOrders(normalizeOrders(ro)); // ✅
      } catch (err) {
        console.error("metrics fetch error:", err);
        setError(err?.message || "โหลดข้อมูลล้มเหลว");
        setOverview({ total_revenue: 0, orders_count: 0, customers: 0 });
        setSalesByDay([]);
        setTopProducts([]);
        setByCategory([]);
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===== Reusable UI =====
  const Card = ({ children }) => (
    <div className="p-4 rounded-2xl shadow bg-neutral-900 border border-neutral-800">{children}</div>
  );
  const KPI = ({ title, value, icon }) => (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-neutral-400 text-xs">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
        </div>
        <div className="p-2 rounded-xl bg-neutral-800 text-neutral-200">{icon}</div>
      </div>
    </Card>
  );
  const Skeleton = ({ h = 180 }) => (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="h-9 border-b border-neutral-800 px-4 flex items-center font-semibold text-white/0">.</div>
      <div className="p-4" style={{ height: h }}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
  const NoData = ({ children = "ไม่มีข้อมูล" }) => (
    <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">{children}</div>
  );

  // ===== Custom tooltips =====
  const LineTT = ({ active, payload, label }) =>
    active && payload?.length ? (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white">
        <div className="font-medium">{fmtDate(label)}</div>
        <div className="text-neutral-300">{fmtTHB(payload[0].value)}</div>
      </div>
    ) : null;

  const PieTT = ({ active, payload }) =>
    active && payload?.length ? (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white">
        <div className="font-medium">{payload[0].name}</div>
        <div className="text-neutral-300">{fmtTHB(payload[0].value)}</div>
      </div>
    ) : null;

  const totalCatRevenue = byCategory.reduce((a, b) => a + (b.revenue || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="ยอดขายรวม" value={fmtTHB(overview.total_revenue)} icon={<FaChartLine />} />
        <KPI title="จำนวนออเดอร์" value={fmtCompact(overview.orders_count)} icon={<FaShoppingBag />} />
        <KPI title="ลูกค้าที่สั่งซื้อ" value={fmtCompact(overview.customers)} icon={<FaUsers />} />
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-700 bg-rose-950/40 text-rose-300 text-sm">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* Sales by day (Line) */}
      {loading ? (
        <Skeleton h={280} />
      ) : (
        <Card>
          <div className="mb-2 font-semibold text-white">ยอดขายรายวัน</div>
          <div className="relative" style={{ height: 280 }}>
            {salesByDay.length === 0 && <NoData />}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="day" tickFormatter={fmtDate} tick={axisTick} />
                <YAxis tickFormatter={(v) => fmtCompact(v)} tick={axisTick} />
                <Tooltip content={<LineTT />} />
                <Line type="monotone" dataKey="revenue" stroke={CHART.line} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Top products + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <Skeleton h={280} />
            <Skeleton h={280} />
          </>
        ) : (
          <>
<Card>
  <div className="mb-2 font-semibold text-white">สินค้าขายดี (ตามจำนวนชิ้น)</div>
  <div className="relative" style={{ height: 280 }}>
    {topProducts.length === 0 && <NoData />}
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={topProducts} margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={axisTick} />
        <YAxis allowDecimals={false} tick={axisTick} />
        {/* ✅ ใช้คอมโพเนนต์ BarTT */}
        <Tooltip content={<BarTT />} />
        <Bar
          dataKey="qty_sold"
          fill={CHART.bar}
          radius={[8, 8, 0, 0]}
          label={{ position: "top", fill: "#FFFFFF", fontSize: 12 }}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* รายการแบบ card พร้อมรูป (ถ้ามีส่วนนี้อยู่แล้วคงไว้ได้) */}
  <ul className="mt-3 space-y-2">
    {topProducts.map((p, i) => (
      <li key={p.id || i} className="flex items-center gap-3">
        <img
          src={p.image_url || p.image || PLACEHOLDER}
          alt={p.name}
          className="w-10 h-10 rounded object-cover border border-neutral-700"
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{p.name}</div>
          <div className="text-xs text-neutral-400">{p.qty_sold} ชิ้น</div>
        </div>
      </li>
    ))}
  </ul>
</Card>

<Card>
  <div className="mb-2 font-semibold text-white">ยอดขายตามหมวดหมู่</div>
  <div className="relative" style={{ height: 340 }}>
    {byCategory.length === 0 && <NoData />}

    <ResponsiveContainer width="100%" height="100%">
      <PieChart style={{ overflow: "visible" }}>
        <Pie
          data={byCategory}
          dataKey="revenue"
          nameKey="category"
          cx="50%"     // ✅ กึ่งกลางแนวนอน
          cy="50%"     // ✅ กึ่งกลางแนวตั้ง (ตรงกลางวงกลมจริง)
          innerRadius="52%"
          outerRadius="78%"
          labelLine
          label={renderPieLabel}
        >
          {byCategory.map((_, i) => (
            <Cell key={i} fill={CHART.pie[i % CHART.pie.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTT />} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ color: CHART.text, marginTop: 40 }}
        />
      </PieChart>
    </ResponsiveContainer>

    {/* ✅ center total (ตรงกลางวงกลมพอดี) */}
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-sm font-medium" style={{ color: CHART.subtext }}>
        รวม
      </div>
      <div className="text-lg font-bold mt-1" style={{ color: CHART.text }}>
        {fmtTHB(totalCatRevenue)}
      </div>
    </div>
  </div>
</Card>


          </>
        )}
      </div>

 {/* ✅ Recent orders – 10 ออเดอร์ล่าสุด */}
<Card>
  <div className="mb-2 font-semibold text-white">ออเดอร์ที่สำเร็จล่าสุด</div>
  <div className="relative">
    {loading ? (
      <div className="h-40"><Skeleton h={160} /></div>
    ) : recentOrders.length === 0 ? (
      <NoData>ยังไม่มีออเดอร์</NoData>
    ) : (
<ul className="divide-y divide-neutral-800">
  {recentOrders.map((o) => {
    const items   = Array.isArray(o.items) ? o.items : [];
    const show    = items.slice(0, 3);                       // โชว์ได้สูงสุด 3 ชิ้น
    const more    = Math.max(items.length - show.length, 0);
    const imgSrc = (it) => it.image_url || it.image || PLACEHOLDER;

    return (
      <li
        key={o.order_id}
        className="group py-3 flex items-start gap-3 transition-colors hover:bg-neutral-800/40 rounded-xl px-2 -mx-2"
      >
        {/* ซ้าย: เลขออเดอร์ + เวลาคร่าวๆ */}
        <div className="w-24 shrink-0">
          <div className="text-xs text-neutral-400">#{o.order_id}</div>
          <div className="text-[11px] text-neutral-500">{fmtTimeAgo(o.order_time)}</div>
        </div>

        {/* กลาง: รายการสินค้า (รูป + ชื่อ + ×จำนวน) เรียงเป็นบรรทัด */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">
            {o.buyer_name} <span className="text-neutral-400">• {o.shipping_method || "ไม่ระบุการจัดส่ง"}</span>
          </div>

          {show.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {show.map((it, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <img
                    src={imgSrc(it)}
                    alt={it.product_name || "product"}
                    loading="lazy"
                    className="w-8 h-8 rounded object-cover border border-neutral-700"
                    onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                  />
                  <div className="text-xs text-neutral-300 truncate">
                    {it.product_name}
                    {it.category_name && (
                      <span className="text-neutral-500"> • {it.category_name}</span>
                    )}
                    <span className="text-neutral-500"> • ×{it.quantity}</span>
                  </div>
                </li>
              ))}
              {more > 0 && (
                <li className="text-[11px] text-neutral-400">+{more} รายการ</li>
              )}
            </ul>
          ) : (
            <div className="text-xs text-neutral-500">ไม่มีสินค้า</div>
          )}
        </div>

        {/* ขวา: เวลาแน่นอน + ยอดรวม */}
        <div className="text-right w-28 shrink-0">
          <div className="text-xs text-neutral-400">{fmtDateTime(o.order_time)}</div>
          <div className="text-sm text-white font-semibold tabular-nums">
            {fmtTHB(o.order_total)}
          </div>
        </div>
      </li>
    );
  })}
</ul>
    )}
  </div>
</Card>
    </div>
  );
}

function UsersPanel() {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${API_BASE}/api/admin/users`);
      if (!res.ok) throw new Error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete(id) {
    if (!window.confirm("ยืนยันลบผู้ใช้นี้?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + (e.message || "ลบไม่สำเร็จ"));
    }
  }

  return (
    <div className="p-6 text-neutral-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">📋 ตารางผู้ใช้</h2>
        <button
          onClick={loadUsers}
          className="px-3 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
        >
          รีเฟรช
        </button>
      </div>

      {loading && <p className="text-neutral-400">⏳ กำลังโหลดข้อมูล...</p>}
      {err && <p className="text-red-400">❌ {err}</p>}

      {!loading && !err && (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-800 text-neutral-200">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">ชื่อผู้ใช้</th>
                <th className="px-4 py-2">อีเมล</th>
                <th className="px-4 py-2">เบอร์โทร</th>
                <th className="px-4 py-2">บทบาท</th>
                <th className="px-4 py-2 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-700 hover:bg-neutral-800">
                    <td className="px-4 py-2">{u.id}</td>
                    <td className="px-4 py-2">{u.username}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.phone || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 rounded-full text-sm bg-yellow-800 text-yellow-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="px-3 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600 text-sm"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-neutral-500">
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MobileTabBar({ user, onLogout }) {
  const loc = useLocation();
  const isActive = (path) => loc.pathname === path;

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
     <nav className="grid grid-cols-4 text-xs text-neutral-400">
  <Link to="/" className={`flex flex-col items-center py-2 ${isActive("/") && "text-white"}`}>
    <FaHome />
    หน้าแรก
  </Link>

  <Link to="/cart" className={`flex flex-col items-center py-2 ${isActive("/cart") && "text-white"}`}>
    <FaShoppingCart />
    ตะกร้า
  </Link>

  <Link to="/orders" className={`flex flex-col items-center py-2 ${isActive("/orders") && "text-white"}`}>
    <FaClipboardList />
    ออเดอร์
  </Link>

  <Link to="/admin" className={`flex flex-col items-center py-2 ${isActive("/admin") && "text-white"}`}>
    <FaUserShield />
    Admin
  </Link>
</nav>
    </div>
  );
}
/* -------------------- AdminPage (รวมทั้งหมด + mobile drawer) -------------------- */
export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login", { state: { from: "/admin" } });
    }
  }, [user, navigate]);

  // ปิดเมนูเมื่อเปลี่ยนแท็บ
  const handleChange = (key) => {
    setActive(key);
    setMobileOpen(false);
  };
  // ⭐ เพิ่มฟังก์ชันนี้
  const handleLogout = () => {
    console.log("logout clicked");
    // ถ้ามี AuthContext ให้เรียก logout() แทน console.log
    // เช่น: logout();
  };

 return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100 overflow-x-hidden">  {/* ⬅️ แก้ */}
      <TopBar title="แผงควบคุมผู้ดูแลระบบ" onMenu={() => setMobileOpen(true)} />
      <div className="max-w-7xl mx-auto md:flex">                                   {/* ⬅️ ลดให้ไม่มี gap ขาว */}
        <Sidebar
          active={active}
          onChange={handleChange}
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 min-w-0 p-3 md:p-6">                                 {/* ⬅️ เพิ่ม p-3 บนมือถือ */}
          {active === "products" && <ProductsPanel />}
          {active === "orders" && <OrdersPanel />}
          {active === "users" && <UsersPanel />}
          {active === "dashboard" && <DashboardPanel />}
        </main>
      </div>
      {/* ✅ เพิ่มตรงนี้ */}
      <MobileTabBar user={user} onLogout={handleLogout} />
    </div>
  );
}