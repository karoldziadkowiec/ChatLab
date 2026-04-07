# ChatLab

Mikroserwisowa aplikacja chatu: ASP.NET Core Web API (.NET 8) + Ocelot (API Gateway) + React (TypeScript) + MS SQL Server.

Gateway jest jedynym publicznym wejściem dla WebClient (CORS i routowanie). Serwisy backendowe można też uruchamiać bezpośrednio (np. pod Swaggerem) podczas dev.

## Składniki

| Komponent | Opis | Domyślny port |
|---|---|---:|
| `src/Gateway` | Ocelot API Gateway | 8000 |
| `src/Services/CoreService` | Użytkownicy, konta, czaty, wiadomości + RT (SignalR/WS/SSE) + gRPC | 8001 |
| `src/Services/ProblemService` | Serwis „problems” (osobna baza) | 8002 |
| `src/Services/SocketIoService` | RT przez Socket.IO (Node.js), zapis wiadomości idzie przez Gateway | 8016 |
| `src/WebClient` | React + TS (Create React App) | 3000 |
| `docker-compose.yml` | Lokalne środowisko (SQL Server + migracje + serwisy) | — |

## Wymagania

- .NET SDK 8.x
- Node.js (zalecane LTS)
- (Opcjonalnie) Docker + Docker Compose
- MS SQL Server (lokalnie lub w Dockerze)

## Szybki start (Docker Compose)

Najprostsza opcja: uruchamia całość wraz z SQL Server i migracjami EF.

```powershell
docker compose up --build
```

Po starcie:

- WebClient: http://localhost:3000
- Gateway: http://localhost:8000

## Szybki start (lokalnie, bez Dockera)

1) SQL Server

- Upewnij się, że SQL Server działa.
- Ustaw connection string w:
  - `src/Services/CoreService/appsettings.json` (`ConnectionStrings:MSSQLConnectionString`)
  - `src/Services/ProblemService/appsettings.json` (`ConnectionStrings:MSSQLConnectionString`)

2) Backend (.NET) — w oddzielnych terminalach

```powershell
cd src/Services/CoreService
dotnet run
```

```powershell
cd src/Services/ProblemService
dotnet run
```

```powershell
cd src/Gateway
dotnet run
```

3) Socket.IO (Node.js)

```powershell
cd src/Services/SocketIoService
npm install
npm start
```

4) WebClient (React)

```powershell
cd src/WebClient
npm install
npm start
```

## Routing przez Gateway

Konfiguracja routingu jest w `src/Gateway/ocelot.json`.

Przykłady (Gateway → downstream):

- CoreService REST: `http://localhost:8000/api/core/users` → `http://localhost:8001/api/core/users`
- CoreService SSE stream: `http://localhost:8000/api/core/chat/stream` → `http://localhost:8001/api/core/chat/stream`
- ProblemService REST: `http://localhost:8000/api/problems` → `http://localhost:8002/api/problems`

Real-time:

- SignalR hub: `http://localhost:8000/rt/signalr` → `http://localhost:8001/rt/signalr`
- WebSockets endpoint: `http://localhost:8000/rt/ws` → `http://localhost:8001/rt/ws`
- Socket.IO (proxy path): `http://localhost:8000/rt/socketio/socket.io/` → `http://localhost:8016/socket.io/`

W praktyce klient Socket.IO powinien używać `path: "/rt/socketio/socket.io"`.

## Swagger

Swagger UI jest wystawiony bezpośrednio na serwisach (w `Development`):

- CoreService: `http://localhost:8001/swagger`
- ProblemService: `http://localhost:8002/swagger`

Gateway nie proxy’uje swaggera.

## Konfiguracja (najważniejsze)

### Connection string

Serwisy biorą connection string z `ConnectionStrings:MSSQLConnectionString` (appsettings lub zmienna środowiskowa `ConnectionStrings__MSSQLConnectionString`).

### JWT

CoreService i ProblemService używają JWT (`JWT:Secret`, `JWT:ValidIssuer`, `JWT:ValidAudience`).

Uwaga: w dev CoreService nie wymusza HTTPS redirect (żeby nie psuć proxy/streamingu). Jeśli generujesz tokeny lokalnie, dopilnuj spójności `JWT:ValidIssuer` z faktycznym adresem serwisu (np. `http://localhost:8001`).

## gRPC / gRPC-Web

CoreService wystawia gRPC (z włączonym gRPC-Web). Gateway proxy’uje ścieżkę:

- `POST http://localhost:8000/chatlab.grpc.ChatGrpc/{method}` → `http://localhost:8001/chatlab.grpc.ChatGrpc/{method}`

WebClient ma skrypt do generowania klienta gRPC-Web:

```powershell
cd src/WebClient
npm run gen:grpc-web
```

## Testy

W repo są projekty testów integracyjnych (folder `src/Tests`). Uruchom:

```powershell
dotnet test
```

## Troubleshooting

- `401 Unauthorized`: sprawdź `JWT:Secret` oraz zgodność `JWT:ValidIssuer`/`JWT:ValidAudience` z tym, z czego korzysta klient.
- Problemy z RT przez Gateway: upewnij się, że Gateway ma włączone `UseWebSockets()` (jest w kodzie) i że używasz właściwych ścieżek z sekcji „Routing przez Gateway”.
