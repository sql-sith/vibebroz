require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const formatResponse = (data, pretty = false) => {
  return pretty === 'true' ? JSON.stringify(data, null, 2) : JSON.stringify(data);
};

app.get('/standings/:league', async (req, res) => {
  try {
    const { league } = req.params;
    const { pretty } = req.query;

    if (!['al', 'nl', 'american', 'national'].includes(league.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid league. Use "al", "nl", "american", or "national"'
      });
    }

    const mlbData = await axios.get('https://statsapi.mlb.com/api/v1/standings', {
      params: {
        leagueId: league.toLowerCase().startsWith('a') ? 103 : 104,
        season: new Date().getFullYear()
      }
    });

    // Map division IDs to names
    const divisionNames = {
      200: 'American League West',
      201: 'American League East', 
      202: 'American League Central',
      203: 'National League West',
      204: 'National League East',
      205: 'National League Central'
    };

    const standings = {
      league: league.toLowerCase().startsWith('a') ? 'American League' : 'National League',
      season: new Date().getFullYear(),
      standings: mlbData.data.records.map(division => ({
        division: divisionNames[division.division.id] || 'Unknown Division',
        teams: division.teamRecords.map(team => ({
          team: team.team.name,
          wins: team.wins,
          losses: team.losses,
          winPercentage: team.winningPercentage,
          gamesBack: team.gamesBack
        }))
      }))
    };

    res.set('Content-Type', 'application/json');
    res.send(formatResponse(standings, pretty));

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch MLB standings',
      message: error.message
    });
  }
});

app.get('/weather/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const { pretty, units = 'imperial' } = req.query;

    if (!['imperial', 'metric'].includes(units)) {
      return res.status(400).json({
        error: 'Invalid units. Use "imperial" or "metric"'
      });
    }

    const weatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: location,
        appid: process.env.OPENWEATHER_API_KEY || 'your_api_key_here',
        units: units
      }
    });

    const currentWeather = weatherResponse.data.list[0];
    const timezoneOffset = weatherResponse.data.city.timezone; // seconds from UTC
    
    // Get unique dates for forecast (one per day) using local timezone
    // Start from the current local date
    const currentLocalTime = new Date(currentWeather.dt * 1000).getTime() + (timezoneOffset * 1000);
    const currentLocalDate = new Date(currentLocalTime);
    const currentDateString = currentLocalDate.toISOString().split('T')[0];
    
    const seenDates = new Set([currentDateString]); // Start with current date
    const forecast = weatherResponse.data.list.filter(item => {
      // Calculate local date by adding timezone offset to UTC timestamp
      const utcDate = new Date(item.dt * 1000);
      const localTime = utcDate.getTime() + (timezoneOffset * 1000);
      const localDate = new Date(localTime);
      const dateString = localDate.toISOString().split('T')[0];
      
      // Skip if we've already seen this date
      if (seenDates.has(dateString)) {
        return false;
      }
      seenDates.add(dateString);
      return true;
    }).slice(0, 3); // Take first 3 unique future days

    const tempUnit = units === 'imperial' ? '°F' : '°C';
    const speedUnit = units === 'imperial' ? 'mph' : 'm/s';

    const weatherData = {
      location: weatherResponse.data.city.name,
      country: weatherResponse.data.city.country,
      units: units,
      current: {
        temperature: `${Math.round(currentWeather.main.temp)}${tempUnit}`,
        description: currentWeather.weather[0].description,
        humidity: `${currentWeather.main.humidity}%`,
        windSpeed: `${currentWeather.wind.speed} ${speedUnit}`,
        timestamp: new Date(currentWeather.dt * 1000).toISOString()
      },
      forecast: forecast.map(item => ({
        date: new Date(new Date(item.dt * 1000).getTime() + (timezoneOffset * 1000)).toISOString().split('T')[0],
        temperature: `${Math.round(item.main.temp)}${tempUnit}`,
        description: item.weather[0].description,
        humidity: `${item.main.humidity}%`
      }))
    };

    res.set('Content-Type', 'application/json');
    res.send(formatResponse(weatherData, pretty));

  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(500).json({
        error: 'Weather API key not configured',
        message: 'Please set OPENWEATHER_API_KEY environment variable'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch weather data',
      message: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Sports & Weather API',
    endpoints: {
      standings: '/standings/{league} - Get MLB standings (league: al, nl, american, national)',
      weather: '/weather/{location} - Get weather for location'
    },
    parameters: {
      pretty: 'Set to "true" to prettify JSON output',
      units: 'For weather: "imperial" (default) or "metric"'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MLB Standings: http://localhost:${PORT}/standings/al`);
  console.log(`Weather: http://localhost:${PORT}/weather/New%20York`);
});