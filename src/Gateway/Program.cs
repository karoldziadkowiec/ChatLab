using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Polly;

var builder = WebApplication.CreateBuilder(args);

// Load Ocelot configuration
builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// CORS for local dev (restrict origin & allow credentials)
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddOcelot(builder.Configuration)
    .AddPolly();

var app = builder.Build();

// Use named CORS policy so credentials are allowed
app.UseCors("WebClient");

// Enable WebSockets so Ocelot can proxy SignalR WS upgrades
app.UseWebSockets();

// Ocelot gateway
await app.UseOcelot();

app.Run();
