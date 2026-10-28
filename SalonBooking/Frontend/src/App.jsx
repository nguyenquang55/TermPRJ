import React, { useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { getAuth, setAuth } from './api';
import HomePage from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

const ROLE_NAMES = {
  CUSTOMER: 'Khách hàng',
  STYLIST: 'Thợ tóc',
  ADMIN: 'Quản trị viên'
};

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuth(null);
    onLogout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          ✂️ SalonBooking
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dịch vụ & Stylist
          </NavLink>

          {user?.role === 'CUSTOMER' && (
            <>
              <NavLink to="/book" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Đặt lịch hẹn
              </NavLink>
              <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Lịch hẹn của tôi
              </NavLink>
            </>
          )}

          {user?.role === 'STYLIST' && (
            <NavLink to="/stylist" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Lịch được giao
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/admin/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Quản lý Lịch & Thống kê
              </NavLink>
              <NavLink to="/admin/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Quản lý Dịch vụ
              </NavLink>
            </>
          )}

          {!user ? (
            <>
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Đăng nhập
              </NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </NavLink>
            </>
          ) : (
            <>
              <span className="user-chip">
                {user.fullName} ({ROLE_NAMES[user.role] || user.role})
              </span>
              <button id="btn-logout" type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(() => getAuth()?.user || null);

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={() => setUser(null)} />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/book" element={<BookingPage user={user} />} />
          <Route path="/my-bookings" element={<MyBookingsPage user={user} isStylistView={false} />} />
          <Route path="/stylist" element={<MyBookingsPage user={user} isStylistView={true} />} />
          <Route path="/admin/services" element={<AdminServicesPage user={user} />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage user={user} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
