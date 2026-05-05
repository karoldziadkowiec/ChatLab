using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.Constants;
using ChatLab.CoreService.RealTime.GRPC.Services;
using ChatLab.CoreService.RealTime.GRPC.Streaming;
using ChatLab.CoreService.RealTime.SignalR;
using ChatLab.CoreService.RealTime.SSE.Classes;
using ChatLab.CoreService.RealTime.SSE.Interfaces;
using ChatLab.CoreService.Repositories.Classes;
using ChatLab.CoreService.Repositories.Interfaces;
using ChatLab.CoreService.Services.Classes;
using ChatLab.CoreService.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

namespace ChatLab.CoreService
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var configuration = builder.Configuration;

            // MS SQL database connection
            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlServer(configuration.GetConnectionString("MSSQLConnectionString") ??
                    throw new InvalidOperationException("Microsoft SQL Server's connection string not found."));
            });

            // Identity with support for roles
            builder.Services.AddIdentity<User, IdentityRole>()
                .AddRoles<IdentityRole>()
                .AddRoleManager<RoleManager<IdentityRole>>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            // Default authentication scheme
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            // JWT Bearer
            .AddJwtBearer(options =>
            {
                options.SaveToken = true;
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    ValidAudience = configuration["JWT:ValidAudience"],
                    ValidIssuer = configuration["JWT:ValidIssuer"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["JWT:Secret"] ?? throw new InvalidOperationException("JWT:Secret not configured")))
                };
                // Log auth failures in development to diagnose 401
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        // Default behavior already reads the standard Authorization: Bearer <token> header.
                        // grpc-web (and some proxies) can drop/rename it; support a fallback header.
                        // Accept either a raw token or "Bearer <token>".
                        static string? ExtractToken(string? value)
                        {
                            if (string.IsNullOrWhiteSpace(value)) return null;
                            // Some clients/proxies merge duplicate header keys into a single comma-separated value.
                            // Example: "Bearer a.b.c, Bearer a.b.c". Always take the first segment.
                            var firstSegment = value.Split(',', 2, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                                .FirstOrDefault();
                            if (string.IsNullOrWhiteSpace(firstSegment)) return null;

                            const string bearerPrefix = "Bearer ";
                            var trimmed = firstSegment.Trim();
                            return trimmed.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase)
                                ? trimmed.Substring(bearerPrefix.Length).Trim()
                                : trimmed;
                        }

                        // If the handler didn't already find a token, look for fallbacks.
                        if (string.IsNullOrWhiteSpace(ctx.Token))
                        {
                            var headers = ctx.Request.Headers;
                            var candidate =
                                ExtractToken(headers["x-authorization"].FirstOrDefault()) ??
                                ExtractToken(headers["X-Authorization"].FirstOrDefault()) ??
                                ExtractToken(headers["x-grpc-authorization"].FirstOrDefault()) ??
                                ExtractToken(headers["X-Grpc-Authorization"].FirstOrDefault());
                            if (!string.IsNullOrWhiteSpace(candidate))
                            {
                                ctx.Token = candidate;

                                // Dev-only diagnostics (do not log the token itself).
                                var env = ctx.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
                                if (env.IsDevelopment())
                                {
                                    var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                                    logger.LogInformation("JWT token read from fallback header (len {Len})", candidate.Length);
                                }
                            }
                        }

                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = ctx =>
                    {
                        var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                        logger.LogError(ctx.Exception, "JWT authentication failed");
                        return Task.CompletedTask;
                    }
                };
            });

            // Authorization policies
            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminRights", policy =>
                    policy.RequireRole(Role.Admin));
                options.AddPolicy("UserRights", policy =>
                    policy.RequireRole(Role.User));
                options.AddPolicy("AdminOrUserRights", policy =>
                    policy.RequireRole(Role.Admin, Role.User));
            });

            // Services
            builder.Services.AddScoped<IAccountService, AccountService>();
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<ICookieService, CookieService>();
            builder.Services.AddScoped<IChatService, ChatService>();
            builder.Services.AddScoped<IMessageService, MessageService>();

            // Repositories
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IUserFollowRepository, UserFollowRepository>();
            builder.Services.AddScoped<ICommunicationTechnologyRepository, CommunicationTechnologyRepository>();

            // AutoMapper service
            builder.Services.AddAutoMapper(typeof(Program));

            // Password hasher
            builder.Services.AddTransient<IPasswordHasher<User>, PasswordHasher<User>>();

            // Accessing HttpContext property (cookies)
            builder.Services.AddHttpContextAccessor();

            // Real time chat:
            // SignalR
            builder.Services.AddSignalR();

            // WebSockets
            builder.Services.AddSingleton<WebSocketConnectionManager>();
            builder.Services.AddScoped<ChatWebSocketHandler>();

            // SSE
            builder.Services.AddSingleton<IChatSseService, ChatSseService>();

            // gRPC streaming push bus (in-memory)
            builder.Services.AddSingleton<IChatMessageBus, ChatMessageBus>();

            // gRPC services
            builder.Services.AddGrpc();
            builder.Services.AddGrpcReflection();
            builder.Services.AddHttpClient("CoreSelf", c =>
            {
                c.BaseAddress = new Uri("http://localhost:8001");
            });

            // Controller handler
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();

            // Swagger authentication
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "ChatLab.CoreService API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = @"JWT Authorization header using the Bearer scheme. \r\n\r\n 
                      Enter 'Bearer' [space] and then your token in the text input below.
                      \r\n\r\nExample: 'Bearer 12345abcdef'",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement()
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            },
                            Scheme = "oauth2",
                            Name = "Bearer",
                            In = ParameterLocation.Header,
                        },
                        new List<string>()
                    }
                });
            });

            // CORS policy
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowClient",
                    b =>
                    {
                        b.WithOrigins("http://localhost:3000")
                            .AllowAnyHeader()
                            .AllowAnyMethod()
                            .SetIsOriginAllowed(origin => true)
                            .AllowCredentials();
                    });
            });

            var app = builder.Build();

            // HTTP request pipeline
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Using CORS policy
            app.UseCors("AllowClient");
            // IMPORTANT: In Development we allow plain HTTP because the gateway (Ocelot) and gRPC-web
            // streaming can break or silently degrade when HTTP requests get redirected to HTTPS.
            // Keep redirection enabled for non-Development environments.
            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            // Auth middleware
            app.UseAuthentication();
            app.UseAuthorization();

            // Endpoints
            app.MapControllers();

            // gRPC endpoints (with gRPC-Web enabled)
            app.UseGrpcWeb();
                app.MapGrpcService<ChatGrpcService>()
                    .EnableGrpcWeb()
                    .RequireCors("AllowClient")
                    .RequireAuthorization();
            if (app.Environment.IsDevelopment())
            {
                app.MapGrpcReflectionService();
            }

            // Use SignalR
            app.MapHub<ChatHub>("/rt/signalr");

            // Use and map WebSockets
            app.UseWebSockets(new WebSocketOptions
            {
                KeepAliveInterval = TimeSpan.FromSeconds(30)
            });
            app.Map("/rt/ws", appBuilder =>
            {
                appBuilder.UseMiddleware<WebSocketMiddleware>();
            });

            // Seeders
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var logger = services.GetRequiredService<ILogger<Program>>();

                try
                {
                    var dbContext = services.GetRequiredService<AppDbContext>();
                    logger.LogInformation("Applying migrations...");
                    await dbContext.Database.MigrateAsync();
                    logger.LogInformation("Migrations applied.");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error while applying migrations.");
                    throw;
                }

                try
                {
                    logger.LogInformation("Seeding data to database...");
                    await AppSeeder.Seed(services);
                    logger.LogInformation("Seeding finished.");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error while seeding data to database.");
                    throw;
                }
            }

            app.Run();
        }
    }
}