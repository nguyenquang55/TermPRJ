// Định dạng tiền tệ theo chuẩn NFR-08: "100.000 đ"
export function formatVND(amount) {
  if (amount == null || isNaN(amount)) return '0 đ';
  return Number(amount).toLocaleString('vi-VN').replace(/,/g, '.') + ' đ';
}

// Định dạng ngày từ YYYY-MM-DD sang dd/mm/yyyy theo chuẩn NFR-08
export function formatDateVN(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Ngày hiện tại YYYY-MM-DD theo múi giờ local
export function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

export const STATUS_CLASSES = {
  PENDING: 'badge badge-pending',
  CONFIRMED: 'badge badge-confirmed',
  COMPLETED: 'badge badge-completed',
  CANCELLED: 'badge badge-cancelled'
};
