# Hệ thống Đặt lịch hẹn Dịch vụ Salon Tóc (Hair Salon Booking)

Ứng dụng quy mô tinh gọn phục vụ Học phần **Đánh giá hiệu năng – Đồ án cá nhân**, bám sát 100% tài liệu **URD**, **SRS v1.1** và **Mẫu 01 – Tài liệu API**.

## 1. Công nghệ sử dụng
- **Backend:** ASP.NET Core Web API (`.NET 10`), Entity Framework Core + **SQLite** (`salon.db`), JWT Bearer Auth + BCrypt.
- **Frontend:** **Vite + React 18** + React Router v6, Responsive CSS (`375px`, `768px`, `1366px`).

---

## 2. Cách chạy hệ thống (Local)

### Bước 1: Chạy Backend (.NET API — Port `3000`)
Mở terminal tại thư mục `SalonBooking/Backend`:
```powershell
cd "d:\Môn Test\TermPRJ\SalonBooking\Backend"
dotnet run
```
- API chạy tại: `http://localhost:3000/api`
- Khi khởi động lần đầu, hệ thống tự động tạo file `salon.db` và nạp sẵn 6 tài khoản mẫu, 6 dịch vụ và 4 lịch hẹn mẫu.
- *Muốn khôi phục (reset) dữ liệu gốc:* Chỉ cần tắt server, xóa file `salon.db` rồi chạy lại `dotnet run`.

### Bước 2: Chạy Frontend (Vite React — Port `5173`)
Mở terminal thứ hai tại thư mục `SalonBooking/Frontend`:
```powershell
cd "d:\Môn Test\TermPRJ\SalonBooking\Frontend"
npm install
npm run dev
```
- Giao diện Web chạy tại: `http://localhost:5173` (đã cấu hình proxy `/api` trỏ tự động sang `http://localhost:3000`).

---

## 3. Tài khoản mẫu cài sẵn

| Vai trò | Số điện thoại | Mật khẩu | Ghi chú |
| :--- | :---: | :---: | :--- |
| **Admin** | `0900000001` | `Admin@123` | Quản lý dịch vụ, xem thống kê & toàn bộ lịch hẹn |
| **Stylist 1** | `0900000002` | `Stylist@123` | Trần Minh Tuấn (`isWorking = true`) |
| **Stylist 2** | `0900000003` | `Stylist@123` | Lê Thu Hà (`isWorking = true`) |
| **Stylist 3** | `0900000004` | `Stylist@123` | Phạm Hoàng Nam (`isWorking = false` – Tạm nghỉ) |
| **Customer 1** | `0912345678` | `Customer@123` | Nguyễn Văn An |
| **Customer 2** | `0987654321` | `Customer@123` | Lê Thị Bình |
