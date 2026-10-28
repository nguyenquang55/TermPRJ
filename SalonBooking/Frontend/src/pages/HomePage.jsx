import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { formatVND } from '../utils';

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadServices = async (kw = keyword, dur = duration) => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (kw.trim()) params.set('keyword', kw.trim());
      if (dur) params.set('duration', dur);
      const q = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest(`/services${q}`);
      setServices(data || []);
    } catch (err) {
      if (err.status === 500) {
        setServices(undefined);
      }
      setError(err.message);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadServices('', '');
      try {
        const st = await apiRequest('/stylists');
        setStylists(st || []);
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadServices(keyword, duration);
  };

  const handleSelectService = (serviceId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/book?serviceId=${serviceId}`);
  };

  return (
    <div>
      <div className="hero">
        <div>
          <h1>Salon Tóc — Đặt Lịch Hẹn Trực Tuyến</h1>
          <p>Chọn gói dịch vụ, chọn Thợ cắt tóc yêu thích và giữ chỗ trước hoàn toàn miễn phí.</p>
        </div>
        {(!user || user.role === 'CUSTOMER') && (
          <button
            id="btn-hero-book"
            className="btn btn-white"
            onClick={() => (user ? navigate('/book') : navigate('/login'))}
          >
            Đặt lịch ngay
          </button>
        )}
      </div>

      <h2 className="section-title">Danh sách Dịch vụ Tóc</h2>

      <form className="filter-bar home-search-bar" onSubmit={handleSearch}>
        <div style={{ flex: '1 1 220px' }}>
          <input
            id="input-search-keyword"
            type="text"
            maxLength={50}
            placeholder="Tìm theo tên dịch vụ (VD: Cắt, Uốn, Nhuộm)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 1 180px' }}>
          <select
            id="select-filter-duration"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              loadServices(keyword, e.target.value);
            }}
          >
            <option value="">Mọi thời lượng</option>
            <option value="30">30 phút</option>
            <option value="60">60 phút</option>
            <option value="90">90 phút</option>
            <option value="120">120 phút</option>
          </select>
        </div>
        <button id="btn-search-service" type="submit" className="btn btn-primary">
          Tìm kiếm
        </button>
        {(keyword || duration) && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setKeyword('');
              setDuration('');
              loadServices('', '');
            }}
          >
            Xóa lọc
          </button>
        )}
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Đang tải danh sách dịch vụ...</p>
      ) : services.length === 0 ? (
        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', color: '#64748b' }}>
          Không tìm thấy dịch vụ phù hợp
        </div>
      ) : (
        <div className="grid-services">
          {services.map((s) => (
            <div key={s.id} className="card service-card" data-testid={`service-card-${s.id}`}>
              <div>
                <h3 style={{ fontSize: '1.08rem', marginBottom: '0.35rem' }}>{s.name}</h3>
                <div className="service-meta">
                  <span style={{ color: '#64748b' }}>Thời lượng: {s.duration} phút</span>
                  <span className="price-tag">{formatVND(s.price)}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  * Giá niêm yết tham khảo (thanh toán trực tiếp tại salon)
                </p>
              </div>
              {(!user || user.role === 'CUSTOMER') && (
                <button
                  className="btn btn-primary"
                  data-testid={`btn-book-service-${s.id}`}
                  onClick={() => handleSelectService(s.id)}
                >
                  Chọn đặt lịch
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Đội ngũ Thợ cắt tóc (Stylist)</h2>
      <div className="grid-services">
        {stylists.map((st) => (
          <div key={st.id} className="card" data-testid={`stylist-card-${st.id}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem' }}>{st.fullName}</h3>
              <span className={st.isWorking ? 'badge badge-completed' : 'badge badge-cancelled'}>
                {st.isWorking ? 'Đang làm việc' : 'Đang tạm nghỉ'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>{st.specialty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
