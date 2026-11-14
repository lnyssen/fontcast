/*
  FONTCAST · settings
  -------------------
  This is the one file to edit for the place, the data sources and the ranges.
  It is read both by the web pages (in the browser) and by the hourly
  data job (on GitHub), so they always agree.
*/

const config = {
  // Where the poster lives. Centre of Brussels: the Grand-Place.
  place: {
    name: "Brussels",
    latitude: 50.8467,
    longitude: 4.3525,
    timezone: "Europe/Brussels",
  },

  // Weather: Open-Meteo forecast API (free for non-commercial use, CC BY 4.0).
  // Docs: https://open-meteo.com/en/docs
  weather: {
    url: "https://api.open-meteo.com/v1/forecast",
    current: [
      "temperature_2m",
      "precipitation",
      "wind_speed_10m",
      "wind_direction_10m",
      "cloud_cover",
      "pressure_msl",
      "is_day",
    ],
    daily: ["sunrise", "sunset"],
    attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
  },

  // Air quality, first choice: IRCEL-CELINE measured PM2.5 (CC BY 4.0).
  // Station 41REG1, Brussels, Boulevard du Régent (about 1.1 km from the Grand-Place).
  // Docs: https://www.irceline.be/en/documentation/open-data
  air: {
    url: "https://geo.irceline.be/sos/api/v1/timeseries/100034",
    station: "41REG1 Brussels (Bd du Régent)",
    // If IRCEL's latest hourly value is older than this, use the fallback.
    maxAgeHours: 3,
    attribution: "Air quality: IRCEL-CELINE (CC BY 4.0)",
  },

  // Air quality, fallback: Open-Meteo air-quality API (CAMS European forecast).
  // Docs: https://open-meteo.com/en/docs/air-quality-api
  airFallback: {
    url: "https://air-quality-api.open-meteo.com/v1/air-quality",
    attribution: "Air quality: Open-Meteo.com, CAMS European air quality forecast (CC BY 4.0)",
  },

  // When the poster should say "data is old" (hours since the last good reading).
  staleAfterHours: 3,
};

export default config;
