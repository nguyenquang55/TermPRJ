FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["SalonBooking.Api.csproj", "./"]
RUN dotnet restore "SalonBooking.Api.csproj"

COPY . .
RUN dotnet publish "SalonBooking.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV TZ=Asia/Ho_Chi_Minh
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

EXPOSE 10000
ENTRYPOINT ["dotnet", "SalonBooking.Api.dll"]
