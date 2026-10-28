import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { formatDateVN, STATUS_CLASSES, STATUS_LABELS } from '../utils';

export default function AdminBookingsPage({ user }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    total: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0
  });
  const [bookings, setBookings] = useState([]);
  const [stylists, setStylists] = useState([]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stylistId, setStylistId] = useState('');
  const [status, setStatus] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const loadData = async (f = fromDate, t = toDate, stId = stylistId, st = status) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (f) params.set('fromDate', f);
      if (t) params.set('toDate', t);
      if (stId) params.set('stylistId', stId);
      if (st) params.set('status', st);
      const q = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest(`/admin/bookings${q}`);
      setSummary(data?.summary || summary);
      setBookings(data?.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const stList = await apiRequest('/stylists');
        setStylists(stList || []);
      } catch {
        // ignore
      }
      await loadData('', '', '', '');
    })();
  }, [user]);

  const handleFilter = (e) => {
    e.preventDefault();
    loadData(fromDate, toDate, stylistId, status);
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setSuccess(`Đã chuyển trạng thái lịch hẹn sang "${STATUS_LABELS[nextStatus]}"`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelError('');
    try {
      await apiRequest(`/bookings/${cancelTarget.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelReason })
      });
      setCancelTarget(null);
      setCancelReason('');
      setSuccess(`Đã hủy lịch hẹn ${cancelTarget.bookingCode}`);
      await loadData();
    } catch (err) {
      setCancelError(err.message);
    }
  };

  return (
    <div>
      <h2 className="section-title">Quản Lý Toàn Bộ Lịck Hẹn & Thống Kê (Admin)</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num" id="stat-total">{summary.total}</div>
          <div className="stat-label">Tổng số lịch hẹn</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#d97706' }}>{summary.pendingCount}</div>
          <div className="stat-label">Pending Waiting</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#2563eb' }}>{summary.confirmedCount}</div>
          <div className="stat-label">Đã xác nhận</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#16a34a' }}>{summary.completedCount}</div>
          <div className="stat-label">Hoàn thành</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#dc2626' }}>{summary.cancelledCount}</div>
          <div className="stat-label">Đã hủy</div>
        </div>
      </div>

      <form className="filter-bar" onSubmit={handleFilter}>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Từ ngày</label>
          <input id="filter-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đến ngày</label>
          <input id="filter-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Thợ cắt tóc</label>
          <select id="filter-stylist" value={stylistId} onChange={(e) => setStylistId(e.target.value)}>
            <option value="">Tất cả Stylist</option>
            {stylists.map((st) => (
              <option key={st.id} value={st.id}>{st.fullName}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Trạng thái</label>
          <select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
          <button id="btn-admin-filter" type="submit" className="btn btn-primary">
            Lọc dữ liệu
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setStylistId('');
              setStatus('');
              loadData('', '', '', '');
            }}
          >
            Đặt nại
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <p>Đang tải danh sách lịch hẹn...</p>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>
          Không có lịch hẹn nào khớp điều kiện lọc.
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((b) => (
            <div key={b.id} className="card booking-item" data-testid={`admin-booking-${b.id}`}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong>{b.bookingCode}</strong>
                  <span className={STATUS_CLASSES[b.status] || 'badge'}>{STATUS_LABELS[b.status] || b.status}</span>
                </div>
                <p style={{ marginTop: '0.3rem', fontWeight: 600 }}>
                  Dịch vụ: {b.serviceName} ({b.duration} phút)
                </p>
                <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                  Ngày hẹn: <strong>{formatDateVN(b.bookingDate)}</strong> lúc <strong>{b.timeSlot}</strong> · Stylist: <strong>{b.stylistName}</strong>
                </p>
                <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                  Khách hàng: {b.customerName} ({b.customerPhone})
                </p>
                {b.note && <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Ghi chú: {b.note}</p>}
                {b.status === 'CANCELLED' && b.cancelReason && (
                  <p style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Lý do hủy: {b.cancelReason}</p>
                )}
              </div>

              <div className="booking-actions">
                {b.status === 'PENDING' && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}>
                    Xác nhận
                  </button>
                )}
                {b.status === 'CONFIRMED' && (
                  <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}>
                    Hoàn thành
                  </button>
                )}
                {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setCancelTarget(b);
                      setCancelReason('');
                      setCancelError('');
                    }}
                  >
                    Hủy lịch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ marginBottom: '0.5rem' }}>Admin Hủy lịch hẹn {cancelTarget.bookingCode}</h3>
            {cancelError && <div className="alert alert-error">{cancelError}</div>}
            <form onSubmit={handleConfirmCancel}>
              <div className="form-group">
                <label htmlFor="admin-cancel-reason">Lý do hủy (5–200 ký tự)</label>
                <textarea
                  id="admin-cancel-reason"
                  rows={3}
                  maxLength={200}
                  placeholder="Nhập lý do hủy lịch hẹn..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setCancelTarget(null)}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-danger btn-sm">
                  Xác nhận hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
