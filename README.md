# Sports & Weather API

A REST API that provides MLB standings and weather data.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
3. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api) and add it to `.env`

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### MLB Standings
```
GET /standings/{league}
```

**Parameters:**
- `league`: `al`, `nl`, `american`, or `national`
- `pretty`: Set to `true` to prettify JSON output

**Example:**
```bash
curl "http://localhost:3000/standings/al?pretty=true"
```

### Weather
```
GET /weather/{location}
```

**Parameters:**
- `location`: City name or "City,Country"
- `units`: `imperial` (default) or `metric`
- `pretty`: Set to `true` to prettify JSON output

**Example:**
```bash
curl "http://localhost:3000/weather/New%20York?units=metric&pretty=true"
```

## Development

Run with auto-reload:
```bash
npm run dev
```