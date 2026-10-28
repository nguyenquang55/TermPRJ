import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { formatVND } from '../utils';

export default function AdminServicesPage({ user }) {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('100000');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAllServices = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/services?includeAll=true');
      setServices(data || []);
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
    loadAllServices();
  }, [user]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDuration('30');
    setPrice('100000');
    setIsActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await apiRequest(`/services/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            duration: Number(duration),
            price: Number(price),
            isActive
          })
        });
        setSuccess('Cập nhật dịch vụ thành công!');
      } else {
        await apiRequest('/services', {
          method: 'POST',
          body: JSON.stringify({
            name,
            duration: Number(duration),
            price: Number(price)
          })
        });
        setSuccess('Thêm dịch vụ mới thành công!');
      }
      resetForm();
      await loadAllServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (sv) => {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/services/${sv.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: sv.name,
          duration: sv.duration,
          price: sv.price,
          isActive: !sv.isActive
        })
      });
      setSuccess(`Đã ${!sv.isActive ? 'hiển thị' : 'tạm ẩn'} dịch vụ "${sv.name}"`);
      await loadAllServices();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (sv) => {
    setEditingId(sv.id);
    setName(sv.name);
    setDuration(String(sv.duration));
    setPrice(String(sv.price));
    setIsActive(sv.isActive);
    setError('');
    setSuccess('');
  };

  return (
    <div>
      <h2 className="section-title">Quản Lý Danh Mục Dịch Vụ (Admin)</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
          {editingId ? `Chỉnh sửa Dịch vụ #${editingId}` : 'Thêm Dịch vụ Tóc mới'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            <div className="form-group">
              <label htmlFor="sv-name">Tên dịch vụ (3–100 ký tự)</label>
              <input
                id="sv-name"
                type="text"
                placeholder="VD: Cắt tạo kiểu Layer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="sv-duration">Thời lượng (phút)</label>
              <select id="sv-duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">30 phút</option>
                <option value="60">60 phút</option>
                <option value="90">90 phút</option>
                <option value="120">120 phút</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sv-price">Giá niêm yết tham khảo (VNĐ)</label>
              <input
                id="sv-price"
                type="number"
                step={1}
                placeholder="50000 - 5000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {editingId && (
              <div className="form-group">
                <label htmlFor="sv-active">Trạng thái</label>
                <select
                  id="sv-active"
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                >
                  <option value="true">Đang mở (Hiển thị)</option>
                  <option value="false">Tạm ẩn</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button id="btn-save-service" type="submit" className="btn btn-primary">
              {editingId ? 'Lưu cập nhật' : '+ Thêm dịch vụ'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Hủy sửa
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p>Đang tải danh mục dịch vụ...</p>
      ) : (
        <div className="booking-list">
          {services.map((sv) => (
            <div key={sv.id} className="card booking-item" data-testid={`admin-service-${sv.id}`}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong>#{sv.id} — {sv.name}</strong>
                  <span className={sv.isActive ? 'badge badge-completed' : 'badge badge-cancelled'}>
                    {sv.isActive ? 'Đang mở' : 'Đang ẩn'}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.3rem' }}>
                  Thời lượng: <strong>{sv.duration} phút</strong> · Giá tham khảo: <strong>{formatVND(sv.price)}</strong>
                </p>
              </div>
              <div className="booking-actions">
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(sv)}>
                  Sửa
                </button>
                <button
                  className={`btn btn-sm ${sv.isActive ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => handleToggleActive(sv)}
                >
                  {sv.isActive ? 'Ẩn dịch vụ' : 'Mở lại'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
