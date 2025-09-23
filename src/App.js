// src/App.jsx
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

import './App.css';

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
    </>
  );
}

export default App;
