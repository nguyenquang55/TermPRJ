using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Models;

public class AppUser
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(15)]
    public string Phone { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Role { get; set; } = "CUSTOMER"; // CUSTOMER, STYLIST, ADMIN

    [MaxLength(150)]
    public string? Specialty { get; set; }

    public bool IsWorking { get; set; } = true;
}

public class HairService
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public int Duration { get; set; } // 30, 60, 90, 120

    public int Price { get; set; } // 50,000 - 5,000,000

    public bool IsActive { get; set; } = true;
}

public class Booking
{
    public int Id { get; set; }

    [MaxLength(30)]
    public string BookingCode { get; set; } = string.Empty;

    public int CustomerId { get; set; }
    public AppUser? Customer { get; set; }

    public int StylistId { get; set; }
    public AppUser? Stylist { get; set; }

    public int ServiceId { get; set; }
    public HairService? Service { get; set; }

    [MaxLength(10)]
    public string BookingDate { get; set; } = string.Empty; // YYYY-MM-DD

    [MaxLength(5)]
    public string TimeSlot { get; set; } = string.Empty; // HH:mm

    [MaxLength(200)]
    public string? Note { get; set; }

    [MaxLength(200)]
    public string? CancelReason { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "PENDING"; // PENDING, CONFIRMED, COMPLETED, CANCELLED

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
