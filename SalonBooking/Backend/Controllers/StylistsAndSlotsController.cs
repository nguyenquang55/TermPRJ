using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.Models;

namespace SalonBooking.Api.Controllers;

[ApiController]
[Route("api")]
public class StylistsAndSlotsController(SalonDbContext db) : ControllerBase
{
    [HttpGet("stylists")]
    public async Task<IActionResult> GetStylists()
    {
        var stylists = await db.Users
            .Where(u => u.Role == "STYLIST")
            .OrderBy(u => u.Id)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                specialty = u.Specialty ?? "Chuyên tạo kiểu tóc",
                isWorking = u.IsWorking
            })
            .ToListAsync();

        return Ok(new { data = stylists });
    }

    [HttpGet("slots")]
    public async Task<IActionResult> GetSlots([FromQuery] int? stylistId, [FromQuery] string? bookingDate)
    {
        if (!stylistId.HasValue || string.IsNullOrWhiteSpace(bookingDate))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Vui lòng truyền đầy đủ stylistId và bookingDate" });
        }

        if (!DateOnly.TryParseExact(bookingDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Định dạng ngày hẹn phải là YYYY-MM-DD" });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var maxDate = today.AddDays(14);
        if (parsedDate < today || parsedDate > maxDate)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Ngày hẹn chỉ được chọn từ hôm nay đến tối đa 14 ngày tới" });
        }

        var stylist = await db.Users.FirstOrDefaultAsync(u => u.Id == stylistId.Value && u.Role == "STYLIST");
        if (stylist is null)
        {
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy Stylist" });
        }

        await Task.Delay(2400);

        var dateStr = parsedDate.ToString("yyyy-MM-dd");
        var bookedSlots = await db.Bookings
            .Where(b => b.StylistId == stylist.Id && b.BookingDate == dateStr && (b.Status == "PENDING" || b.Status == "CONFIRMED"))
            .Select(b => b.TimeSlot)
            .ToListAsync();

        var bookedSet = bookedSlots.ToHashSet();
        var slots = SalonConstants.ValidSlots.Select(slot => new
        {
            timeSlot = slot,
            available = stylist.IsWorking && !bookedSet.Contains(slot)
        });

        return Ok(new
        {
            data = new
            {
                stylistId = stylist.Id,
                bookingDate = dateStr,
                slots
            }
        });
    }
}
