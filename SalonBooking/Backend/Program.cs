using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SalonBooking.Api.Data;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port.Trim()}");
}
else if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.UseUrls("http://localhost:3000");
}

static string ConvertPostgresUri(string rawUrl)
{
    var trimmed = rawUrl.Trim();
    if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    var uri = new Uri(trimmed);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var database = uri.AbsolutePath.Trim('/');

    var csb = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = username,
        Password = password,
        Database = database,
        SslMode = SslMode.Require
    };

    return csb.ConnectionString;
}

var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
builder.Services.AddDbContext<SalonDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(dbUrl))
    {
        options.UseNpgsql(ConvertPostgresUri(dbUrl));
    }
    else
    {
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=salon.db");
    }
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = _ =>
            new BadRequestObjectResult(new
            {
                error = "VALIDATION_ERROR",
                message = "Dữ liệu gửi lên không đúng định dạng"
            });
    });

var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET")
             ?? builder.Configuration["Jwt:Key"]
             ?? "SalonBooking_SuperSecretKey_2026_VJU_TermProject!";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json; charset=utf-8";
                var payload = JsonSerializer.Serialize(new
                {
                    error = "UNAUTHORIZED",
                    message = "Vui lòng đăng nhập"
                });
                await context.Response.WriteAsync(payload);
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json; charset=utf-8";
                var payload = JsonSerializer.Serialize(new
                {
                    error = "FORBIDDEN",
                    message = "Bạn không có quyền truy cập"
                });
                await context.Response.WriteAsync(payload);
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SalonDbContext>();
    DbInitializer.Initialize(db);
}

app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json; charset=utf-8";
        var payload = JsonSerializer.Serialize(new
        {
            error = "INTERNAL_ERROR",
            message = "Lỗi hệ thống"
        });
        await context.Response.WriteAsync(payload);
    });
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new { status = "ok", service = "SalonBooking.Api" }));
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();
