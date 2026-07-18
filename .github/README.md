# ChatLab

## About project

ChatLab is a web application for comparing and testing real-time communication technologies in a chat system. The application allows users to create chats, exchange messages, manage social relations, report problems, and use multiple real-time communication mechanisms in the same domain.

The project focuses on practical comparison of communication technologies used in web applications:

- SignalR
- WebSockets
- Polling
- Server-Sent Events (SSE)
- Socket.IO
- gRPC / gRPC-Web

The repository also contains a Google Colab recommendation system that supports the selection of a real-time communication technology based on scenario parameters and historical performance results. The recommendation model uses a hybrid CBR + TOPSIS approach.

## Construction and communication of application

- Application type: **web application**
- Architecture: **microservice-oriented client-server application**
- Main services:
  - **WebClient** - React frontend
  - **Gateway** - Ocelot API Gateway
  - **CoreService** - users, chats, messages, communication technologies, authentication, real-time endpoints
  - **ProblemService** - problem reporting module
  - **SocketIoService** - Socket.IO messaging service
  - **SQL Server** - relational database
- Communication:
  - **REST API**
  - **SignalR**
  - **WebSockets**
  - **Polling**
  - **Server-Sent Events (SSE)**
  - **Socket.IO**
  - **gRPC-Web**

### Project architecture

![Project architecture](docs/img/00.png)

### Database schema

![Database schema](docs/img/01.png)

## Technologies

### Application stack

- **Frontend:** React, TypeScript, HTML, CSS
- **Backend:** ASP.NET Core Web API, C#, .NET 8
- **Gateway:** Ocelot API Gateway
- **Real-time service:** Node.js, Express, Socket.IO
- **Database:** Microsoft SQL Server 2022
- **ORM:** Entity Framework Core
- **Authentication and authorization:** JWT Bearer, ASP.NET Identity, role-based access control
- **Testing:** xUnit, integration tests with SQL Server
- **Containerization:** Docker, Docker Compose
- **CI:** GitHub Actions
- **Container registry:** Docker Hub

### Backend and services

The backend is split into independent services responsible for separate parts of the domain:

- **CoreService** handles users, authentication, chats, messages, communication technologies, and real-time endpoints.
- **ProblemService** handles problem reports.
- **Gateway** exposes a single API entry point and routes requests to downstream services.
- **SocketIoService** provides Socket.IO communication and integrates with the CoreService API.

The services use REST APIs for standard operations and dedicated real-time protocols for chat communication.

### Real-time communication technologies

ChatLab implements and compares several communication mechanisms:

- SignalR
- WebSockets
- Polling
- Server-Sent Events (SSE)
- Socket.IO
- gRPC-Web

Each technology is integrated with the same chat domain, which makes it possible to compare message delivery behavior, latency, throughput, and reliability under similar conditions.

### Frontend

The frontend is a React application written in TypeScript. It communicates with the backend through REST APIs and technology-specific real-time clients. The application includes protected routes, role-based views, chat screens, administrative panels, reporting screens, and performance-oriented chat views.

### Data and persistence

The application uses Microsoft SQL Server as the relational database. Entity Framework Core is used for data access, schema migrations, relationships, and integration with ASP.NET Identity.

### CI and image publishing

GitHub Actions builds the Docker images, runs integration tests against SQL Server, and publishes application images to Docker Hub. The workflow stops after publishing images and does not deploy the application to a remote server.

Published images:

- `${DOCKERHUB_USERNAME}/chatlab-coreservice:latest`
- `${DOCKERHUB_USERNAME}/chatlab-problemservice:latest`
- `${DOCKERHUB_USERNAME}/chatlab-socketio:latest`
- `${DOCKERHUB_USERNAME}/chatlab-gateway:latest`
- `${DOCKERHUB_USERNAME}/chatlab-webclient:latest`

## Roles (actors) of the application

- Observer
- User
- Admin

## Main features

- **Observer**:
  - account registration
  - login

- **User**:
  - account management
  - browsing the community
  - following and unfollowing users
  - viewing friends and followers
  - creating and opening chats
  - chatting with other users using multiple real-time technologies
  - measuring message delivery time and throughput in chat views
  - reporting application problems
  - logging out

- **Admin**:
  - user management
  - chat management
  - communication technology management
  - problem report management
  - user and chat statistics
  - assigning and removing administrator privileges
  - using real-time chat features
  - logging out

## Recommendation system

The `colab` directory contains a Google Colab notebook:

- `colab/RT_Technology_Recommendation_System.ipynb`

It is a decision support system for recommending a Real-Time communication technology based on scenario parameters and historical performance test results. The model combines:

- **CBR (Case-Based Reasoning)** for finding similar historical scenarios,
- **TOPSIS** for ranking technologies using multiple performance criteria.

More details are available in:

- `colab/README.md`

## Docker

The application can be built and started with Docker Compose:

```bash
docker compose up -d --build
```

When using images published to Docker Hub, set `DOCKERHUB_USERNAME` and pull the images:

```bash
DOCKERHUB_USERNAME=<dockerhub-user-or-org> docker compose pull
DOCKERHUB_USERNAME=<dockerhub-user-or-org> docker compose up -d --no-build
```

Main ports:

- `3000` - WebClient
- `8000` - Gateway
- `8001` - CoreService
- `8002` - ProblemService
- `8016` - SocketIoService
- `1433` - SQL Server

## Tests

The solution contains integration tests for:

- CoreService
- ProblemService

The tests can use SQL Server from Docker through the `TEST_SQLSERVER_CONNSTR` environment variable:

```powershell
$env:TEST_SQLSERVER_CONNSTR='Server=localhost,1433;User Id=sa;Password=Your_password123;TrustServerCertificate=True;MultipleActiveResultSets=true'
dotnet test src\Tests\CoreService.IntegrationTests\CoreService.IntegrationTests.csproj --configuration Release
dotnet test src\Tests\ProblemService.IntegrationTests\ProblemService.IntegrationTests.csproj --configuration Release
```

The current integration test result is:

- **63/63 tests passed**

## Images

### Application views

Login page:

![Login page](docs/img/1.png)

Registration page:

![Registration page](docs/img/2.png)

Home page:

![Home page](docs/img/3.png)

My profile page:

![My profile page](docs/img/4.png)

Community page:

![Community page](docs/img/5.png)

User details in the community page:

![User details](docs/img/6.png)

My Friends page:

![My Friends page](docs/img/7.png)

My Chats page:

![My Chats page](docs/img/8.png)

Chat room for WebSockets:

![WebSockets chat room](docs/img/9.png)

Chat room for gRPC with benchmarking performance testing mechanism:

![gRPC chat room](docs/img/10.png)

Support page:

![Support page](docs/img/11.png)

Admin dashboard:

![Admin dashboard](docs/img/12.png)

Users panel for admin:

![Users panel](docs/img/13.png)

Chat rooms panel for admin:

![Chat rooms panel](docs/img/14.png)

User reports and statistics:

![User reports and statistics](docs/img/15.png)

Chat reports and statistics:

![Chat reports and statistics](docs/img/16.png)

Reported problems:

![Reported problems](docs/img/17.png)

Make an admin panel:

![Make an admin panel](docs/img/18.png)

### Mobile version of web app

Login page:

![Mobile login page](docs/img/19.png)

Home page:

![Mobile home page](docs/img/20.png)

Chat room page:

![Mobile chat room page](docs/img/21.png)

My profile page:

![Mobile profile page](docs/img/22.png)

### Integration tests results

63/63 tests passed:

![Integration tests results](docs/img/23.png)
