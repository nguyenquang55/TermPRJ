using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.Models;

namespace SalonBooking.Api.Controllers;

[ApiController]
[Route("api")]
public class BookingsController(SalonDbContext db) : ControllerBase
{
    private static readonly SemaphoreSlim BookingLock = new(1, 1);

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idStr, out var id) ? id : 0;
    }

    private string GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    [HttpPost("bookings")]
    [Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest? req)
    {
        if (req is null || !req.ServiceId.HasValue || !req.StylistId.HasValue ||
            string.IsNullOrWhiteSpace(req.BookingDate) || string.IsNullOrWhiteSpace(req.TimeSlot))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Vui lòng chọn đầy đủ dịch vụ, Stylist, ngày hẹn và khung giờ" });
        }

        var note = (req.Note ?? string.Empty).Trim();
        if (note.Length > 200)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Ghi chú không được vượt quá 200 ký tự" });
        }

        var service = await db.Services.FindAsync(req.ServiceId.Value);
        var stylist = await db.Users.FirstOrDefaultAsync(u => u.Id == req.StylistId.Value && u.Role == "STYLIST");

        // BR-01: Dịch vụ đang mở & Stylist đang làm việc
        if (service is null || !service.IsActive || stylist is null || !stylist.IsWorking)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Dịch vụ hoặc Stylist hiện không khả dụng" });
        }

        // Kiểm tra ngày giờ hợp lệ
        if (!DateOnly.TryParseExact(req.BookingDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Định dạng ngày hẹn phải là YYYY-MM-DD" });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (parsedDate < today || parsedDate > today.AddDays(14))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Ngày hẹn chỉ được chọn từ hôm nay đến tối đa 14 ngày tới" });
        }

        var timeSlot = req.TimeSlot.Trim();
        if (!SalonConstants.ValidSlots.Contains(timeSlot))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Khung giờ hẹn không hợp lệ" });
        }

        var customerId = GetCurrentUserId();
        var dateStr = parsedDate.ToString("yyyy-MM-dd");

        await BookingLock.WaitAsync();
        try
        {
            // BR-02: Chống trùng lịch của Stylist
            var slotTaken = await db.Bookings.AnyAsync(b =>
                b.StylistId == stylist.Id &&
                b.BookingDate == dateStr &&
                b.TimeSlot == timeSlot &&
                (b.Status == "PENDING" || b.Status == "CONFIRMED"));

            if (slotTaken)
            {
                return Conflict(new { error = "CONFLICT", message = "Khung giờ này đã có người đặt" });
            }

            // BR-03: Tối đa 3 lịch hẹn đang chờ cho mỗi Khách hàng
            var activeCustomerBookings = await db.Bookings.CountAsync(b =>
                b.CustomerId == customerId &&
                (b.Status == "PENDING" || b.Status == "CONFIRMED"));

            if (activeCustomerBookings > 3)
            {
                return BadRequest(new { error = "VALIDATION_ERROR", message = "Bạn chỉ được đặt tối đa 3 lịch hẹn đang chờ" });
            }

            var booking = new Booking
            {
                BookingCode = "TEMP",
                CustomerId = customerId,
                StylistId = stylist.Id,
                ServiceId = service.Id,
                BookingDate = dateStr,
                TimeSlot = timeSlot,
                Note = note,
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow
            };

            db.Bookings.Add(booking);
            await db.SaveChangesAsync();

            booking.BookingCode = $"BK-{parsedDate:yyyyMMdd}-{booking.Id:D4}";
            await db.SaveChangesAsync();

            return StatusCode(201, new
            {
                data = new
                {
                    id = booking.Id,
                    bookingCode = booking.BookingCode,
                    serviceId = service.Id,
                    serviceName = service.Name,
                    stylistId = stylist.Id,
                    stylistName = stylist.FullName,
                    bookingDate = booking.BookingDate,
                    timeSlot = booking.TimeSlot,
                    note = booking.Note,
                    status = booking.Status
                }
            });
        }
        finally
        {
            BookingLock.Release();
        }
    }

    [HttpGet("bookings/my")]
    [Authorize]
    public async Task<IActionResult> GetMyBookings([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int size = 10)
    {
        if (page < 1 || size < 1 || size > 50)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Tham số phân trang không hợp lệ (page >= 1, size từ 1 đến 50)" });
        }

        if (!string.IsNullOrWhiteSpace(status) && !SalonConstants.ValidStatuses.Contains(status.Trim().ToUpperInvariant()))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Trạng thái lọc không hợp lệ" });
        }

        var userId = GetCurrentUserId();
        var role = GetCurrentRole();

        var query = db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Stylist)
            .Include(b => b.Service)
            .AsQueryable();

        if (role == "CUSTOMER")
        {
            query = query.Where(b => b.CustomerId == userId);
        }
        else if (role == "STYLIST")
        {
            query = query.Where(b => b.StylistId == userId);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpperInvariant();
            query = query.Where(b => b.Status == st);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.BookingDate)
            .ThenByDescending(b => b.TimeSlot)
            .ThenByDescending(b => b.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(b => new
            {
                id = b.Id,
                bookingCode = b.BookingCode,
                customerName = b.Customer != null ? b.Customer.FullName : "",
                customerPhone = b.Customer != null ? b.Customer.Phone : "",
                stylistId = b.StylistId,
                stylistName = b.Stylist != null ? b.Stylist.FullName : "",
                serviceId = b.ServiceId,
                serviceName = b.Service != null ? b.Service.Name : "",
                duration = b.Service != null ? b.Service.Duration : 0,
                price = b.Service != null ? b.Service.Price : 0,
                bookingDate = b.BookingDate,
                timeSlot = b.TimeSlot,
                note = b.Note ?? "",
                cancelReason = b.CancelReason ?? "",
                status = b.Status
            })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                items,
                page,
                size,
                total
            }
        });
    }

    [HttpPatch("bookings/{id:int}/cancel")]
    [Authorize(Roles = "CUSTOMER,ADMIN")]
    public async Task<IActionResult> CancelBooking(int id, [FromBody] CancelBookingRequest? req)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking is null)
        {
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy lịch hẹn" });
        }

        var userId = GetCurrentUserId();
        var role = GetCurrentRole();

        if (role == "CUSTOMER" && booking.CustomerId != userId)
        {
            return StatusCode(403, new { error = "FORBIDDEN", message = "Bạn không có quyền hủy lịch hẹn này" });
        }

        if (booking.Status != "PENDING" && booking.Status != "CONFIRMED")
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Không thể hủy lịch hẹn ở trạng thái này" });
        }

        var reason = (req?.CancelReason ?? string.Empty).Trim();
        if (reason.Length < 5 || reason.Length > 200)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Lý do hủy phải từ 5 đến 200 ký tự" });
        }

        booking.Status = "CANCELLED";
        booking.CancelReason = reason;
        await db.SaveChangesAsync();

        return Ok(new
        {
            data = new
            {
                id = booking.Id,
                bookingCode = booking.BookingCode,
                status = booking.Status,
                cancelReason = booking.CancelReason
            }
        });
    }

    [HttpPatch("bookings/{id:int}/status")]
    [Authorize(Roles = "STYLIST,ADMIN")]
    public async Task<IActionResult> UpdateBookingStatus(int id, [FromBody] UpdateBookingStatusRequest? req)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking is null)
        {
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy lịch hẹn" });
        }

        var userId = GetCurrentUserId();
        var role = GetCurrentRole();

        if (role == "STYLIST" && booking.StylistId != userId)
        {
            return StatusCode(403, new { error = "FORBIDDEN", message = "Bạn không có quyền cập nhật lịch hẹn này" });
        }

        var targetStatus = (req?.Status ?? string.Empty).Trim().ToUpperInvariant();
        var isValidTransition =
            (booking.Status == "PENDING" && (targetStatus == "CONFIRMED" || targetStatus == "COMPLETED")) ||
            (booking.Status == "CONFIRMED" && targetStatus == "COMPLETED");

        if (!isValidTransition)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Chuyển trạng thái không hợp lệ" });
        }

        booking.Status = targetStatus;
        await db.SaveChangesAsync();

        return Ok(new
        {
            data = new
            {
                id = booking.Id,
                bookingCode = booking.BookingCode,
                status = booking.Status
            }
        });
    }

    [HttpGet("admin/bookings")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetAdminBookings(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int? stylistId,
        [FromQuery] string? status)
    {
        DateOnly? parsedFrom = null;
        DateOnly? parsedTo = null;

        if (!string.IsNullOrWhiteSpace(fromDate))
        {
            if (!DateOnly.TryParseExact(fromDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var f))
            {
                return BadRequest(new { error = "VALIDATION_ERROR", message = "Định dạng fromDate phải là YYYY-MM-DD" });
            }
            parsedFrom = f;
        }

        if (!string.IsNullOrWhiteSpace(toDate))
        {
            if (!DateOnly.TryParseExact(toDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var t))
            {
                return BadRequest(new { error = "VALIDATION_ERROR", message = "Định dạng toDate phải là YYYY-MM-DD" });
            }
            parsedTo = t;
        }

        if (parsedFrom.HasValue && parsedTo.HasValue && parsedFrom.Value > parsedTo.Value)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc" });
        }

        if (!string.IsNullOrWhiteSpace(status) && !SalonConstants.ValidStatuses.Contains(status.Trim().ToUpperInvariant()))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Trạng thái lọc không hợp lệ" });
        }

        var query = db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Stylist)
            .Include(b => b.Service)
            .AsQueryable();

        if (parsedFrom.HasValue)
        {
            var fStr = parsedFrom.Value.ToString("yyyy-MM-dd");
            query = query.Where(b => string.Compare(b.BookingDate, fStr) >= 0);
        }

        if (parsedTo.HasValue)
        {
            var tStr = parsedTo.Value.ToString("yyyy-MM-dd");
            query = query.Where(b => string.Compare(b.BookingDate, tStr) <= 0);
        }

        if (stylistId.HasValue)
        {
            query = query.Where(b => b.StylistId == stylistId.Value);
        }

        var allInScope = await query
            .OrderByDescending(b => b.BookingDate)
            .ThenByDescending(b => b.TimeSlot)
            .ThenByDescending(b => b.Id)
            .ToListAsync();

        var summary = new
        {
            total = allInScope.Count,
            pendingCount = allInScope.Count(b => b.Status == "PENDING"),
            confirmedCount = allInScope.Count(b => b.Status == "CONFIRMED"),
            completedCount = allInScope.Count(b => b.Status == "COMPLETED"),
            cancelledCount = allInScope.Count(b => b.Status == "CANCELLED")
        };

        var filteredList = allInScope.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpperInvariant();
            filteredList = filteredList.Where(b => b.Status == st);
        }

        var items = filteredList.Select(b => new
        {
            id = b.Id,
            bookingCode = b.BookingCode,
            customerName = b.Customer?.FullName ?? "",
            customerPhone = b.Customer?.Phone ?? "",
            stylistId = b.StylistId,
            stylistName = b.Stylist?.FullName ?? "",
            serviceId = b.ServiceId,
            serviceName = b.Service?.Name ?? "",
            duration = b.Service?.Duration ?? 0,
            price = b.Service?.Price ?? 0,
            bookingDate = b.BookingDate,
            timeSlot = b.TimeSlot,
            note = b.Note ?? "",
            cancelReason = b.CancelReason ?? "",
            status = b.Status
        });

        return Ok(new
        {
            data = new
            {
                summary,
                items
            }
        });
    }
}
