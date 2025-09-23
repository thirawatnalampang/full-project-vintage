// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const API_BASE = "http://localhost:3000";

function parseJsonSafe(v, fallback) {
  if (!v) return fallback;
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState(false);

  const [selectedKey, setSelectedKey] = useState(null);
  const [qty, setQty] = useState(1);

  // ===== load product =====
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_BASE}/api/admin/products/${productId}`);
        if (!res.ok) throw new Error("โหลดข้อมูลสินค้าไม่สำเร็จ");
        const data = await res.json();
        if (alive) setProduct(data);
      } catch (e) {
        if (alive) setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  // ===== images (cover + gallery) =====
  const images = useMemo(() => {
    if (!product) return [];
    const cover = product.image ? `${API_BASE}${normalizePath(product.image)}` : null;
    const arr = parseJsonSafe(product.images_json || product.imagesJson, []);
    const gallery = (Array.isArray(arr) ? arr : [])
      .filter(Boolean)
      .map((p) => `${API_BASE}${normalizePath(p)}`);

    // unique, cover-first
    const seen = new Set();
    const out = [];
    const push = (u) => {
      if (!u) return;
      if (seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    push(cover);
    gallery.forEach(push);
    return out.length ? out : ["/assets/placeholder.png"];
  }, [product]);

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  useEffect(() => setActiveImgIdx(0), [images.length]);

  // keyboard left/right for images
  const onKey = useCallback(
    (e) => {
      if (!images.length) return;
      if (e.key === "ArrowRight") setActiveImgIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setActiveImgIdx((i) => Math.max(i - 1, 0));
    },
    [images.length]
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // ===== measure variants (นิ้ว) =====
  const measureVariants = useMemo(() => {
    if (!product) return [];
    let mv = product?.measure_variants ?? product?.measureVariants ?? null;
    if (typeof mv === "string") {
      try {
        mv = JSON.parse(mv);
      } catch {
        mv = null;
      }
    }
    const out = [];
    if (Array.isArray(mv)) {
      for (const v of mv) {
        const chest = Number(v?.chest_in ?? v?.chest_cm ?? v?.chest ?? NaN);
        const length = Number(v?.length_in ?? v?.length_cm ?? v?.length ?? NaN);
        const stock = Number(v?.stock ?? 0);
        if (Number.isFinite(chest) && Number.isFinite(length)) {
          const key = `c${chest}-l${length}`;
          out.push({ key, chest, length, stock });
        }
      }
    }
    // collapse duplicates by max stock
    const best = new Map();
    for (const v of out) {
      const prev = best.get(v.key);
      if (!prev || Number(v.stock) > Number(prev.stock)) best.set(v.key, v);
    }
    return Array.from(best.values()).sort((a, b) =>
      a.chest !== b.chest ? a.chest - b.chest : a.length - b.length
    );
  }, [product]);

  // default select first in stock
  useEffect(() => {
    if (!selectedKey && measureVariants.length > 0) {
      const first = measureVariants.find((m) => Number(m.stock) > 0) || measureVariants[0];
      setSelectedKey(first.key);
    }
  }, [measureVariants, selectedKey]);

  const stockByKey = useMemo(() => {
    const o = {};
    for (const v of measureVariants) o[v.key] = Number(v.stock || 0);
    return o;
  }, [measureVariants]);

  const totalStock = useMemo(() => {
    if (measureVariants.length > 0) {
      return measureVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }
    const ps = Number(product?.stock);
    return Number.isFinite(ps) ? ps : undefined;
  }, [measureVariants, product]);
  const isAllOut = totalStock === 0;

  const hasStockForKey = (k) => Number(stockByKey[k] || 0) > 0;

  const maxQty = useMemo(() => {
    if (selectedKey && Object.keys(stockByKey).length > 0)
      return Math.max(0, Number(stockByKey[selectedKey] || 0));
    if (Number.isFinite(totalStock)) return Math.max(0, totalStock);
    return 99;
  }, [selectedKey, stockByKey, totalStock]);

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxQty)));
  }, [maxQty]);

  // ===== actions =====
  const handleAdd = () => {
    if (!product || isAllOut) return;

    const chosen = selectedKey
      ? measureVariants.find((m) => m.key === selectedKey)
      : null;

    if (measureVariants.length > 0) {
      if (!chosen || !hasStockForKey(selectedKey)) return;
    }

    const sizeLabel = chosen ? `อก ${chosen.chest}″ / ยาว ${chosen.length}″` : null;

    addToCart({
      id: product.id,
      name: product.name,
      image: images?.[0] || "/assets/placeholder.png",
      price: product.price,
      qty,
      size: sizeLabel,
      measures: chosen ? { chest_in: chosen.chest, length_in: chosen.length } : null,
      variantKey: selectedKey || null,
      maxStock: chosen ? Number(chosen.stock || 0) : Number(product?.stock || 0),
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  if (loading) return <p className="p-6 text-center">กำลังโหลดสินค้า…</p>;
  if (err) return <p className="p-6 text-center text-red-600">{err}</p>;
  if (!product) return <p className="p-6 text-center">ไม่พบสินค้า</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Left: gallery */}
      <div>
        <div className="relative">
          <img
            src={images[activeImgIdx]}
            alt={product.name}
            className={`w-full rounded-xl border border-gray-300 object-cover ${
              isAllOut ? "opacity-60" : ""
            }`}
          />
          {isAllOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-xl bg-black/80 text-white px-4 py-2 text-sm font-semibold">
                สินค้าหมด
              </span>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-3">
            {images.map((u, i) => (
              <button
                key={u + i}
                onClick={() => setActiveImgIdx(i)}
                className={[
                  "border rounded-lg overflow-hidden aspect-square",
                  i === activeImgIdx ? "border-black" : "border-gray-300 hover:border-gray-400",
                ].join(" ")}
                aria-label={`รูปที่ ${i + 1}`}
              >
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: details */}
      <div>
        <button onClick={() => navigate(-1)} className="mb-6 text-purple-600 hover:underline">
          ← กลับไป
        </button>

        <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
        <p className="text-xl text-red-600 font-semibold mb-4">
          ราคา {Number(product.price || 0).toLocaleString()} บาท
        </p>
        <p className="text-gray-700 mb-6 leading-relaxed">
          {product.description || "ไม่มีรายละเอียดสินค้า"}
        </p>

        {/* size (chest/length) */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">เลือกขนาด (อก/ยาว) นิ้ว:</h3>
          {measureVariants.length === 0 ? (
            <p className="text-sm text-gray-500">สินค้านี้ไม่มี “อก/ยาว” ให้เลือก</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {measureVariants.map((m) => {
                const active = selectedKey === m.key;
                const inStock = hasStockForKey(m.key);
                const label = `อก ${m.chest}″ / ยาว ${m.length}″`;
                return (
                  <button
                    key={m.key}
                    onClick={() => inStock && setSelectedKey(m.key)}
                    disabled={!inStock}
                    className={[
                      "px-3 py-2 border rounded-lg transition text-sm",
                      active ? "bg-black text-white border-black" : "",
                      inStock && !active
                        ? "bg-white text-gray-700 hover:bg-gray-100"
                        : !inStock
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "",
                    ].join(" ")}
                    title={inStock ? `เหลือ ${m.stock} ชิ้น` : "หมด"}
                  >
                    {label} {!inStock && "(หมด)"}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* quantity */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">จำนวน:</h3>
          <div className="inline-flex items-center rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={isAllOut || maxQty <= 0}
              className={[
                "w-9 h-9 flex items-center justify-center text-base font-bold leading-none",
                "hover:bg-gray-50 active:scale-95 transition",
                isAllOut || maxQty <= 0 ? "text-gray-400 cursor-not-allowed" : "text-gray-800",
              ].join(" ")}
              aria-label="ลดจำนวน"
            >
              −
            </button>
            <span className="px-3 text-base font-medium tabular-nums select-none">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(q + 1, maxQty))}
              disabled={isAllOut || qty >= maxQty}
              className={[
                "w-9 h-9 flex items-center justify-center text-base font-bold leading-none",
                "hover:bg-gray-50 active:scale-95 transition",
                isAllOut || qty >= maxQty ? "text-gray-400 cursor-not-allowed" : "text-gray-800",
              ].join(" ")}
              aria-label="เพิ่มจำนวน"
              title={Number.isFinite(maxQty) ? `เหลือ ${maxQty} ชิ้น` : undefined}
            >
              +
            </button>
          </div>
          {Number.isFinite(maxQty) && (
            <p
              className={[
                "mt-2 text-sm font-semibold",
                maxQty === 0 ? "text-red-600" : maxQty <= 5 ? "text-orange-500" : "text-emerald-600",
              ].join(" ")}
            >
              เหลือ {maxQty} ชิ้น
            </p>
          )}
        </div>
{/* add to cart */}
<button
  type="button"
  onClick={handleAdd}
  disabled={isAllOut || (measureVariants.length > 0 && !selectedKey)}
  className={`w-full font-medium py-3 px-6 rounded-lg shadow transition
    ${
      isAllOut || (measureVariants.length > 0 && !selectedKey)
        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
        : "bg-black hover:bg-gray-800 text-white"
    }`}
>
  {isAllOut
    ? "สินค้าหมด"
    : measureVariants.length > 0 && !selectedKey
    ? "เลือก อก/ยาว ก่อน"
    : "เพิ่มไปตะกร้า"}
</button>

{/* spacer กันแท็บล่างบัง (มือถือเท่านั้น) */}
<div className="h-24 md:hidden" />

        {/* toast */}
        <div
          className={`fixed top-5 right-5 transition-all ${
            added ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
          aria-live="polite"
        >
          <div className="rounded-lg bg-black/85 text-white px-3 py-2 text-sm shadow-lg">
            ✅ เพิ่มลงตะกร้าแล้ว
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function normalizePath(p) {
  // รับทั้ง '/uploads/..', 'uploads/..', หรือ path ที่อาจมี backslash
  let s = String(p || "").trim().replace(/\\/g, "/");
  if (!s) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}
