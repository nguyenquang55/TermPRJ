import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { formatVND, getLocalDateStr } from '../utils';

export default function BookingPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get('serviceId') || '';

  const [services, setServices] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [stylistId, setStylistId] = useState('');
  const [bookingDate, setBookingDate] = useState(getLocalDateStr(1));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const minDate = getLocalDateStr(0);
  const maxDate = getLocalDateStr(14);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const [svList, stList] = await Promise.all([
          apiRequest('/services'),
          apiRequest('/stylists')
        ]);
        setServices(svList || []);
        setStylists(stList || []);

        if (!serviceId && svList?.length > 0) {
          setServiceId(String(svList[0].id));
        }
        const workingStylist = (stList || []).find((s) => s.isWorking);
        if (workingStylist) {
          setStylistId(String(workingStylist.id));
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!stylistId || !bookingDate) return;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      setError('');
      try {
        const data = await apiRequest(`/slots?stylistId=${stylistId}&bookingDate=${bookingDate}`);
        setSlots(data?.slots || []);
      } catch (err) {
        setSlots([]);
        setError(err.message);
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [stylistId, bookingDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!serviceId || !stylistId || !bookingDate || !selectedSlot) {
      setError('Vui lòng chọn đầy đủ dịch vụ, Stylist, ngày hẹn và khung giờ trống');
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: Number(serviceId),
          stylistId: Number(stylistId),
          bookingDate,
          timeSlot: selectedSlot,
          note
        })
      });
      setSuccess(`Đặt lịch thành công! Mã lịch hẹn: ${created.bookingCode}`);
      setTimeout(() => navigate('/my-bookings'), 1200);
    } catch (err) {
      setError(err.message);
      // Tải lại danh sách giờ trống nếu bị trùng lịch 409
      if (err.status === 409) {
        try {
          const data = await apiRequest(`/slots?stylistId=${stylistId}&bookingDate=${bookingDate}`);
          setSlots(data?.slots || []);
          setSelectedSlot('');
        } catch {
          // ignore
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h2 className="section-title">Đặt Lịch Hẹn Làm Tóc</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Chỉ đặt giữ chỗ lịch hẹn trực tuyến — không cần thanh toán trước trên website.
      </p>

      {error && <div id="booking-error" className="alert alert-error">{error}</div>}
      {success && <div id="booking-success" className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="select-service">1. Chọn Dịch vụ tóc</label>
          <select
            id="select-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="">-- Chọn dịch vụ --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration} phút — Giá tham khảo: {formatVND(s.price)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="select-stylist">2. Chọn Thợ cắt tóc (Stylist)</label>
          <select
            id="select-stylist"
            value={stylistId}
            onChange={(e) => setStylistId(e.target.value)}
            required
          >
            <option value="">-- Chọn Stylist --</option>
            {stylists.map((st) => (
              <option key={st.id} value={st.id} disabled={!st.isWorking}>
                {st.fullName} — {st.specialty} {!st.isWorking ? '(Đang tạm nghỉ)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="input-booking-date">3. Chọn Ngày hẹn (Từ hôm nay đến tối đa +14 ngày)</label>
          <input
            id="input-booking-date"
            type="date"
            min={minDate}
            max={maxDate}
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>4. Chọn Khung giờ trống</label>
          {loadingSlots ? (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Đang kiểm tra khung giờ trống...</p>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Vui lòng chọn Stylist và Ngày hẹn hợp lệ để xem khung giờ.</p>
          ) : (
            <div className="slots-grid">
              {slots.map((sl) => (
                <button
                  type="button"
                  key={sl.timeSlot}
                  data-testid={`slot-${sl.timeSlot}`}
                  disabled={!sl.available}
                  className={`slot-btn ${selectedSlot === sl.timeSlot ? 'selected' : ''}`}
                  onClick={() => setSelectedSlot(sl.timeSlot)}
                >
                  {sl.timeSlot} {sl.available ? '' : '(Kín)'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="input-note">5. Ghi chú yêu cầu kiểu tóc (Tùy chọn, tối đa 200 ký tự — {note.length}/200)</label>
          <textarea
            id="input-note"
            rows={3}
            maxLength={200}
            placeholder="Ví dụ: Cắt gọn hai bên, uốn phồng nhẹ..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          id="btn-submit-booking"
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={submitting || !selectedSlot}
        >
          {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận Đặt lịch hẹn'}
        </button>
      </form>
    </div>
  );
}
