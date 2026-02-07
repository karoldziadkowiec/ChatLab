# Gateway Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ChatLab.Gateway.csproj ./
RUN dotnet restore ChatLab.Gateway.csproj

COPY . .
RUN dotnet publish ChatLab.Gateway.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8000
EXPOSE 8000
ENTRYPOINT ["dotnet", "ChatLab.Gateway.dll"]
