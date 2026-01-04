# ChatLab

Mikroserwisowa aplikacja chatu: ASP.NET Core Web API (.NET 8), Ocelot (API Gateway), React + TypeScript, MS SQL Server.

## Struktura

- src/
  - Gateway/ — Ocelot API Gateway (port 8000)
  - Services/
    - CoreService/ — główny serwis (użytkownicy, czaty) (port 8001)
    - SignalRService/ — RT przez SignalR (port 8011)
    - WebSocketService/ — RT przez WebSockets (port 8012)
    - PollingService/ — RT przez HTTP Polling (port 8013)
    - GrpcService/ — RT przez gRPC (port 8014)
    - SseService/ — RT przez Server-Sent Events (port 8015)
    - SocketIoService/ — RT przez Socket.IO (Node.js) (port 8016)
  - frontend/ — React + TypeScript (Vite)

## Szybki start (dev)

1. .NET serwisy (w oddzielnych terminalach):

```powershell
cd src/Gateway; dotnet run
cd src/Services/CoreService; dotnet run
cd src/Services/SignalRService; dotnet run
cd src/Services/WebSocketService; dotnet run
cd src/Services/PollingService; dotnet run
cd src/Services/GrpcService; dotnet run
cd src/Services/SseService; dotnet run
```

2. Socket.IO (Node.js):

```powershell
cd src/Services/SocketIoService
npm install
npm start
```

3. Frontend (Vite React + TS):

Jeśli chcesz skafoldować Vite ręcznie:

```powershell
cd src
npx --yes create-vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

4. Baza danych lokalna (MS SQL Server):

Upewnij się, że lokalny SQL Server działa i masz dane logowania. Dodaj connection string do `appsettings.json` w CoreService:

```
Server=localhost,1433;Database=ChatLabDb;User Id=sa;Password=Your_strong_password_123!;TrustServerCertificate=True;
```

## Przykładowe trasy przez Gateway

- CoreService: `http://localhost:8000/api/core/users` → proxy do `http://localhost:8001/api/users`
- SignalRService: `http://localhost:8000/rt/signalr/api/health` → `http://localhost:8011/api/health`
- WebSocketService: `http://localhost:8000/rt/websocket/api/health` → `http://localhost:8012/api/health`
- PollingService: `http://localhost:8000/rt/polling/api/health` → `http://localhost:8013/api/health`
- GrpcService: `http://localhost:8000/rt/grpc/api/health` → `http://localhost:8014/api/health`
- SSE Service: `http://localhost:8000/rt/sse/api/health` → `http://localhost:8015/api/health`
- Socket.IO: `http://localhost:8000/rt/socketio/api/health` → `http://localhost:8016/api/health`

## Uwagi

- Implementacje technologii RT są celowo szczątkowe (tylko scaffolding). 
- Frontend łączy się zawsze do Gateway; dalsze routowanie ustawia Ocelot (`src/Gateway/ocelot.json`).
- CORS jest otwarty na potrzeby dev.
