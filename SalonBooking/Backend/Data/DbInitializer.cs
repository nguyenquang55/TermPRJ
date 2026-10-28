using SalonBooking.Api.Models;

namespace SalonBooking.Api.Data;

public static class DbInitializer
{
    public static void Initialize(SalonDbContext db)
    {
        db.Database.EnsureCreated();

        if (db.Users.Any())
        {
            return;
        }

        var admin = new AppUser
        {
            FullName = "Quản trị viên Salon",
            Phone = "0900000001",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123", 8),
            Role = "ADMIN",
            IsWorking = true
        };

        var stylist1 = new AppUser
        {
            FullName = "Trần Minh Tuấn",
            Phone = "0900000002",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Stylist@123", 8),
            Role = "STYLIST",
            Specialty = "Chuyên Cắt & Uốn nam nữ",
            IsWorking = true
        };

        var stylist2 = new AppUser
        {
            FullName = "Lê Thu Hà",
            Phone = "0900000003",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Stylist@123", 8),
            Role = "STYLIST",
            Specialty = "Chuyên Nhuộm & Phục hồi tóc",
            IsWorking = true
        };

        var stylist3 = new AppUser
        {
            FullName = "Phạm Hoàng Nam",
            Phone = "0900000004",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Stylist@123", 8),
            Role = "STYLIST",
            Specialty = "Chuyên Cắt tạo kiểu",
            IsWorking = false // Đang tạm nghỉ (dùng test BR-01)
        };

        var customer1 = new AppUser
        {
            FullName = "Nguyễn Văn An",
            Phone = "0912345678",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123", 8),
            Role = "CUSTOMER",
            IsWorking = true
        };

        var customer2 = new AppUser
        {
            FullName = "Lê Thị Bình",
            Phone = "0987654321",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123", 8),
            Role = "CUSTOMER",
            IsWorking = true
        };

        db.Users.AddRange(admin, stylist1, stylist2, stylist3, customer1, customer2);

        var s1 = new HairService { Name = "Cắt gội tạo kiểu nam", Duration = 30, Price = 100000, IsActive = true };
        var s2 = new HairService { Name = "Cắt tạo kiểu nữ Layer", Duration = 60, Price = 180000, IsActive = true };
        var s3 = new HairService { Name = "Uốn tóc sóng lơi Hàn Quốc", Duration = 90, Price = 350000, IsActive = true };
        var s4 = new HairService { Name = "Nhuộm tóc phủ bạc thảo dược", Duration = 60, Price = 250000, IsActive = true };
        var s5 = new HairService { Name = "Phục hồi tóc chuyên sâu Keratin", Duration = 120, Price = 500000, IsActive = true };
        var s6 = new HairService { Name = "Tẩy tóc bạch kim (Tạm ngưng)", Duration = 120, Price = 450000, IsActive = false };

        db.Services.AddRange(s1, s2, s3, s4, s5, s6);
        db.SaveChanges();

        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        var dayAfter = today.AddDays(2);

        var bookings = new List<Booking>
        {
            new()
            {
                BookingCode = $"BK-{tomorrow:yyyyMMdd}-0001",
                CustomerId = customer1.Id,
                StylistId = stylist1.Id,
                ServiceId = s1.Id,
                BookingDate = tomorrow.ToString("yyyy-MM-dd"),
                TimeSlot = "10:00",
                Note = "Cắt gọn hai bên, giữ phần mái dài",
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new()
            {
                BookingCode = $"BK-{tomorrow:yyyyMMdd}-0002",
                CustomerId = customer2.Id,
                StylistId = stylist1.Id,
                ServiceId = s3.Id,
                BookingDate = tomorrow.ToString("yyyy-MM-dd"),
                TimeSlot = "15:00",
                Note = "Uốn sóng nhẹ tự nhiên",
                Status = "CONFIRMED",
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new()
            {
                BookingCode = $"BK-{today:yyyyMMdd}-0003",
                CustomerId = customer2.Id,
                StylistId = stylist2.Id,
                ServiceId = s4.Id,
                BookingDate = today.ToString("yyyy-MM-dd"),
                TimeSlot = "09:00",
                Note = "Nhuộm nâu trầm",
                Status = "COMPLETED",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                BookingCode = $"BK-{dayAfter:yyyyMMdd}-0004",
                CustomerId = customer1.Id,
                StylistId = stylist2.Id,
                ServiceId = s2.Id,
                BookingDate = dayAfter.ToString("yyyy-MM-dd"),
                TimeSlot = "14:00",
                Note = "",
                CancelReason = "Bận lịch họp đột xuất tại công ty",
                Status = "CANCELLED",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            }
        };

        db.Bookings.AddRange(bookings);
        db.SaveChanges();
    }
}
