# ChatLab

Mikroserwisowa aplikacja chatu: ASP.NET Core Web API (.NET 8), Ocelot (API Gateway), React + TypeScript, MS SQL Server.

## Struktura

- src/
  - Gateway/ — Ocelot API Gateway (port 8000)
  - Services/
    - CoreService/ — główny serwis (użytkownicy, czaty) (port 8001)
    - RtHubService/ — centralny RT Hub (port 8010)
    - SocketIoService/ — RT przez Socket.IO (Node.js) (port 8016)
  - frontend/ — React + TypeScript (Vite)

## Szybki start (dev)

1. .NET serwisy (w oddzielnych terminalach):

```powershell
cd src/Gateway; dotnet run
cd src/Services/CoreService; dotnet run
cd src/Services/RtHubService; dotnet run
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
- RT Hub (lista transportów): `http://localhost:8000/rt/transports` → `http://localhost:8010/api/rt/transports`
- RT Hub (health wybranego transportu):
  - `http://localhost:8000/rt/signalr/api/health` → `http://localhost:8010/api/rt/signalr/health`
  - `http://localhost:8000/rt/websocket/api/health` → `http://localhost:8010/api/rt/websocket/health`
  - `http://localhost:8000/rt/sse/api/health` → `http://localhost:8010/api/rt/sse/health`
- Socket.IO: `http://localhost:8000/rt/socketio/api/health` → `http://localhost:8016/api/health`

## Uwagi

- Implementacje technologii RT są celowo szczątkowe (tylko scaffolding). 
- Frontend łączy się zawsze do Gateway; dalsze routowanie ustawia Ocelot (`src/Gateway/ocelot.json`).
- RT trasy (SignalR/WebSocket/SSE) przechodzą przez RtHubService; bezpośrednie serwisy RT zostały usunięte w tej strukturze.
- CORS jest otwarty na potrzeby dev.
