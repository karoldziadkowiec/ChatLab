# CoreService Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ChatLab.CoreService.csproj ./
RUN dotnet restore ChatLab.CoreService.csproj

COPY . .
RUN dotnet publish ChatLab.CoreService.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8001
EXPOSE 8001
ENTRYPOINT ["dotnet", "ChatLab.CoreService.dll"]
