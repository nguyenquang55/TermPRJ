using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SalonBooking.Api.Data;
using SalonBooking.Api.Models;

namespace SalonBooking.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(SalonDbContext db, IConfiguration config) : ControllerBase
{
    private static readonly Regex NameRegex = new(@"^[\p{L}\s]{2,50}$", RegexOptions.Compiled);
    private static readonly Regex PhoneRegex = new(@"^0[0-9]{9}$", RegexOptions.Compiled);

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest? req)
    {
        if (req is null)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", message = "Dữ liệu đăng ký không hợp lệ" });
        }

        var fullName = (req.FullName ?? string.Empty).Trim();
        var phone = (req.Phone ?? string.Empty).Trim();
        var password = req.Password ?? string.Empty;

        if (fullName.Length < 2 || fullName.Length > 50 || !NameRegex.IsMatch(fullName))
        {
            return BadRequest(new
            {
                error = "VALIDATION_ERROR",
                message = "Họ và tên phải từ 2 đến 50 ký tự, không chứa chữ số hoặc ký tự đặc biệt"
            });
        }

        if (!PhoneRegex.IsMatch(phone))
        {
            return BadRequest(new
            {
                error = "VALIDATION_ERROR",
                message = "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0"
            });
        }

        if (password.Length < 6 || password.Length > 32 ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit))
        {
            return BadRequest(new
            {
                error = "VALIDATION_ERROR",
                message = "Mật khẩu phải từ 8 đến 32 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số"
            });
        }

        var exists = await db.Users.AnyAsync(u => u.Phone == phone);
        if (exists)
        {
            return Conflict(new
            {
                error = "CONFLICT",
                message = "Số điện thoại đã được đăng ký"
            });
        }

        var user = new AppUser
        {
            FullName = fullName,
            Phone = phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "CUSTOMER",
            IsWorking = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return StatusCode(201, new
        {
            data = new
            {
                id = user.Id,
                fullName = user.FullName,
                phone = user.Phone,
                role = user.Role
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest? req)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Phone) || string.IsNullOrEmpty(req.Password))
        {
            return BadRequest(new
            {
                error = "VALIDATION_ERROR",
                message = "Vui lòng nhập đầy đủ số điện thoại và mật khẩu"
            });
        }

        var phone = req.Phone.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            return Unauthorized(new
            {
                error = "UNAUTHORIZED",
                message = "Số điện thoại hoặc mật khẩu không đúng"
            });
        }

        var jwtKey = config["Jwt:Key"] ?? "SalonBooking_SuperSecretKey_2026_VJU_TermProject!";
        var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Role, user.Role),
            new("phone", user.Phone),
            new("fullName", user.FullName)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(60),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256Signature)
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(tokenDescriptor);

        return Ok(new
        {
            data = new
            {
                token = handler.WriteToken(token),
                user = new
                {
                    id = user.Id,
                    fullName = user.FullName,
                    phone = user.Phone,
                    role = user.Role
                }
            }
        });
    }
}
