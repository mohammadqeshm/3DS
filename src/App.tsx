/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  DEFAULT_WEATHER_SETTINGS, 
  WeatherSettings, 
  SunPreset 
} from "./types";
import { WindAudioSynth } from "./utils/AudioEngine";
import WeatherScene from "./components/WeatherScene";
import WeatherControls from "./components/WeatherControls";
import { 
  CloudSun, Info, Award, Compass, Volume2, Gamepad2, Play 
} from "lucide-react";

export default function App() {
  const [settings, setSettings] = useState<WeatherSettings>(DEFAULT_WEATHER_SETTINGS);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.2);
  const [isFirstPerson, setIsFirstPerson] = useState<boolean>(true);
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Keep a reference to the audio synth
  const audioSynthRef = useRef<WindAudioSynth | null>(null);

  useEffect(() => {
    // Instantiate the synthesizer
    audioSynthRef.current = new WindAudioSynth();
    return () => {
      if (audioSynthRef.current) {
        audioSynthRef.current.stop();
      }
    };
  }, []);

  // Sync settings modifications with the audio engine
  useEffect(() => {
    if (audioSynthRef.current) {
      audioSynthRef.current.setParams(
        settings.windSpeed,
        settings.soundVolume,
        settings.soundEnabled
      );
    }
  }, [settings.windSpeed, settings.soundVolume, settings.soundEnabled]);

  // Handle Initial User Click to enable Audio & dismiss Intro panel
  const handleStartSimulation = () => {
    if (audioSynthRef.current) {
      // Initialize Context on user gesture
      audioSynthRef.current.init();
      // Unmute and start
      setSettings((prev) => ({
        ...prev,
        soundEnabled: true,
      }));
    }
    setShowIntro(false);
  };

  const selectPreset = (presetName: string) => {
    let presetSettings: Partial<WeatherSettings> = {};
    switch (presetName) {
      case "tropical_storm":
        presetSettings = {
          cirrusCover: 55,
          middleCover: 90,
          cumulusCover: 95,
          sunTime: 14.5,
          sunPreset: SunPreset.Afternoon,
          dustHaze: 25,
          fogCover: 45,
          windSpeed: 88, // Strong storm wind
          windDirectionAngle: 245,
        };
        break;
      case "calm_noon":
        presetSettings = {
          cirrusCover: 15,
          middleCover: 10,
          cumulusCover: 20,
          sunTime: 12.0,
          sunPreset: SunPreset.Noon,
          dustHaze: 4,
          fogCover: 5,
          windSpeed: 8, // Gentle breeze
          windDirectionAngle: 90,
        };
        break;
      case "golden_sandstorm":
        presetSettings = {
          cirrusCover: 40,
          middleCover: 15,
          cumulusCover: 25,
          sunTime: 17.0,
          sunPreset: SunPreset.Afternoon,
          dustHaze: 85, // Heavy orange dust
          fogCover: 15,
          windSpeed: 60,
          windDirectionAngle: 310,
        };
        break;
      case "misty_midnight":
        presetSettings = {
          cirrusCover: 5,
          middleCover: 30,
          cumulusCover: 45,
          sunTime: 23.0,
          sunPreset: SunPreset.Night,
          dustHaze: 0,
          fogCover: 85, // Extremely dense sea mist
          windSpeed: 15,
          windDirectionAngle: 180,
        };
        break;
    }

    setSettings((prev) => ({
      ...prev,
      ...presetSettings,
    }));
  };

  return (
    <div id="app-container" className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      
      {/* 3D Atmospheric Canvas Stage */}
      <WeatherScene
        settings={settings}
        speedMultiplier={speedMultiplier}
        isFirstPerson={isFirstPerson}
      />

      {/* Floating Viewport Header in Immersive UI Theme */}
      <header className="absolute top-4 left-4 right-4 z-40 p-1 flex justify-between items-start pointer-events-none select-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl pointer-events-auto flex flex-col items-start">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            ATMOS<span className="text-sky-400">SIM</span> 
            <span className="text-[9px] font-mono bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30">V2.4 PRO</span>
          </h1>
          <p className="text-slate-400 text-[11px] mt-0.5 font-sans">Coastal Caspian Shoreline Environment | Real-Time Physics</p>
        </div>
        
        <div className="hidden sm:flex gap-4 pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex items-center gap-4">
            <div className="flex flex-col items-start">
              <span className="text-[9px] uppercase tracking-widest text-sky-400 font-bold font-sans">FPS RANGE</span>
              <span className="text-lg font-mono leading-none text-white">120.0 <span className="text-[10px] text-emerald-400">HZ</span></span>
            </div>
            <div className="w-[1px] h-8 bg-white/10"></div>
            <div className="flex flex-col items-start font-sans">
              <span className="text-[9px] uppercase tracking-widest text-sky-400 font-bold">COORDINATES</span>
              <span className="text-[11px] font-mono leading-none text-slate-200">36.68° N / 51.41° E</span>
            </div>
          </div>
        </div>
      </header>

      {/* Climate Presets Selector Rail */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/80 backdrop-blur-lg px-4 py-2 border border-white/10 rounded-2xl flex items-center gap-2 shadow-3xl pointer-events-auto max-w-[90vw] overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-slate-500 font-mono hidden md:inline ml-1">PRESETS:</span>
        <button
          onClick={() => selectPreset("calm_noon")}
          className="px-3 py-1.5 text-[10px] bg-sky-900/45 hover:bg-sky-900/70 border border-sky-500/25 rounded-xl cursor-pointer text-sky-200 font-semibold shrink-0 transition-transform active:scale-95"
        >
          ظهر آرام (Calm Coast)
        </button>
        <button
          onClick={() => selectPreset("tropical_storm")}
          className="px-3 py-1.5 text-[10px] bg-red-950/45 hover:bg-red-900/70 border border-red-500/25 rounded-xl cursor-pointer text-red-200 font-semibold shrink-0 transition-transform active:scale-95"
        >
          طوفان استوایی (Storm)
        </button>
        <button
          onClick={() => selectPreset("golden_sandstorm")}
          className="px-3 py-1.5 text-[10px] bg-amber-950/45 hover:bg-amber-900/70 border border-amber-500/25 rounded-xl cursor-pointer text-amber-200 font-semibold shrink-0 transition-transform active:scale-95"
        >
          طوفان شن طلایی (Haze)
        </button>
        <button
          onClick={() => selectPreset("misty_midnight")}
          className="px-3 py-1.5 text-[10px] bg-slate-900/60 hover:bg-slate-800/80 border border-emerald-500/15 rounded-xl cursor-pointer text-emerald-300 font-semibold shrink-0 transition-transform active:scale-95"
        >
          نیمه‌شب مه‌آلود (Misty Night)
        </button>
      </div>

      {/* Weather Controls Drawer Sidebar */}
      <WeatherControls
        settings={settings}
        onChange={setSettings}
        isFirstPerson={isFirstPerson}
        setIsFirstPerson={setIsFirstPerson}
        speedMultiplier={speedMultiplier}
        setSpeedMultiplier={setSpeedMultiplier}
      />

      {/* Immersive UI Footer Telemetry Broadcast */}
      <footer className="absolute bottom-4 left-4 z-30 hidden md:flex items-center gap-6 text-[10px] text-slate-400 font-mono pointer-events-none select-none bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 rounded-xl">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>PHYSX CORE: ACTIVE</span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>MESH LOD: ULTRA</span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>SHADERS: RAY-TRACED</span>
        </div>
        <div className="w-[1px] h-3 bg-white/20"></div>
        <div className="flex items-center gap-2 text-rose-400">
          <span className="animate-pulse inline-block w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]"></span>
          LIVE TELEMETRY BROADCAST
        </div>
      </footer>

      {/* Startup Intro Overlay (Perfect gesture handling for Web Audio setup) */}
      {showIntro && (
        <div 
          id="intro-overlay"
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 max-w-md w-full text-white shadow-3xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-lg border border-white/10">
              <CloudSun size={32} className="text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300">
                پروژه شبیه‌ساز سه‌بعدی هواشناسی
              </h2>
              <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                Coastal Climate Vector Sandbox
              </p>
            </div>

            <div className="text-right text-xs text-slate-300 space-y-3 leading-relaxed border-y border-white/5 py-4 w-full font-sans">
              <p className="font-semibold text-center text-emerald-400">
                خوش آمدید! این یک شبیه‌ساز زمان‌واقعی جوی است.
              </p>
              <div className="space-y-2 text-slate-400">
                <div className="flex justify-between">
                  <span>سه لایه ابر دقیق (سیروس، میانی، پفکی کومولوس)</span>
                  <span>🌨️</span>
                </div>
                <div className="flex justify-between">
                  <span>تغییر بلادرنگ موقعیت خورشید و مه‌گرفتگی</span>
                  <span>☀️</span>
                </div>
                <div className="flex justify-between">
                  <span>شبیه‌سازی فیزیک باد روی پرچم، درختان و امواج دریا</span>
                  <span>🍃</span>
                </div>
                <div className="flex justify-between">
                  <span>ویزویز و زوزه کشیدن باد بوسیله سینتی‌سایزر نویز صوتی</span>
                  <span>🔊</span>
                </div>
                <div className="flex justify-between">
                  <span>قدم‌زدن اختیاری اول شخص روی سواحل پر از شن</span>
                  <span>🚶</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-emerald-300 font-sans italic">
              💡 برای شنیدن صدای سه‌بعدی تلاطم باد، مرورگر شما نیازمند تأیید ورودی اولیه است.
            </p>

            <button
              id="start-sim-btn"
              onClick={handleStartSimulation}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:shadow-emerald-500/10 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <Play size={16} fill="currentColor" />
              <span>شروع شبیه‌سازی و فعالسازی صدا</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
