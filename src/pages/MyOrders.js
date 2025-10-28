// src/pages/MyOrdersPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiRefreshCw, FiAlertCircle, FiCheckCircle, FiClock, FiX,
  FiTruck, FiPackage, FiCopy, FiUser, FiMapPin, FiPhone
} from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";
const FALLBACK_IMG = "https://placehold.co/48x48?text=IMG";

const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0));
// วางไว้เหนือคอมโพเนนต์
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// ===== helpers: ฟอร์แมตที่อยู่ไทย (รองรับ กทม.) =====
function formatThaiAddressParts({
  address_line, address_line2, detail,
  subdistrict, district, province, postal,
}) {
  const isBKK = /กรุงเทพ/i.test(String(province || ""));
  const L = isBKK
    ? { sub: "แขวง", dist: "เขต", prov: "กรุงเทพฯ" }
    : { sub: "ตำบล", dist: "อำเภอ", prov: "จังหวัด" };

  const line1 = [address_line, address_line2, detail]
    .filter((s) => (s ?? "").toString().trim() !== "")
    .join(" ")
    .trim();

  const line2 = [
    subdistrict ? `${L.sub} ${subdistrict}` : "",
    district    ? `${L.dist} ${district}`   : "",
  ].filter(Boolean).join(" ");

  const line3 = [
    province ? `${L.prov} ${province}` : "",
    postal   ? String(postal)          : "",
  ].filter(Boolean).join(" ");

  return [line1, line2, line3].filter(Boolean).join("\n");
}

function totalsFromOrder(o = {}) {
  // subtotal ของสินค้า
  const subtotal =
    num(o.subtotal) ||
    num(o.items_total) ||
    num(o.products_total) ||
    num(o.total_before_shipping) ||
    num(o.total_product_amount);

  // ค่าส่ง
  const shipping =
    num(o.shipping_fee) ||
    num(o.shipping_cost) ||
    num(o.delivery_fee) ||
    num(o.ship_fee);

 

  // ค่าธรรมเนียมอื่น ๆ
  const cod = num(o.cod_fee) || num(o.cod_cost);
  const other = num(o.fee_total) || num(o.service_fee) || num(o.platform_fee);

  // ถ้าแบ็กเอนด์มี grand/total_amount ก็ใช้ได้เลย
  const provided =
    num(o.grand_total) || num(o.total_amount) || num(o.total);

  const computed = subtotal + shipping + cod + other ;

  return {
    subtotal, shipping, cod, other,
    grand: provided || computed,
  };
}

const STATUS_TH = {
  pending: "รอดำเนินการ",
  ready_to_ship: "รอจัดส่ง",
  shipped: "จัดส่งแล้ว",
  done: "สำเร็จ",
  cancelled: "ยกเลิก",
};
const PAYMENT_TH = {
  unpaid: "ยังไม่ชำระ",
  submitted: "ส่งสลิปแล้ว",
  paid: "ชำระแล้ว",
  rejected: "สลิปถูกปฏิเสธ",
};
// ===== shipping label helpers =====
const SHIP_METHOD_TH = { standard: "จัดส่งธรรมดา", express: "จัดส่งด่วน" };

function shipLabelOf(raw) {
  const k = String(raw || "").trim().toLowerCase();
  if (!k) return "";
  if (k === "express" || k === "exp" || k.includes("express") || k.includes("ems")) return "จัดส่งด่วน";
  if (k === "standard" || k === "std" || k.includes("normal")) return "จัดส่งธรรมดา";
  return SHIP_METHOD_TH[k] || "";
}
function orderShipMethod(o = {}) {
  const direct =
    o.shipping_method ||
    o.ship_method ||
    o.delivery_method ||
    o.method ||
    o.shipping?.method ||
    o.shipping_info?.method ||
    o.shipping_address_snapshot?.method ||
    o.address_snapshot?.method ||
    o.shipping;

  if (shipLabelOf(direct)) return shipLabelOf(direct);

  const svc =
    o.shipping_service ||
    o.service ||
    o.shipping_info?.service ||
    o.shipping_address_snapshot?.service;
  if (shipLabelOf(svc)) return shipLabelOf(svc);

  const carrier =
    o.carrier ||
    o.tracking_carrier ||
    o.shipping_info?.carrier ||
    o.shipping_address_snapshot?.carrier;
  if (shipLabelOf(carrier)) return shipLabelOf(carrier);

  const track = o.tracking_code || o.tracking_no || o.tracking;
  if (typeof track === "string" && /^[Ee]/.test(track)) return "จัดส่งด่วน";

  return "";
}

// utils
const cx = (...c) => c.filter(Boolean).join(" ");
const statusPillColor = (s) => ({
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  ready_to_ship: "bg-violet-100 text-violet-800 border-violet-200",
  shipped: "bg-sky-100 text-sky-700 border-sky-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
}[s] || "bg-neutral-100 text-neutral-700 border-neutral-200");

const payPillColor = (p) => ({
  unpaid: "bg-neutral-100 text-neutral-800 border-neutral-200",
  submitted: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
}[p || "unpaid"]);

const ORDER_FLOW = ["pending", "ready_to_ship", "shipped", "done"];
const ORDER_FLOW_LABELS = ["รับคำสั่งซื้อ", "เตรียมจัดส่ง", "จัดส่งแล้ว", "สำเร็จ"];
// วางใกล้ๆ FALLBACK_IMG
const resolveImg = (v) => {
  if (!v) return FALLBACK_IMG;
  const s = String(v);
  if (/^https?:\/\//i.test(s)) return s;         // URL เต็ม
  if (s.startsWith("/")) return `${API_BASE}${s}`; // path เริ่มด้วย /
  return `${API_BASE}/${s}`;                      // ชื่อไฟล์ / path สั้น
};

/* ===== Tracking helpers ===== */
/* ===== Tracking helpers ===== */
const trackingUrl = (carrier, code) => {
  if (!code) return null;
  const c = String(carrier || "").toLowerCase();
  const q = encodeURIComponent(code);

  if (c.includes("kerry"))
    return `https://th.kerryexpress.com/th/track/?track=${q}`;
  if (c.includes("thai") || c.includes("ems"))
    return `https://track.thailandpost.co.th/?trackNumber=${q}`;
  if (c.includes("j&t") || c.includes("jnt"))
    return `https://www.jtexpress.co.th/index/query/gzquery.html?billcode=${q}`;
  if (c.includes("flash"))
    return `https://www.flashexpress.com/fle/tracking?se=${q}`;
  if (c.includes("best"))
    return `https://www.best-inc.co.th/track?bills=${q}`;
  if (c.includes("ninja") || c.includes("ninjavan"))
    return `https://www.ninjavan.co/th-th/tracking?id=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier || ""} ${code}`)}`;
};

/* ===== Stop events helper (กันคลิกไหลออกไปโดน <Link>) ===== */
function StopBubble({ children }) {
  const stop = (e) => e.stopPropagation(); // ❌ เอา preventDefault ออก
  return (
    <span
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onTouchStart={stop}
      onTouchEnd={stop}
      className="select-text cursor-text"
    >
      {children}
    </span>
  );
}

/* ===== Copyable (กัน event + คัดลอก) ===== */
function Copyable({ text, children, className }) {
  if (!text) return null;
  const doCopy = async () => {
    try { await navigator.clipboard?.writeText(String(text)); alert("คัดลอกแล้ว"); }
    catch (e) { console.error("copy failed:", e); }
  };
  const stopAll = (e) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <button
      type="button"
      onClick={(e)=>{ stopAll(e); doCopy(); }}
      onMouseDown={stopAll}
      onMouseUp={stopAll}
      onKeyDown={(e)=>{ if(e.key===" "||e.key==="Enter"){ stopAll(e); doCopy(); } }}
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs hover:bg-neutral-50 active:scale-[0.99]",
        className
      )}
      title="คัดลอก"
    >
      <FiCopy className="shrink-0" /> {children}
    </button>
  );
}

function TrackingBadge({ carrier, code, updatedAt }) {
  if (!code) return null;

  const url = trackingUrl(carrier, code);
  if (!url) return null;

  const openTrack = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="flex flex-col items-end gap-0.5 text-xs">
      <button
        type="button"
        onClick={openTrack}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 hover:bg-amber-200"
        title="กดเพื่อดูสถานะพัสดุ"
      >
        <FiTruck className="shrink-0" />
        {carrier ? `${carrier} • ` : ""}เลขพัสดุ: <span className="font-semibold">{code}</span>
      </button>
      {updatedAt && (
        <span className="text-neutral-400">
          อัปเดต {new Date(updatedAt).toLocaleString("th-TH")}
        </span>
      )}
    </div>
  );
}

function extractShipping(o = {}) {
  const snap =
    o.shipping_address_snapshot ||
    o.address_snapshot ||
    o.shipping_info ||
    o.user_snapshot ||
    null;

  const pick = (...arr) =>
    arr.find((v) => v != null && String(v).trim() !== "") || null;

  const name = pick(
    o.receiver_name, o.recipient_name, o.shipping_name, o.shipping_fullname,
    o.full_name, o.recipient, snap?.name, snap?.full_name, snap?.recipient, o.name
  );

  const phone = pick(
    o.phone, o.receiver_phone, o.shipping_phone, o.tel, o.mobile,
    snap?.phone, snap?.tel, snap?.mobile
  );

  const address_line  = pick(o.address_line, o.address_line1, snap?.address_line, snap?.address_line1);
  const address_line2 = pick(o.address_line2, snap?.address_line2);
  const detail        = pick(o.address_detail, o.shipping_address_detail, snap?.address_detail);
  const subdistrict   = pick(o.subdistrict, o.tambon, snap?.subdistrict, snap?.tambon);
  const district      = pick(o.district, o.amphoe, snap?.district, snap?.amphoe);
  const province      = pick(o.province, snap?.province);
  const postal        = pick(
    o.postal_code, o.postcode, o.zip, o.zipcode,
    snap?.postal_code, snap?.postcode, snap?.zip, snap?.zipcode
  );

  const strAddress = pick(
    o.shipping_address, o.address, o.address_full,
    o.shipping_address_text, snap?.address, snap?.address_full
  );

  // ถ้ามีสตริง address เต็มๆ อยู่แล้ว ใช้ได้เลย (แต่ยังทำความสะอาดบรรทัด)
  let addressText;
  if (strAddress) {
    const cleanLines = String(strAddress)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    addressText = cleanLines.join("\n");
  } else {
    // ✅ ฟอร์แมตเป็น ตำบล/อำเภอ/จังหวัด (หรือ แขวง/เขต/กรุงเทพฯ)
    addressText = formatThaiAddressParts({
      address_line, address_line2, detail,
      subdistrict, district, province, postal,
    });
  }

  return { name, phone, addressText, lines: addressText.split("\n") };
}


/* ===== Badges ===== */
function PaymentBadge({ method, status }) {
  const methodTH = method === "card" ? "บัตรเครดิต" : method === "cod" ? "ปลายทาง" : "โอน";
  const statusTH = PAYMENT_TH[status] || PAYMENT_TH.unpaid;
  const color = payPillColor(status || "unpaid");
  return (
    <span className={cx("px-2 py-0.5 text-xs rounded-full border inline-flex items-center gap-1", color)}>
      {status === "paid" ? <FiCheckCircle /> : status === "rejected" ? <FiX /> : <FiClock />}
      {methodTH} • {statusTH}
    </span>
  );
}

function OrderBadge({ status }) {
  return (
    <span className={cx("px-2 py-0.5 text-xs rounded-full border inline-flex items-center gap-1", statusPillColor(status))}>
      {status === "done" ? <FiCheckCircle /> : status === "cancelled" ? <FiX /> : <FiPackage />}
      {STATUS_TH[status] || status}
    </span>
  );
}
function OrderStepper({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-rose-700 text-sm">
        <FiX /> คำสั่งซื้อถูกยกเลิก
      </div>
    );
  }

  const idx = Math.max(0, ORDER_FLOW.indexOf(status));

  return (
    <div className="flex flex-col gap-1">
      {/* 🟢 การแก้ไข: นำ overflow-x-auto ออก และเพิ่มการ Scale ที่ปรับละเอียดขึ้น */}
      <div
        className="
          flex items-center gap-1 sm:gap-3 w-full flex-nowrap
          
          /* 💡 Key Fix: ใช้ Transform เพื่อ Scale องค์ประกอบทั้งหมดจากซ้าย */
          origin-left 
          
          /* ปรับขนาดตามความกว้างของหน้าจอที่แคบมากๆ */
          max-[375px]:scale-[0.9] /* iPhone SE หรือจอแคบอื่นๆ */
          max-[340px]:scale-[0.85] /* จอที่แคบกว่า 340px */
          max-[320px]:scale-[0.8] /* จอที่แคบที่สุด */
        "
      >
        {ORDER_FLOW_LABELS.map((label, i) => {
          const active = i <= idx;
          return (
            /* 💡 Key Fix: ลด gap และเพิ่ม flex-shrink-0 */
            <div key={label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0"> 
              <div
                className={cx(
                  "rounded-full grid place-items-center border flex-shrink-0",
                  /* 💡 Key Fix: ใช้ขนาด w-4 h-4 ที่เล็กที่สุดสำหรับมือถือ */
                  "w-4 h-4 text-[10px] sm:w-6 sm:h-6 sm:text-xs", 
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white text-neutral-400 border-neutral-300"
                )}
              >
                {i + 1}
              </div>

              <div
                className={cx(
                  /* 💡 Key Fix: ลดขนาด font ให้เล็กที่สุดและใช้ whitespace-nowrap */
                  "text-[10px] sm:text-xs leading-tight whitespace-nowrap", 
                  active ? "text-black font-medium" : "text-neutral-400"
                )}
                title={label}
              >
                {label}
              </div>

              {i < ORDER_FLOW_LABELS.length - 1 && (
                <div
                  className={cx(
                    "h-[2px] flex-shrink-0",
                    active ? "bg-black" : "bg-neutral-200",
                    /* 💡 Key Fix: ใช้ความกว้างเส้นเชื่อมที่สั้นที่สุด w-2 */
                    "w-2 sm:w-8 md:w-10" 
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[11px] sm:text-xs text-neutral-600">
        {`ตอนนี้อยู่ ขั้นที่ ${idx + 1} • ${ORDER_FLOW_LABELS[idx]}`}
      </div>
    </div>
  );
}
/* ===== Cancel Modal (fixed typing) ===== */
function CancelModal({ open, order, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setReason(""); setSubmitting(false); }
  }, [open]);

  if (!open) return null;

  const min = 1, max = 300;
  const valid = reason.trim().length >= min && reason.trim().length <= max;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    await onConfirm({ orderId: order?.order_id, reason: reason.trim() });
    setSubmitting(false);
    onClose();
  };

  return (
    // คลิกพื้นหลังเพื่อปิด
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] grid place-items-center p-4"
      onClick={onClose}
    >
      {/* กันคลิกทะลุเฉพาะกล่อง */}
      <div
        className="w-full max-w-lg rounded-2xl bg-white border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">ยืนยันการยกเลิกคำสั่งซื้อ</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-black" title="ปิด">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-sm text-neutral-600">
            คำสั่งซื้อ <b>#{order?.order_id}</b> จะถูกยกเลิก กรุณาระบุเหตุผล
          </div>

          <label className="block text-sm font-medium">
            เหตุผลในการยกเลิก <span className="text-rose-600">*</span>
          </label>

          {/* ไม่ใส่ preventDefault ใดๆ ที่ textarea */}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="เช่น ที่อยู่ผิด / สั่งซ้ำ / เปลี่ยนใจ / โอนผิด ฯลฯ"
          />

          <div className="flex items-center justify-between text-xs">
            <span className={valid ? "text-emerald-600" : "text-rose-600"}>
              {valid ? "พร้อมส่ง" : `พิมพ์อย่างน้อย ${min} ตัวอักษร และไม่เกิน ${max}`}
            </span>
            <span className="text-neutral-500">{reason.trim().length} / {max}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs">
            หมายเหตุ: หากร้านค้าเริ่มจัดส่งแล้ว อาจไม่สามารถยกเลิกได้
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl border hover:bg-neutral-50 text-sm"
            disabled={submitting}
          >
            ปิด
          </button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className={cx(
              "h-10 px-4 rounded-xl text-white text-sm inline-flex items-center gap-2",
              valid && !submitting ? "bg-rose-600 hover:bg-rose-700" : "bg-rose-300 cursor-not-allowed"
            )}
          >
            {submitting ? "กำลังยกเลิก..." : <><FiX /> ยืนยันยกเลิก</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Page ===== */
export default function MyOrdersPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const openCancel = (order) => { setCancelTarget(order); setCancelOpen(true); };
  const closeCancel = () => { setCancelOpen(false); setCancelTarget(null); };

  // โหลดรายการของฉัน
  const reloadMine = useCallback(async () => {
    const qUser = encodeURIComponent(user?.user_id ?? "");
    const qEmail = encodeURIComponent(user?.email ?? "");
    const res = await fetch(`${API_BASE}/api/my-orders?userId=${qUser}&email=${qEmail}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLastRefreshedAt(new Date());
  }, [user?.user_id, user?.email]);

  // ยกเลิกออเดอร์ (ส่งเหตุผล)
  async function cancelOrder(orderId, reason) {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: user?.user_id, reason: String(reason || "").trim() }),
        credentials: "omit",
      });
      if (!res.ok) {
        const t = await res.text();
        alert(t || "ยกเลิกคำสั่งซื้อไม่สำเร็จ");
        return;
      }
      await reloadMine();
      alert("ยกเลิกคำสั่งซื้อเรียบร้อย");
    } catch (e) {
      console.error("cancel order error:", e);
      alert("เกิดข้อผิดพลาดในการยกเลิก");
    }
  }

  useEffect(() => {
    if (!user) {
      nav("/login", { state: { from: "/my-orders" } });
      return;
    }
    (async () => {
      try { setLoading(true); setErr(""); await reloadMine(); }
      catch { setErr("โหลดรายการคำสั่งซื้อไม่สำเร็จ"); }
      finally { setLoading(false); }
    })();
  }, [user, nav, reloadMine]);

  const sortedAndFiltered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    if (statusFilter === "all") return sorted;
    return sorted.filter((o) => (o.status || "").toLowerCase() === statusFilter);
  }, [rows, statusFilter]);

  const summary = useMemo(() => {
  const norm = (v) => String(v || "").toLowerCase();
  const paidRows = rows.filter(
    (r) => norm(r.payment_status) === "paid" && norm(r.status) !== "cancelled"
  );
  const totalAmount = paidRows.reduce(
    (sum, r) => sum + totalsFromOrder(r).grand,
    0
  );
    const totalOrders = rows.length;
    const byStatus = rows.reduce((acc, r) => {
      const k = norm(r.status || "unknown");
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return { totalOrders, totalAmount, paidCount: paidRows.length, byStatus };
  }, [rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: summary.byStatus.pending || 0,
    ready_to_ship: summary.byStatus.ready_to_ship || 0,
    shipped: summary.byStatus.shipped || 0,
    done: summary.byStatus.done || 0,
    cancelled: summary.byStatus.cancelled || 0,
  }), [rows, summary]);

  const empty = !loading && sortedAndFiltered.length === 0;

  const FILTERS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "pending", label: STATUS_TH.pending },
    { key: "ready_to_ship", label: STATUS_TH.ready_to_ship },
    { key: "shipped", label: STATUS_TH.shipped },
    { key: "done", label: STATUS_TH.done },
    { key: "cancelled", label: STATUS_TH.cancelled },
  ];

  const activeFilter = FILTERS.find(f => f.key === statusFilter) || FILTERS[0];
  const activeCount = counts[statusFilter] ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-5">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden border">
        <div className="bg-gradient-to-r from-black via-neutral-800 to-neutral-700 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70 mb-1">
              <Link to="/" className="hover:underline">หน้าแรก</Link> <span className="mx-1">/</span> คำสั่งซื้อของฉัน
            </div>
            <h1 className="text-2xl font-bold tracking-tight">🧾 คำสั่งซื้อของฉัน</h1>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition"
            title="รีเฟรช"
          >
            <FiRefreshCw />
            รีเฟรช
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-6 bg-white">
          <SummaryCard title="จำนวนคำสั่งซื้อ" value={summary.totalOrders} />
          <SummaryCard title="ยอดใช้จ่ายรวม" value={<span className="text-emerald-600">{formatTHB(summary.totalAmount)}</span>} />
          <div className="rounded-xl border p-4">
            <div className="text-sm text-neutral-500">สถานะล่าสุด</div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {Object.entries(summary.byStatus).map(([k, v]) => (
                <span key={k} className="px-2 py-0.5 rounded-full bg-neutral-50 border">
                  {(STATUS_TH[k] || k)}: <b>{v}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Viewing bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border rounded-xl px-4 py-3">
        <div className="text-sm">กำลังดู: <b>{activeFilter.label}</b> {`(${activeCount})`}</div>
        <div className="text-xs text-neutral-500">
          {lastRefreshedAt ? `อัปเดตล่าสุด: ${lastRefreshedAt.toLocaleString("th-TH")}` : "—"}
        </div>
      </div>

      {/* Filters */}
      {/* Filters (mobile scrollable) */}
<div className="-mx-4 px-4 w-full overflow-x-auto">
  <div className="inline-flex whitespace-nowrap rounded-full border bg-white p-1 shadow-sm">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cx(
                "px-4 h-10 rounded-full text-sm transition relative",
                statusFilter === key ? "bg-black text-white shadow" : "hover:bg-neutral-50"
              )}
            >
              <span>{label}</span>
              <span
                className={cx(
                  "ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs border",
                  statusFilter === key ? "bg-white/10 border-white/20" : "bg-neutral-100 border-neutral-200 text-neutral-700"
                )}
              >
                {counts[key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <FiAlertCircle className="shrink-0" />
          <span className="text-sm">{err}</span>
        </div>
      )}

      {!loading && !err && (
        empty ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sortedAndFiltered.map((o) => {
              const ship = extractShipping(o);
               const t = totalsFromOrder(o);
               const shipLabel = orderShipMethod(o); 
              return (
                <Link
                  key={o.order_id}
                  to={`/orders/${o.order_id}`}
                  className="block bg-white border rounded-2xl p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                     <div className="flex flex-wrap items-center gap-2">
  <div className="font-semibold truncate">คำสั่งซื้อ #{o.order_id}</div>
  <OrderBadge status={o.status} />
  <PaymentBadge method={o.payment_method} status={o.payment_status} />
  
  {/* 🚚 ป้ายวิธีจัดส่ง (ต่อท้ายป้ายชำระเงิน) */}
  {shipLabel && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-neutral-50 text-neutral-800 text-xs">
      <FiTruck className="text-neutral-600" />
      {shipLabel}
    </span>
  )}
</div>

                      <div className="text-xs text-neutral-500 mt-0.5">
                        {new Date(o.order_date).toLocaleString("th-TH")} • {o.total_items} ชิ้น
                      </div>
{/* ผู้รับ & ที่อยู่จัดส่ง */}
<div className="mt-3 rounded-xl border border-dashed bg-neutral-50/60 p-3">
  <div className="grid gap-3 w-full md:grid-cols-3 md:items-start">

    {/* ชื่อ */}
    <div className="flex flex-wrap items-start gap-2 min-w-0 w-full">
      <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
        <FiUser className="text-neutral-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-neutral-500">ผู้รับ</div>
        <StopBubble>
          <div className="text-sm font-medium text-neutral-900 whitespace-normal break-words"
               style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {ship.name || "—"}
          </div>
        </StopBubble>
      </div>
      {ship.name && (
        <div className="order-last basis-full sm:order-none sm:basis-auto mt-2 sm:mt-0">
          <Copyable text={ship.name}>คัดลอก</Copyable>
        </div>
      )}
    </div>

    {/* เบอร์ */}
    <div className="flex flex-wrap items-start gap-2 min-w-0 w-full">
      <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
        <FiPhone className="text-neutral-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-neutral-500">เบอร์</div>
        <StopBubble>
          <div className="text-sm font-medium text-neutral-900 whitespace-normal break-words"
               style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {ship.phone || "—"}
          </div>
        </StopBubble>
      </div>
      {ship.phone && (
        <div className="order-last basis-full sm:order-none sm:basis-auto mt-2 sm:mt-0">
          <Copyable text={ship.phone}>คัดลอก</Copyable>
        </div>
      )}
    </div>

    {/* ที่อยู่ */}
    <div className="flex flex-wrap items-start gap-2 min-w-0 w-full md:col-span-1">
      <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
        <FiMapPin className="text-neutral-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-neutral-500">ที่อยู่จัดส่ง</div>
        
        <StopBubble>
          <div className="text-sm font-medium text-neutral-900 whitespace-pre-line"
               style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {ship.addressText || "—"}
          </div>
        </StopBubble>
      </div>
      {ship.addressText && (
        <div className="order-last basis-full sm:order-none sm:basis-auto mt-2 sm:mt-0">
          <Copyable text={ship.addressText}>คัดลอก</Copyable>
        </div>
      )}
    </div>

  </div>
</div>

                      <div className="mt-3">
                        <OrderStepper status={o.status} />
                      </div>
{o.status === "cancelled" && (
  <div className="mt-2 flex flex-wrap gap-2">
    {o.cancel_reason && (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-rose-100 text-rose-800 border border-rose-200">
        เหตุผล: {o.cancel_reason}
      </span>
    )}
    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-neutral-100 text-neutral-800 border">
      ยกเลิกโดย: {({ buyer: "ผู้ซื้อ", admin: "แอดมิน", system: "ระบบ" }[o.cancelled_by] || "ไม่ระบุ")}
    </span>
    {o.cancelled_at && (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-neutral-100 text-neutral-800 border">
        เมื่อ: {new Date(o.cancelled_at).toLocaleString()}
      </span>
    )}
  </div>
)}

                     {/* รูปสินค้า + รายชื่อ (เวอร์ชันสั้น ดูได้แน่) */}
{(o.items ?? []).length > 0 ? (
  <div className="mt-3 space-y-2">
    {o.items.map((it, idx) => {
      const name = it.item_name || it.name || it.item_type || "สินค้า";
      const qty  = Number(it.quantity || 1);
      const img  = it.item_image || it.image || it.image_url; // รองรับหลายชื่อฟิลด์

      return (
        <div
          key={it.order_detail_id || it.id || `item-${idx}`}
          className="flex items-center gap-3 rounded-lg border bg-neutral-50 p-2 hover:bg-neutral-100"
          onClick={(e) => e.stopPropagation()}
          title={name}
        >
          <img
            src={resolveImg(img)}
            alt={name}
            className="w-12 h-12 rounded-md object-cover border shrink-0"
            onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-gray-500">× {qty}</div>
          </div>
        </div>
      );
    })}
  </div>
) : null}
</div> {/* ✅ ปิด div.min-w-0 flex-1 ฝั่งซ้าย */}

<div className="flex flex-col items-end gap-2 shrink-0">
  <TrackingBadge
    carrier={o.carrier}
    code={o.tracking_code}
    updatedAt={o.tracking_updated_at}
  />

                      {(["pending", "ready_to_ship"].includes(o.status) && !o.carrier && !o.tracking_code) && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCancel(o); }}
                          className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm"
                          title="ยกเลิกคำสั่งซื้อนี้"
                        >
                          <FiX /> ยกเลิกคำสั่งซื้อ
                        </button>
                      )}

                     
<div className="font-bold text-emerald-600 whitespace-nowrap">
  {formatTHB(t.grand)}
</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Cancel modal */}
      <CancelModal
        open={cancelOpen}
        order={cancelTarget}
        onClose={closeCancel}
        onConfirm={({ orderId, reason }) => cancelOrder(orderId, reason)}
      />
    </div>
  );
}

/* ===== Subcomponents ===== */
function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border p-4 bg-white shadow-sm hover:shadow-md transition">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border rounded-2xl p-4 bg-white shadow-sm animate-pulse">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-md bg-neutral-200" />
        <div className="flex-1">
          <div className="h-4 w-1/3 bg-neutral-200 rounded mb-2" />
          <div className="h-3 w-2/3 bg-neutral-200 rounded mb-1.5" />
          <div className="h-3 w-1/2 bg-neutral-200 rounded mb-3" />
          <div className="h-8 w-full bg-neutral-100 rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center border rounded-2xl bg-white">
      <div className="text-5xl mb-3">🛒</div>
      <h3 className="text-lg font-semibold">ไม่พบคำสั่งซื้อในสถานะนี้</h3>
      <p className="text-neutral-600 text-sm mt-1">เริ่มเลือกสินค้าถูกใจ แล้วย้อนกลับมาดูที่นี่ได้เลย</p>
      <Link to="/" className="inline-block mt-3 px-4 py-2 rounded-xl border hover:bg-neutral-50">
        เริ่มช้อปเลย
      </Link>
    </div>
  );
}
