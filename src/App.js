import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Navbar';
import Home from './pages/Home';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import LoginForm from './pages/LoginForm';
import RegisterForm from './pages/RegisterForm';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/admin/AdminPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccess from './pages/OrderSuccess';
import MyOrders from './pages/MyOrders';
import SearchPage from './pages/SearchPage';
import OrderDetailPage from "./pages/OrderDetailPage";

import { Elements } from '@stripe/react-stripe-js'; // นำเข้า Elements จาก Stripe
import { loadStripe } from '@stripe/stripe-js'; // นำเข้า loadStripe เพื่อโหลด Stripe public key

import './App.css';

// โหลด Stripe public key
const stripePromise = loadStripe('pk_test_51SMWFtQ4iQWPIx2WgiD3sfUtXHqFGPnjyQ9mGvLgh4c9FLg18uDHMQUwlVpexZGW5uCZ4gH7bfVbTzGWGfFfN85U002s6nKtMl');

function App() {
  const [cart, setCart] = useState([]);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {/* ถ้าเป็น /admin → ซ่อนในมือถือ แต่เดสก์ท็อปยังแสดง */}
      <div className={isAdmin ? "hidden md:block" : "block"}>
        <Header />
      </div>

      {/* ห่อหุ้ม CheckoutPage ด้วย Elements */}
      <Elements stripe={stripePromise}>
        <Routes>
          <Route path="/" element={<Home cart={cart} setCart={setCart} />} />
          <Route path="/category/:categoryName" element={<Category cart={cart} setCart={setCart} />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart cart={cart} />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </Elements>
    </>
  );
}

export default App;
