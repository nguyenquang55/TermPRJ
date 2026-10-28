import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, setAuth } from '../api';

export function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
      setAuth(data);
      onLogin(data.user);
      if (data.user.role === 'ADMIN') {
        navigate('/admin/bookings');
      } else if (data.user.role === 'STYLIST') {
        navigate('/stylist');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (p, pw) => {
    setPhone(p);
    setPassword(pw);
    setError('');
  };

  return (
    <div className="card auth-box">
      <h2 className="section-title">Đăng nhập Hệ thống</h2>
      {error && <div id="login-error" className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-phone">Số điện thoại</label>
          <input
            id="login-phone"
            type="text"
            placeholder="Nhập số điện thoại 10 số"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Mật khẩu</label>
          <input
            id="login-password"
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button id="btn-login-submit" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
        Chưa có tài khoản?{' '}
        <Link to="/register" style={{ color: '#7c3aed', fontWeight: 600 }}>
          Đăng ký ngay
        </Link>
      </p>

      <div className="demo-accounts">
        <strong>Tài khoản mẫu (Click để điền nhanh):</strong>
        <div className="demo-btns">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fillDemo('0912345678', 'Customer@123')}>
            Khách hàng 1
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fillDemo('0900000002', 'Stylist@123')}>
            Stylist (Tuấn)
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fillDemo('0900000001', 'Admin@123')}>
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, password })
      });
      setSuccess('Đăng ký tài khoản thành công! Đang chuyển sang trang đăng nhập...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-box">
      <h2 className="section-title">Đăng ký Tài khoản Khách hàng</h2>
      {error && <div id="register-error" className="alert alert-error">{error}</div>}
      {success && <div id="register-success" className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="reg-fullname">Họ và tên (2–50 ký tự chữ)</label>
          <input
            id="reg-fullname"
            type="text"
            placeholder="Ví dụ: Nguyễn Văn An"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-phone">Số điện thoại (10 chữ số, bắt đầu bằng 0)</label>
          <input
            id="reg-phone"
            type="text"
            placeholder="Ví dụ: 0912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-password">Mật khẩu (8–32 ký tự, gồm hoa, thường, số)</label>
          <input
            id="reg-password"
            type="password"
            placeholder="Ví dụ: Customer@123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button id="btn-register-submit" type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
        Đã có tài khoản?{' '}
        <Link to="/login" style={{ color: '#7c3aed', fontWeight: 600 }}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
