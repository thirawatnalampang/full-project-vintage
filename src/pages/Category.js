// src/pages/Category.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

// ✅ map slug -> id + name (ต้องตรงกับ DB)
const CATEGORY_MAP = {
  band:   { id: 1, name: 'เสื้อวง' },
  vintage:{ id: 2, name: 'เสื้อวินเทจ' },
  harley: { id: 3, name: 'เสื้อฮาเล่' },
  thin:   { id: 4, name: 'เสื้อผ้าบาง' },
};

// ✅ อ่าน BASE URL จาก .env (ตกลงใช้ไอพีเครื่อง)
const API_BASE = process.env.REACT_APP_API_BASE || '"http://192.168.1.35:3000"';

export default function Category({ setCart }) {
  // รองรับได้ทั้ง /category/:slug และ /category/:categoryName
  const { slug, categoryName } = useParams();
  const key = slug || categoryName;                 // ใช้อันที่มี
  const category = CATEGORY_MAP[key];               // map เป็น {id, name}

  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      if (!category) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/by-category/${category.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('โหลดสินค้าไม่สำเร็จ:', err);
        if (!ignore) setProducts([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadProducts();
    return () => { ignore = true; };
  }, [category]);

  if (!category) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-purple-600 hover:underline">
          ← กลับไป
        </button>
        <h2 className="text-3xl font-bold mb-4">หมวด "{key}" ไม่ถูกต้อง</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold">กำลังโหลดสินค้าหมวด "{category.name}"…</h2>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-purple-600 hover:underline">
          ← กลับไป
        </button>
        <h2 className="text-3xl font-bold mb-4">ไม่พบสินค้าหมวด "{category.name}"</h2>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 text-purple-600 hover:underline">
        ← กลับไป
      </button>
      <h2 className="text-3xl font-bold mb-6">หมวดหมู่: {category.name}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} setCart={setCart} />
        ))}
      </div>
    </div>
  );
}
