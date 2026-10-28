import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { formatDateVN, formatVND, STATUS_CLASSES, STATUS_LABELS } from '../utils';

export default function MyBookingsPage({ user, isStylistView = false }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadBookings = async (st = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const q = st ? `?status=${st}&page=1&size=50` : '?page=1&size=50';
      const data = await apiRequest(`/bookings/my${q}`);
      setBookings(data?.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadBookings('');
  }, [user, isStylistView]);

  const handleUpdateStatus = async (bookingId, nextStatus) => {
    setError('');
    setSuccess('');
    setProcessing(true);
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setSuccess(`Đã cập nhật trạng thái lịch hẹn sang "${STATUS_LABELS[nextStatus]}"`);
      await loadBookings(statusFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelError('');
    setProcessing(true);
    try {
      await apiRequest(`/bookings/${cancelTarget.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelReason })
      });
      setCancelTarget(null);
      setCancelReason('');
      setSuccess(`Đã hủy lịch hẹn ${cancelTarget.bookingCode} thành công.`);
      await loadBookings(statusFilter);
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="section-title">
        <h2>{isStylistView ? 'Lịch Hẹn Được Phân Công (Stylist)' : 'Lịch Hẹn Của Tôi'}</h2>
        {!isStylistView && user?.role === 'CUSTOMER' && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>
            + Đặt lịch mới
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div style={{ flex: '0 1 240px' }}>
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              loadBookings(e.target.value);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <p>Đang tải danh sách lịch hẹn...</p>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>
          Chưa có lịch hẹn nào phù hợp.
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((b) => (
            <div key={b.id} className="card booking-item" data-testid={`booking-item-${b.id}`}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong>{b.bookingCode}</strong>
                  <span className={STATUS_CLASSES[b.status] || 'badge'}>{STATUS_LABELS[b.status] || b.status}</span>
                </div>
                <p style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                  Dịch vụ: {b.serviceName} ({b.duration} phút —{' '}
                  {isStylistView ? formatVND(b.price) : `${Number(b.price).toLocaleString('en-US')} VND`})
                </p>
                <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                  Ngày hẹn: <strong>{isStylistView ? formatDateVN(b.bookingDate) : b.bookingDate}</strong> lúc{' '}
                  <strong>{b.timeSlot}</strong>
                </p>
                {isStylistView ? (
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                    Khách hàng: {b.customerName} ({b.customerPhone})
                  </p>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>Thợ cắt tóc: {b.stylistName}</p>
                )}
                {b.note && (
                  <p className="booking-note-text" style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Ghi chú: {b.note}
                  </p>
                )}
                {b.status === 'CANCELLED' && b.cancelReason && (
                  <p style={{ fontSize: '0.86rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                    Lý do hủy: {b.cancelReason}
                  </p>
                )}
              </div>

              <div className="booking-actions">
                {user?.role === 'CUSTOMER' && (b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                  <button
                    className="btn btn-danger btn-sm"
                    data-testid={`btn-cancel-${b.id}`}
                    disabled={processing}
                    onClick={() => {
                      setCancelTarget(b);
                      setCancelReason('');
                      setCancelError('');
                    }}
                  >
                    Hủy lịch
                  </button>
                )}

                {user?.role === 'STYLIST' && b.status === 'PENDING' && (
                  <button
                    className="btn btn-primary btn-sm"
                    data-testid={`btn-confirm-${b.id}`}
                    disabled={processing}
                    onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                  >
                    Xác nhận
                  </button>
                )}

                {user?.role === 'STYLIST' && (b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                  <button
                    className="btn btn-success btn-sm"
                    data-testid={`btn-complete-${b.id}`}
                    disabled={processing}
                    onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                  >
                    Hoàn thành
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
            <h3 style={{ marginBottom: '0.5rem' }}>Hủy lịch hẹn {cancelTarget.bookingCode}</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '0.85rem' }}>
              Vui lòng nhập lý do hủy (từ 5 đến 200 ký tự). Khung giờ sẽ được mở trống trở lại.
            </p>
            {cancelError && <div id="cancel-modal-error" className="alert alert-error">{cancelError}</div>}
            <form onSubmit={handleConfirmCancel}>
              <div className="form-group">
                <label htmlFor="input-cancel-reason">Lý do hủy</label>
                <textarea
                  id="input-cancel-reason"
                  rows={3}
                  maxLength={200}
                  placeholder="Ví dụ: Có công việc đột xuất không thể đến đúng giờ"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setCancelTarget(null)}
                  disabled={processing}
                >
                  Đóng
                </button>
                <button id="btn-confirm-cancel" type="submit" className="btn btn-danger btn-sm" disabled={processing}>
                  {processing ? 'Đang hủy...' : 'Xác nhận hủy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
