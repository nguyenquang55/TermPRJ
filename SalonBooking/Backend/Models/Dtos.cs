namespace SalonBooking.Api.Models;

public record RegisterRequest(string? FullName, string? Phone, string? Password);
public record LoginRequest(string? Phone, string? Password);
public record CreateServiceRequest(string? Name, int? Duration, int? Price);
public record UpdateServiceRequest(string? Name, int? Duration, int? Price, bool? IsActive);
public record CreateBookingRequest(int? ServiceId, int? StylistId, string? BookingDate, string? TimeSlot, string? Note);
public record CancelBookingRequest(string? CancelReason);
public record UpdateBookingStatusRequest(string? Status);

public static class SalonConstants
{
    public static readonly string[] ValidSlots =
    [
        "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
    ];

    public static readonly int[] ValidDurations = [30, 60, 90, 120];

    public static readonly string[] ValidStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
}
