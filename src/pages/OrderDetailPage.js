// src/pages/OrderDetailPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiArrowLeft, FiAlertCircle, FiCheckCircle, FiClock, FiCopy, FiMapPin, FiPhone,
  FiPackage, FiTruck, FiUser, FiX
} from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";
const FALLBACK_IMG = "https://placehold.co/64x64?text=IMG";
const CANCELLED_BY_TH = {
  buyer: "ผู้ซื้อ",
  admin: "เเอดมิน"
};
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

// ===== helpers =====
const cx = (...c) => c.filter(Boolean).join(" ");
const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n || 0));

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

const trackingUrl = (carrier, code) => {
  if (!code) return null;
  const c = String(carrier || "").toLowerCase();
  const q = encodeURIComponent(code);
  if (c.includes("kerry")) return `https://th.kerryexpress.com/th/track/?track=${q}`;
  if (c.includes("thai") || c.includes("ems")) return `https://track.thailandpost.com/?trackNumber=${q}`;
  if (c.includes("j&t") || c.includes("jnt")) return `https://www.jtexpress.co.th/service/track/${q}`;
  if (c.includes("flash")) return `https://www.flashexpress.com/fle/tracking?se=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier || ""} ${code}`)}`;
};

function StopBubble({ children }) {
  const stop = (e) => e.stopPropagation();  // ✅ เอา preventDefault ออก
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
      className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs hover:bg-neutral-50", className)}
      title="คัดลอก"
    >
      <FiCopy className="shrink-0" /> {children}
    </button>
  );
}

function OrderStepper({ status }) {
  if (status === "cancelled") {
    return (<div className="flex items-center gap-2 text-rose-700 text-sm"><FiX /> คำสั่งซื้อถูกยกเลิก</div>);
  }
  const idx = Math.max(0, ORDER_FLOW.indexOf(status));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 flex-wrap">
        {ORDER_FLOW_LABELS.map((label, i) => {
          const active = i <= idx;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cx("w-6 h-6 rounded-full grid place-items-center text-xs border",
                active ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-300")}>
                {i + 1}
              </div>
              <div className={cx("text-xs", active ? "text-black font-medium" : "text-neutral-400")}>{label}</div>
              {i < ORDER_FLOW_LABELS.length - 1 && (
                <div className={cx("w-8 h-[2px]", active ? "bg-black" : "bg-neutral-200")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-neutral-600">{`ตอนนี้อยู่ ขั้นที่ ${idx + 1} • ${ORDER_FLOW_LABELS[idx]}`}</div>
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
    o.receiver_name, o.recipient_name, o.full_name, o.shipping_fullname,
    snap?.name, snap?.full_name
  );

  const phone = pick(o.phone, o.receiver_phone, o.tel, snap?.phone, snap?.tel);

  const address_line  = pick(o.address_line, o.address_line1, snap?.address_line, snap?.address_line1);
  const address_line2 = pick(o.address_line2, snap?.address_line2);
  const detail        = pick(o.address_detail, o.shipping_address_detail, snap?.address_detail);
  const subdistrict   = pick(o.subdistrict, o.tambon, snap?.subdistrict, snap?.tambon);
  const district      = pick(o.district, o.amphoe, snap?.district, snap?.amphoe);
  const province      = pick(o.province, snap?.province);
  const postal        = pick(
    o.postal_code, o.postcode, o.zip, snap?.postal_code, snap?.postcode, snap?.zip
  );

  // ถ้าแบ็กเอนด์มี address เต็มเป็นสตริงอยู่แล้ว ใช้ได้เลย
  const strAddress = pick(
    o.shipping_address, o.address, o.address_full,
    o.shipping_address_text, snap?.address, snap?.address_full
  );

  let addressText;
  if (strAddress) {
    addressText = String(strAddress)
      .split(/\r?\n/).map(s => s.trim()).filter(Boolean).join("\n");
  } else {
    // ✅ ฟอร์แมต ตำบล/อำเภอ/จังหวัด (หรือ แขวง/เขต/กรุงเทพฯ)
    addressText = formatThaiAddressParts({
      address_line, address_line2, detail,
      subdistrict, district, province, postal,
    });
  }

  return { name, phone, addressText };
}


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
    await onConfirm({
      orderId: order?.order_id || order?.id || order?.order_code,
      reason: reason.trim(),
    });
    setSubmitting(false);
    onClose();
  };

  return (
    // ✅ คลิกพื้นหลังปิด modal ได้
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] grid place-items-center p-4"
      onClick={onClose}
    >
      {/* ✅ กันคลิกทะลุเฉพาะตัวกล่อง ไม่ใช้ preventDefault ที่ overlay */}
      <div
        className="w-full max-w-lg rounded-2xl bg-white border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">ยืนยันการยกเลิกคำสั่งซื้อ</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black" title="ปิด">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="text-sm text-neutral-600">
            คำสั่งซื้อ <b>#{order?.order_code || order?.id || order?.order_id}</b> จะถูกยกเลิก กรุณาระบุเหตุผล
          </div>

          <label className="block text-sm font-medium">
            เหตุผลในการยกเลิก <span className="text-rose-600">*</span>
          </label>

          {/* ✅ เอา preventDefault ออก ให้โฟกัส/พิมพ์ได้ */}
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
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border hover:bg-neutral-50 text-sm" disabled={submitting}>
            ปิด
          </button>
          <button
            type="button"
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

export default function OrderDetailPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { orderId } = useParams();

  const [o, setO] = useState(null);      // { order + items }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // modal state
  const [cancelOpen, setCancelOpen] = useState(false);

  // ลองหลาย endpoint เพื่อให้เข้ากับ backend ปัจจุบันของคุณ
  const fetchDetail = useCallback(async () => {
    setErr("");
    const candidates = [
      `${API_BASE}/api/my-orders/${orderId}`,
      `${API_BASE}/api/orders/${orderId}`,
      `${API_BASE}/api/admin/orders/${orderId}`
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.order || data?.items) {
          setO({ order: data.order || data, items: data.items || data.order?.items || [] });
          return;
        }
        if (data && (data.id || data.order_id)) {
          setO({ order: data, items: data.items || [] });
          return;
        }
      } catch (e) { /* try next */ }
    }
    setErr("ไม่พบคำสั่งซื้อนี้ หรือคุณไม่มีสิทธิ์เข้าถึง");
  }, [orderId]);

  useEffect(() => {
    if (!user) {
      nav("/login", { state: { from: `/orders/${orderId}` } });
      return;
    }
    (async () => {
      try { setLoading(true); await fetchDetail(); }
      finally { setLoading(false); }
    })();
  }, [user, nav, orderId, fetchDetail]);

  const ship = useMemo(() => extractShipping(o?.order || {}), [o?.order]);
  const sum = useMemo(() => {
    const sub = (o?.items || []).reduce((a, it) => a + Number(it.line_total ?? it.quantity * it.unit_price ?? 0), 0);
    const shipping = Number(o?.order?.shipping ?? o?.order?.shipping_fee ?? 0);
    const total = Number(o?.order?.total_price ?? o?.order?.total_amount ?? sub + shipping);
    return { sub, shipping, total };
  }, [o]);

  const canCancel = useMemo(() => {
    const s = String(o?.order?.status || "").toLowerCase();
    return ["pending", "ready_to_ship"].includes(s) && !o?.order?.tracking_code && !o?.order?.carrier;
  }, [o]);

  // ยกเลิกออเดอร์ (ส่งเหตุผล)
  async function cancelOrderWithReason(orderIdToCancel, reason) {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderIdToCancel}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_id: user?.user_id, reason: String(reason || "").trim() }),
      });
      if (!res.ok) {
        const t = await res.text();
        alert(t || "ยกเลิกคำสั่งซื้อไม่สำเร็จ");
        return;
      }
      await fetchDetail();
      alert("ยกเลิกคำสั่งซื้อแล้ว");
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการยกเลิก");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="h-10 w-40 bg-neutral-200 rounded mb-3 animate-pulse" />
        <div className="h-48 bg-neutral-100 border rounded-2xl animate-pulse" />
      </div>
    );
  }
  if (err) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <Link to="/orders" className="inline-flex items-center gap-2 mb-3 text-sm">
          <FiArrowLeft /> กลับไปคำสั่งซื้อของฉัน
        </Link>
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <FiAlertCircle className="shrink-0" />
          <span className="text-sm">{err}</span>
        </div>
      </div>
    );
  }
  if (!o?.order) return null;

  const od = o.order;
  const kShowCarrier = od.carrier || od.tracking_carrier;
  const kShowTrack = od.tracking_code || od.tracking_no || od.tracking;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
       <Link to="/orders" className="inline-flex items-center gap-2 text-sm">
          <FiArrowLeft /> กลับไปคำสั่งซื้อของฉัน
        </Link>
        <div className="text-xs text-neutral-500">
          สร้างเมื่อ {od.created_at ? new Date(od.created_at).toLocaleString("th-TH") : "-"}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-lg">คำสั่งซื้อ #{od.order_code || od.id || od.order_id}</div>
          <span className={cx("px-2 py-0.5 text-xs rounded-full border inline-flex items-center gap-1", statusPillColor(od.status))}>
            <FiPackage /> {STATUS_TH[od.status] || od.status}
          </span>
          {/* เหตุผลการยกเลิก (ถ้ามี) */}
{od.status === "cancelled" && (
  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
    <div className="text-sm font-semibold text-rose-800">เหตุผลการยกเลิก</div>
    <div className="mt-1 text-sm text-rose-900 whitespace-pre-wrap">
      {od.cancel_reason || "—"}
    </div>
    <div className="mt-1 text-xs text-rose-700/80">
  โดย: {CANCELLED_BY_TH[od.cancelled_by] || od.cancelled_by || "—"}
  {od.cancelled_at && (
    <>
      {" • เมื่อ "}
      {new Date(od.cancelled_at).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}{" "}
      {new Date(od.cancelled_at).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </>
  )}
</div>
  </div>
)}

          <span className={cx("px-2 py-0.5 text-xs rounded-full border inline-flex items-center gap-1", payPillColor(od.payment_status))}>
            {od.payment_status === "paid" ? <FiCheckCircle /> : od.payment_status === "rejected" ? <FiX /> : <FiClock />}
            {(od.payment_method === "cod" ? "ปลายทาง" : "โอน")} • {PAYMENT_TH[od.payment_status] || "ยังไม่ชำระ"}
          </span>

          {(kShowTrack || kShowCarrier) && (
            <button
              type="button"
              onClick={() => window.open(trackingUrl(kShowCarrier, kShowTrack), "_blank", "noopener")}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs"
            >
              <FiTruck /> {(kShowCarrier || "ติดตาม")} • เลขพัสดุ: <b>{kShowTrack}</b>
            </button>
          )}
        </div>

        {/* ผู้รับ / ที่อยู่ */}
        <div className="rounded-xl border border-dashed bg-neutral-50/60 p-3">
          <div className="grid gap-3 md:grid-cols-3 md:items-start">
            <div className="flex items-start gap-2 min-w-0">
              <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
                <FiUser className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">ผู้รับ</div>
                <StopBubble>
                  <div className="text-sm font-medium text-neutral-900 break-words whitespace-pre-wrap">
                    {ship.name || "—"}
                  </div>
                </StopBubble>
              </div>
              {ship.name && <Copyable text={ship.name} className="ml-2">คัดลอกชื่อ</Copyable>}
            </div>

            <div className="flex items-start gap-2 min-w-0">
              <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
                <FiPhone className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">เบอร์</div>
                <StopBubble>
                  <div className="text-sm font-medium text-neutral-900 break-words whitespace-pre-wrap">
                    {ship.phone || "—"}
                  </div>
                </StopBubble>
              </div>
              {ship.phone && <Copyable text={ship.phone} className="ml-2">คัดลอกเบอร์</Copyable>}
            </div>

            <div className="flex items-start gap-2 md:col-span-1 min-w-0">
              <div className="w-7 h-7 mt-0.5 rounded-full bg-white border grid place-items-center">
                <FiMapPin className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">ที่อยู่จัดส่ง</div>
                <StopBubble>
                  <div className="text-sm font-medium text-neutral-900 break-words whitespace-pre-line">
                    {ship.addressText || "—"}
                  </div>
                </StopBubble>
              </div>
              {ship.addressText && <Copyable text={ship.addressText} className="ml-2">คัดลอกที่อยู่</Copyable>}
            </div>
          </div>
        </div>

        {/* แถบสถานะ */}
        <OrderStepper status={od.status} />

        {/* รายการสินค้า */}
        <div className="border rounded-xl">
          <div className="px-4 py-3 border-b bg-neutral-50 font-semibold">สินค้าในคำสั่งซื้อ</div>
          <div className="divide-y">
            {(o.items || []).map((it, idx) => (
              <div key={it.id || it.order_detail_id || idx} className="p-3 flex items-center gap-3">
                <img
                  src={it.image || it.item_image || FALLBACK_IMG}
                  onError={(e)=>{ e.currentTarget.src = FALLBACK_IMG; }}
                  alt={it.name || it.item_name || "สินค้า"}
                  className="w-14 h-14 rounded-md object-cover border"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {it.name || it.item_name || it.product_name || "สินค้า"}
                    {it.size ? <span className="text-neutral-500"> • {it.size}</span> : null}
                  </div>
                  <div className="text-xs text-neutral-500">x{Number(it.quantity || 1)}</div>
                </div>
                <div className="text-right text-sm font-semibold">
                  {formatTHB(Number(it.line_total ?? (it.quantity || 1) * (it.unit_price || 0)))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* slip (ถ้ามี) */}
        {od.slip_image && (
          <div className="rounded-xl border p-3">
            <div className="text-sm text-neutral-500 mb-2">สลิปโอนเงิน</div>
            <a href={`${API_BASE}${od.slip_image}`} target="_blank" rel="noreferrer">
              <img src={`${API_BASE}${od.slip_image}`} alt="slip" className="w-64 rounded-md border" />
            </a>
            {od.payment_amount != null && (
              <div className="mt-2 text-sm">ยอดที่แจ้งโอน: <b>{formatTHB(od.payment_amount)}</b></div>
            )}
          </div>
        )}

        {/* สรุปยอด + ปุ่ม */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-sm text-neutral-500">
             {od.updated_at ? new Date(od.updated_at).toLocaleString("th-TH") : ""}
          </div>
          <div className="w-full sm:w-auto">
            <div className="rounded-xl border p-4 bg-neutral-50">
              <div className="flex items-center justify-between text-sm">
                <div className="text-neutral-600">ยอดสินค้า</div>
                <div className="font-medium">{formatTHB(sum.sub)}</div>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <div className="text-neutral-600">ค่าส่ง</div>
                <div className="font-medium">{formatTHB(sum.shipping)}</div>
              </div>
              <div className="flex items-center justify-between text-base mt-2 pt-2 border-t">
                <div className="font-semibold">ยอดรวม</div>
                <div className="text-emerald-600 font-extrabold">{formatTHB(sum.total)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ปุ่มยกเลิก (ถ้าเงื่อนไขผ่าน) */}
        {canCancel && (
          <div className="flex justify-end">
            <button
              onClick={() => setCancelOpen(true)}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              <FiX /> ยกเลิกคำสั่งซื้อ
            </button>
          </div>
        )}
      </div>

     <CancelModal
  open={cancelOpen}
  order={od}
  onClose={() => setCancelOpen(false)}
  onConfirm={({ orderId, reason }) =>
    cancelOrderWithReason(orderId ?? (od.order_id || od.id || od.order_code), reason)
  }
/>
    </div>
  );
}
