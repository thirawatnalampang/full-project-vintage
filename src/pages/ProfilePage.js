import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle } from 'react-icons/fa';

const SERVER_URL = process.env.REACT_APP_API_BASE || "http://localhost:3000";

/** แยก ต./อ./จ./zipcode จากสตริงรวม */
function parseThaiAddressParts(addr = '') {
  const mSub = addr.match(/ต\.([^\sอจ\d]+)\s*/);
  const mDis = addr.match(/อ\.([^\sจ\d]+)\s*/);
  const mPro = addr.match(/จ\.([^\d]+?)(\s*\d{5})?$/);
  const mZip = addr.match(/(\d{5})\s*$/);
  return {
    subdistrict: mSub?.[1]?.trim() || '',
    district: mDis?.[1]?.trim() || '',
    province: mPro?.[1]?.trim() || '',
    zipcode: mZip?.[1] || '',
    cleanAddress: addr
      .replace(/\s*ต\.[^อจ0-9\s]+\s*อ\.[^จ0-9\s]+\s*จ\.[^\d]+(\s*\d{5})?\s*$/,'')
      .trim(),
  };
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
const [pendingFile, setPendingFile] = useState(null);   // ⬅️ ไฟล์ที่เลือก แต่ยังไม่อัป
const [previewUrl, setPreviewUrl] = useState('');       // ⬅️ blob:// สำหรับพรีวิว
useEffect(() => {
  return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
}, [previewUrl]);
  // -------- ฟอร์มหลัก --------
  const [form, setForm] = useState({
    email: '',
    username: '',
    address: '',
    phone: '',
    profile_image: '',
    password: '',
    passwordConfirm: '',
    province: '',
    district: '',
    subdistrict: '',
  });
  const [uploading, setUploading] = useState(false);

  // -------- โหลดข้อมูลไทยแอดเดรส --------
  const [addrData, setAddrData] = useState([]);
  useEffect(() => {
    fetch('/thai-address.json')
      .then((r) => r.json())
      .then(setAddrData)
      .catch((e) => console.error('load thai-address.json error:', e));
  }, []);

  // zipcode อัตโนมัติ
  const zipcode = useMemo(() => {
    if (!form.province || !form.district || !form.subdistrict) return '';
    const p = addrData.find(x => x.province === form.province);
    const d = p?.amphoes?.find(a => a.amphoe === form.district);
    const t = d?.tambons?.find(tt => tt.tambon === form.subdistrict);
    return t?.zipcode || '';
  }, [addrData, form.province, form.district, form.subdistrict]);

  // options
  const provinceOptions = useMemo(() => addrData.map((p) => p.province), [addrData]);
  const districtOptions = useMemo(() => {
    if (!form.province) return [];
    const p = addrData.find((x) => x.province === form.province);
    return p?.amphoes?.map((a) => a.amphoe) || [];
  }, [addrData, form.province]);
  const subdistrictOptions = useMemo(() => {
    if (!form.province || !form.district) return [];
    const p = addrData.find((x) => x.province === form.province);
    const d = p?.amphoes?.find((a) => a.amphoe === form.district);
    return d?.tambons?.map((t) => t.tambon) || [];
  }, [addrData, form.province, form.district]);

  // -------- Prefill โปรไฟล์จาก backend --------
  useEffect(() => {
    if (user?.email) fetchProfile(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  async function fetchProfile(email) {
    try {
      const res = await fetch(`${SERVER_URL}/api/profile?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      const data = await res.json();

      // หากไม่มี province/district/subdistrict แต่ address เป็นสตริงรวม ให้แยกครั้งแรก
      let province = data.province || '';
      let district = data.district || '';
      let subdistrict = data.subdistrict || '';
      let addr = data.address || '';
      if (!province && addr && /ต\..+อ\..+จ\./.test(addr)) {
        const parsed = parseThaiAddressParts(addr);
        province = parsed.province || province;
        district = parsed.district || district;
        subdistrict = parsed.subdistrict || subdistrict;
        addr = parsed.cleanAddress || addr;
      }

      setForm(prev => ({
        ...prev,
        email: data.email || '',
        username: data.username || '',
        address: addr,
        phone: data.phone || '',
        profile_image: data.profile_image || '',
        province,
        district,
        subdistrict,
      }));
    } catch (err) {
      alert(err.message);
    }
  }

  // -------- handlers --------
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      // มือถือ: แป้นตัวเลข & จำกัด 10 หลัก
      let newVal = value.replace(/\D/g, '');
      if (newVal.length > 10) newVal = newVal.slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: newVal }));
      return;
    }

    if (name === 'province') {
      setForm((prev) => ({ ...prev, province: value, district: '', subdistrict: '' }));
      return;
    }
    if (name === 'district') {
      setForm((prev) => ({ ...prev, district: value, subdistrict: '' }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };
const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const allowed = ['image/jpeg','image/png','image/webp','image/jpg'];
  if (!allowed.includes(file.type)) { alert('รองรับ .jpg .png .webp'); e.target.value=''; return; }
  if (file.size > 3 * 1024 * 1024)  { alert('ขนาดรูปควร < 3MB'); e.target.value=''; return; }

  if (previewUrl) URL.revokeObjectURL(previewUrl); // clear รูปเก่า
  setPreviewUrl(URL.createObjectURL(file));        // ✅ พรีวิวอย่างเดียว
  setPendingFile(file);                            // ✅ เก็บไฟล์ไว้ รอ "บันทึกข้อมูล"
};
const handleSubmit = async (e) => {
  e.preventDefault();
  if (form.password !== form.passwordConfirm) {
    alert('รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน'); return;
  }
  try {
    const { passwordConfirm, ...rest } = form;
    if (!rest.email) { alert('ไม่พบอีเมลผู้ใช้'); return; }
    const payload = { ...rest, zipcode };

    // ✅ อัปโหลดจริงตรงนี้ ถ้ามีไฟล์ค้างอยู่
    if (pendingFile) {
      const fd = new FormData();
      fd.append('image', pendingFile);
      setUploading(true);
      const upRes = await fetch(`${SERVER_URL}/api/profile/upload`, { method: 'POST', body: fd });
      if (!upRes.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ');
      const upData = await upRes.json();
      payload.profile_image = upData.url; // ใส่ url ที่อัปเสร็จเข้า payload
    }

    const res = await fetch(`${SERVER_URL}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = 'บันทึกข้อมูลไม่สำเร็จ';
      try { const j = await res.json(); if (j.message) msg = j.message; } 
      catch { const t = await res.text(); if (t) msg = t; }
      throw new Error(msg);
    }

    const updatedUser = await res.json();

    // เคลียร์สถานะไฟล์/พรีวิวหลังบันทึกสำเร็จ
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPendingFile(null);

    // sync form + auth
    setForm(prev => ({
      ...prev,
      username: updatedUser.username ?? prev.username,
      address: updatedUser.address ?? prev.address,
      phone: updatedUser.phone ?? prev.phone,
      profile_image: updatedUser.profile_image ?? prev.profile_image,
      province: updatedUser.province ?? prev.province,
      district: updatedUser.district ?? prev.district,
      subdistrict: updatedUser.subdistrict ?? prev.subdistrict,
      password: '',
      passwordConfirm: '',
    }));
    setUser(prev => ({ ...prev, ...updatedUser, profile_image: updatedUser.profile_image ?? prev?.profile_image }));
    alert('บันทึกข้อมูลสำเร็จ');
  } catch (err) {
    alert(err.message);
  } finally {
    setUploading(false);
  }
};
  // -------- UI --------
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">แก้ไขโปรไฟล์</h2>

        {/* การ์ดหลัก */}
        <div className="rounded-2xl border border-neutral-200 shadow-sm p-4 sm:p-6 bg-white">
          {/* ส่วนรูปโปรไฟล์ (responsive row) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
            <div className="relative">
              {form.profile_image ? (
                <img
  src={
    previewUrl
      ? previewUrl
      : (form.profile_image?.startsWith('http')
          ? form.profile_image
          : (form.profile_image ? SERVER_URL + form.profile_image : '')
        )
  }
  alt="Profile"
  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover ring-1 ring-neutral-200 shadow"
/>
              ) : (
                <FaUserCircle className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-neutral-300" />
              )}
            </div>

            <div className="w-full sm:flex-1">
              <label className="block mb-2 font-medium">เปลี่ยนรูปโปรไฟล์</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white hover:file:opacity-90"
              />
              <p className="text-xs text-neutral-500 mt-2">
                รองรับ .jpg, .png; แนะนำ &lt; 3MB
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email + Username */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Email (แก้ไขไม่ได้)</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  disabled
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-neutral-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">ชื่อ</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Address (บ้านเลขที่/ถนน เท่านั้น) */}
            <div>
              <label className="block mb-1 font-medium">ที่อยู่ (บ้านเลขที่/ถนน เท่านั้น)</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                rows={3}
                placeholder="บ้านเลขที่/หมู่/ถนน"
                autoComplete="street-address"
              />
            </div>

            {/* Thai address row: province / district / subdistrict / zipcode */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-1 font-medium">จังหวัด</label>
                <select
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {provinceOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">อำเภอ/เขต</label>
                <select
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  disabled={!form.province}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
                >
                  <option value="">-- เลือกอำเภอ --</option>
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">ตำบล/แขวง</label>
                <select
                  name="subdistrict"
                  value={form.subdistrict}
                  onChange={handleChange}
                  disabled={!form.district}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"
                >
                  <option value="">-- เลือกตำบล --</option>
                  {subdistrictOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">รหัสไปรษณีย์</label>
                <input
                  type="text"
                  value={zipcode}
                  readOnly
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-neutral-100 cursor-not-allowed"
                  placeholder="ขึ้นอัตโนมัติเมื่อเลือกตำบล"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block mb-1 font-medium">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                maxLength={10}
                pattern="\d{10}"
                inputMode="numeric"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                placeholder="เช่น 0812345678"
                autoComplete="tel-national"
              />
              <p className="text-xs text-neutral-500 mt-1">
                กรอกเฉพาะตัวเลข 10 หลัก
              </p>
            </div>

            {/* Passwords: new + confirm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">เปลี่ยนรหัสผ่านใหม่ (ถ้าต้องการ)</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="รหัสผ่านใหม่"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#6b3e26] text-white py-2.5 px-5 rounded-lg hover:bg-[#8a553d] transition disabled:opacity-60"
                disabled={uploading}
              >
                บันทึกข้อมูล
              </button>
              {uploading && (
                <span className="text-sm text-neutral-500">กำลังอัปโหลดรูปภาพ…</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
