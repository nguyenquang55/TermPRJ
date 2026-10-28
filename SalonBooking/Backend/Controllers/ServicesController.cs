using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.Models;

namespace SalonBooking.Api.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController(SalonDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetServices([FromQuery] string? keyword, [FromQuery] int? duration, [FromQuery] bool includeAll = false)
    {
        var kw = (keyword ?? string.Empty).Trim();
        if (kw.Length > 50)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Từ khóa tìm kiếm không được vượt quá 50 ký tự" });
        }

        if (kw.Contains('%') || kw.Contains('\''))
        {
            throw new InvalidOperationException("Query keyword parse failure");
        }

        if (duration.HasValue && !SalonConstants.ValidDurations.Contains(duration.Value))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Thời lượng lọc không hợp lệ" });
        }

        var isAdmin = User.FindFirstValue(ClaimTypes.Role) == "ADMIN";
        var allServices = await db.Services.OrderBy(s => s.Id).ToListAsync();

        var filtered = allServices.AsEnumerable();
        if (!(includeAll && isAdmin))
        {
            filtered = filtered.Where(s => s.IsActive);
        }

        if (!string.IsNullOrEmpty(kw))
        {
            filtered = filtered.Where(s => s.Name.Contains(kw, StringComparison.OrdinalIgnoreCase));
        }

        if (duration.HasValue)
        {
            filtered = filtered.Where(s => s.Duration == duration.Value);
        }

        var result = filtered.Select(s => new
        {
            id = s.Id,
            name = s.Name,
            duration = s.Duration,
            price = s.Price,
            isActive = s.IsActive
        });

        return Ok(new { data = result });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest? req)
    {
        if (req is null)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Dữ liệu dịch vụ không hợp lệ" });
        }

        var name = (req.Name ?? string.Empty).Trim();
        if (name.Length < 3 || name.Length > 100)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Tên dịch vụ phải từ 3 đến 100 ký tự" });
        }

        if (!req.Duration.HasValue || !SalonConstants.ValidDurations.Contains(req.Duration.Value))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Thời lượng chỉ nhận giá trị 30, 60, 90 hoặc 120 phút" });
        }

        if (!req.Price.HasValue || req.Price.Value < 50000 || req.Price.Value > 5000000)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Giá niêm yết phải từ 50.000đ đến 5.000.000đ và là bội số của 1.000" });
        }

        var existingServices = await db.Services.ToListAsync();
        if (existingServices.Any(s => string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict(new { error = "CONFLICT", message = "Tên dịch vụ đã tồn tại" });
        }

        var service = new HairService
        {
            Name = name,
            Duration = req.Duration.Value,
            Price = req.Price.Value,
            IsActive = true
        };

        db.Services.Add(service);
        await db.SaveChangesAsync();

        return StatusCode(201, new
        {
            data = new
            {
                id = service.Id,
                name = service.Name,
                duration = service.Duration,
                price = service.Price,
                isActive = service.IsActive
            }
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest? req)
    {
        var service = await db.Services.FindAsync(id);
        if (service is null)
        {
            return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dịch vụ" });
        }

        if (req is null)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Dữ liệu dịch vụ không hợp lệ" });
        }

        var name = (req.Name ?? string.Empty).Trim();
        if (name.Length < 3 || name.Length > 100)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Tên dịch vụ phải từ 3 đến 100 ký tự" });
        }

        if (!req.Duration.HasValue || !SalonConstants.ValidDurations.Contains(req.Duration.Value))
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Thời lượng chỉ nhận giá trị 30, 60, 90 hoặc 120 phút" });
        }

        if (!req.Price.HasValue || req.Price.Value < 50000 || req.Price.Value > 5000000)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Giá niêm yết phải từ 50.000đ đến 5.000.000đ và là bội số của 1.000" });
        }

        if (!req.IsActive.HasValue)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Trạng thái isActive là bắt buộc" });
        }

        var otherServices = await db.Services.Where(s => s.Id != id).ToListAsync();
        if (otherServices.Any(s => string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict(new { error = "CONFLICT", message = "Tên dịch vụ đã tồn tại" });
        }

        service.Name = name;
        service.Duration = req.Duration.Value;
        service.Price = req.Price.Value;
        service.IsActive = req.IsActive.Value;

        await db.SaveChangesAsync();

        return Ok(new
        {
            data = new
            {
                id = service.Id,
                name = service.Name,
                duration = service.Duration,
                price = service.Price,
                isActive = service.IsActive
            }
        });
    }
}
