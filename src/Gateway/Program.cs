using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load Ocelot configuration
builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// CORS for local dev (adjust as needed)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

app.UseCors();

// Ocelot gateway
await app.UseOcelot();

// Health endpoint for gateway
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "gateway" }));

app.Run();
