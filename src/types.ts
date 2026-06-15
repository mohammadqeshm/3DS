/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum SunPreset {
  Sunrise = "SUNRISE",
  Noon = "NOON",
  Afternoon = "AFTERNOON",
  Sunset = "SUNSET",
  Night = "NIGHT",
}

export interface WeatherSettings {
  cirrusCover: number;     // 0 to 100 (high-level thin wispy clouds)
  middleCover: number;     // 0 to 100 (mid-level altocumulus clouds)
  cumulusCover: number;    // 0 to 100 (low-level thick fluffy cumulus clouds)
  sunTime: number;         // 6 to 18 (representing hour scale: 6 is sunrise, 12 is noon, 18 is sunset, 22 is night, etc.)
  sunPreset: SunPreset;    // quick preset
  dustHaze: number;        // 0 to 100 (dust/air quality scattering)
  fogCover: number;        // 0 to 100 (visibility restriction)
  windSpeed: number;       // 0 to 120 (km/h scale)
  windDirectionAngle: number; // 0 to 360 degrees (0 = North, 90 = East, 180 = South, 270 = West)
  soundVolume: number;     // 0 to 100 (wind whistling sound volume)
  soundEnabled: boolean;   // toggle state
}

export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  cirrusCover: 30,
  middleCover: 40,
  cumulusCover: 50,
  sunTime: 12,
  sunPreset: SunPreset.Noon,
  dustHaze: 10,
  fogCover: 15,
  windSpeed: 25,
  windDirectionAngle: 220, // blowing from South-West
  soundVolume: 50,
  soundEnabled: false,
};
