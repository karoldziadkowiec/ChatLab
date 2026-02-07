# ProblemService Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ChatLab.ProblemService.csproj ./
RUN dotnet restore ChatLab.ProblemService.csproj

COPY . .
RUN dotnet publish ChatLab.ProblemService.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8002
EXPOSE 8002
ENTRYPOINT ["dotnet", "ChatLab.ProblemService.dll"]
