/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Sun, Moon, Wind, Cloud, Eye, Volume2, VolumeX, Sparkles, 
  HelpCircle, ChevronRight, ChevronLeft, Waves, Compass 
} from "lucide-react";
import { WeatherSettings, SunPreset } from "../types";

interface WeatherControlsProps {
  settings: WeatherSettings;
  onChange: (newSettings: WeatherSettings) => void;
  isFirstPerson: boolean;
  setIsFirstPerson: (val: boolean) => void;
  speedMultiplier: number; // to speed up cloud animations of needed
  setSpeedMultiplier: (val: number) => void;
}

export default function WeatherControls({
  settings,
  onChange,
  isFirstPerson,
  setIsFirstPerson,
  speedMultiplier,
  setSpeedMultiplier,
}: WeatherControlsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"clouds" | "wind" | "sky" | "general">("clouds");
  const [showHelp, setShowHelp] = useState(true);

  const updateSetting = <K extends keyof WeatherSettings>(key: K, value: WeatherSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const getWindDescription = (speed: number) => {
    if (speed < 5) return { fa: "آرام (بدون باد)", en: "Calm" };
    if (speed < 15) return { fa: "نسیم ملایم", en: "Light Breeze" };
    if (speed < 30) return { fa: "باد ملایم", en: "Moderate Wind" };
    if (speed < 55) return { fa: "باد شدید", en: "Strong Wind" };
    if (speed < 85) return { fa: "طوفان سخت", en: "Gale Force" };
    return { fa: "طوفان مخرب (شدید)", en: "Severe Storm" };
  };

  const setSunPresetTime = (preset: SunPreset) => {
    let time = 12;
    switch (preset) {
      case SunPreset.Sunrise:
        time = 6.2;
        break;
      case SunPreset.Noon:
        time = 12;
        break;
      case SunPreset.Afternoon:
        time = 15.5;
        break;
      case SunPreset.Sunset:
        time = 18.2;
        break;
      case SunPreset.Night:
        time = 22;
        break;
    }
    onChange({
      ...settings,
      sunPreset: preset,
      sunTime: time,
    });
  };

  const getDirectionName = (deg: number) => {
    const d = deg % 360;
    if (d >= 337.5 || d < 22.5) return { fa: "شمال (N)", en: "North" };
    if (d >= 22.5 && d < 67.5) return { fa: "شمال شرق (NE)", en: "North-East" };
    if (d >= 67.5 && d < 112.5) return { fa: "شرق (E)", en: "East" };
    if (d >= 112.5 && d < 157.5) return { fa: "جنوب شرق (SE)", en: "South-East" };
    if (d >= 157.5 && d < 202.5) return { fa: "جنوب (S)", en: "South" };
    if (d >= 202.5 && d < 247.5) return { fa: "جنوب غرب (SW)", en: "South-West" };
    if (d >= 247.5 && d < 292.5) return { fa: "غرب (W)", en: "West" };
    return { fa: "شمال غرب (NW)", en: "North-West" };
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end pointer-events-none max-w-sm w-full select-none">
      {/* Drawer Toggle Button */}
      <button
        id="control-toggle-btn"
        className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/10 text-xs font-semibold backdrop-blur-md transition-all duration-300 transform active:scale-95 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{isOpen ? "بستن تنظیمات" : "تنظیمات هواشناسی ⚙️"}</span>
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Main Glassmorphic Control Panel */}
      {isOpen && (
        <div 
          id="main-control-panel"
          className="pointer-events-auto mt-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] text-white w-full overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/15 flex flex-col gap-1.5 bg-black/30">
            <div className="flex flex-col items-end text-right w-full">
              <span className="text-xs font-black tracking-[0.2em] text-[#60a5fa] uppercase">
                WEATHER CONFIGURATION
              </span>
              <span className="text-[10px] text-slate-400 font-mono">MODEL PARAMETERS & VECTOR FIELDS</span>
            </div>
          </div>

          {/* Quick Stats/Weather Indicators */}
          <div className="px-5 py-2.5 bg-emerald-500/5 border-b border-white/10 flex justify-between items-center text-[10px] text-emerald-400 font-mono">
            <div className="flex items-center gap-2">
              <Wind size={11} className="animate-spin text-emerald-400" style={{ animationDuration: `${Math.max(0.5, 12 - (settings.windSpeed / 10))}s` }} />
              <span className="font-semibold">{settings.windSpeed} km/h • {getWindDescription(settings.windSpeed).fa}</span>
            </div>
            <div className="flex items-center gap-1.5 font-sans">
              <span>{getDirectionName(settings.windDirectionAngle).fa} ({settings.windDirectionAngle}°)</span>
              <Compass size={12} className="text-teal-400" style={{ transform: `rotate(${settings.windDirectionAngle}deg)` }} />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-black/20 text-[10px] font-mono font-bold tracking-wider">
            <button
              onClick={() => setActiveTab("clouds")}
              className={`flex-1 py-3 text-center transition-all duration-200 border-b-2 ${
                activeTab === "clouds" ? "border-sky-400 text-sky-400 bg-sky-500/10" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              CLOUDS
            </button>
            <button
              onClick={() => setActiveTab("wind")}
              className={`flex-1 py-3 text-center transition-all duration-200 border-b-2 ${
                activeTab === "wind" ? "border-emerald-400 text-emerald-400 bg-emerald-500/10" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              WIND
            </button>
            <button
              onClick={() => setActiveTab("sky")}
              className={`flex-1 py-3 text-center transition-all duration-200 border-b-2 ${
                activeTab === "sky" ? "border-amber-400 text-amber-400 bg-amber-500/10" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              ATMOS
            </button>
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 py-3 text-center transition-all duration-200 border-b-2 ${
                activeTab === "general" ? "border-indigo-400 text-indigo-400 bg-indigo-500/10" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              SYSTEM
            </button>
          </div>

          {/* Tab Contents - Scrollable */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-800">
            
            {/* 1. CLOUDS TAB */}
            {activeTab === "clouds" && (
              <div className="space-y-4 text-right">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-sky-450 mb-3 flex items-center gap-2 justify-end">
                  <span className="text-[11px] text-sky-400 font-bold">ساختار و لایه‌بندی ابرها</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>
                </h2>

                <p className="text-[10px] text-slate-400 bg-black/40 p-3 rounded-xl leading-relaxed text-right border border-white/5">
                  سیستم ابری سه‌لایه‌ای واقعی برپایه شبیه‌ساز حجم‌سنجی فیزیکی ابرها در ارتفاع‌های مختلف جغرافیای جوی.
                </p>

                {/* Cirrus Clouds (High) */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-sky-400 font-mono font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">{settings.cirrusCover}%</span>
                    <span className="font-semibold text-slate-300">لایه بالا: ابرهای سیروس (Cirrus)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.cirrusCover}
                    onChange={(e) => updateSetting("cirrusCover", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-[9px] text-slate-500 block">ابر غبارآلود بسیار مرتفع، نازک و پر‌مانند (ارتفاع ۱۱۰ متری)</span>
                </div>

                {/* Altocumulus Clouds (Middle) */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-teal-400 font-mono font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">{settings.middleCover}%</span>
                    <span className="font-semibold text-slate-300">لایه میانی: آلتوکومولوس (Altocumulus)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.middleCover}
                    onChange={(e) => updateSetting("middleCover", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                  />
                  <span className="text-[9px] text-slate-500 block">توده‌های پفکی متوسط و گسترده شبیه پوست ماهی (ارتفاع ۷۰ متری)</span>
                </div>

                {/* Cumulus Clouds (Low) */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{settings.cumulusCover}%</span>
                    <span className="font-semibold text-slate-300">لایه پایینی: کومولوس متراکم (Cumulus)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.cumulusCover}
                    onChange={(e) => updateSetting("cumulusCover", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <span className="text-[9px] text-slate-500 block">ابر سه بعدی پنبه‌ای بزرگ، متراکم با سایه‌زنی غلیظ (ارتفاع ۳۵ متری)</span>
                </div>
              </div>
            )}

            {/* 2. WIND TAB */}
            {activeTab === "wind" && (
              <div className="space-y-4 text-right">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-450 mb-3 flex items-center gap-2 justify-end">
                  <span className="text-[11px] text-emerald-400 font-bold">پویایی و نیروی جریان باد</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                </h2>

                <p className="text-[10px] text-slate-400 bg-black/40 p-3 rounded-xl leading-relaxed text-right border border-white/5">
                  شدت باد مستقیماً بر حرکت ابرها، رقص بیجک پرچم، ارتعاش درختان، موج‌های سطح دریا و فرکانس نویز صوتی شبیه‌ساز تأثیر می‌گذارد.
                </p>

                {/* Wind Speed (0 - 120 km/h) */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{settings.windSpeed} km/h</span>
                    <span className="font-semibold text-slate-300">سرعت وزش باد (Wind Velocity)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={settings.windSpeed}
                    onChange={(e) => updateSetting("windSpeed", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-serif">
                    <span>طوفان شدید (120)</span>
                    <span className="text-emerald-400 font-sans font-bold">{getWindDescription(settings.windSpeed).fa}</span>
                    <span>آرام (0)</span>
                  </div>
                </div>

                {/* Wind Direction (Compass) */}
                <div className="space-y-3 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{settings.windDirectionAngle}°</span>
                    <span className="font-semibold text-slate-300">بردار جهت وزش باد (Heading)</span>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-end">
                    {/* Compact Visual Compass */}
                    <div className="relative w-14 h-14 bg-black/50 rounded-full border border-white/10 flex items-center justify-center">
                      <span className="absolute top-0.5 text-[7px] text-slate-500 font-mono select-none">N</span>
                      <span className="absolute right-1 text-[7px] text-slate-500 font-mono select-none">E</span>
                      <span className="absolute bottom-0.5 text-[7px] text-slate-500 font-mono select-none">S</span>
                      <span className="absolute left-1 text-[7px] text-slate-500 font-mono select-none">W</span>
                      
                      {/* Compass Needle */}
                      <div 
                        className="w-1 h-9 bg-gradient-to-t from-transparent via-emerald-400 to-rose-500 rounded-full transition-transform duration-300"
                        style={{ transform: `rotate(${settings.windDirectionAngle}deg)` }}
                      ></div>
                    </div>
                    
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={settings.windDirectionAngle}
                        onChange={(e) => updateSetting("windDirectionAngle", Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                      <span className="text-[9px] text-slate-500 block">جهت باد: {getDirectionName(settings.windDirectionAngle).fa} ({settings.windDirectionAngle} درجه)</span>
                    </div>
                  </div>
                </div>

                {/* Ambient Animation Speed Multiplier */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-mono font-semibold bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{speedMultiplier}x</span>
                    <span className="font-semibold text-slate-300">شدت حرکت زمانی ابرها (Cloud Slide Speed)</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={speedMultiplier}
                    onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  />
                  <span className="text-[9px] text-slate-500 block">شبیه‌سازی گذر سریع زمان بر روی جابجایی توده‌های جوی</span>
                </div>
              </div>
            )}

            {/* 3. ATMOSPHERE / SKY TAB */}
            {activeTab === "sky" && (
              <div className="space-y-4 text-right">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-amber-450 mb-3 flex items-center gap-2 justify-end">
                  <span className="text-[11px] text-amber-400 font-bold">اتمسفر، خورشید و مه‌گرفتگی</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
                </h2>

                {/* Sun Time of Day / Presets */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-slate-300 block">موقعیت خورشید و ترجیحات زمانی (Day/Night Presets)</label>
                  
                  {/* Sun Presets Buttons Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(SunPreset) as Array<keyof typeof SunPreset>).map((key) => {
                      const value = SunPreset[key];
                      let labelFa = "طلوع";
                      switch(value) {
                        case SunPreset.Sunrise: labelFa = "طلوع"; break;
                        case SunPreset.Noon: labelFa = "ظهر"; break;
                        case SunPreset.Afternoon: labelFa = "عصر"; break;
                        case SunPreset.Sunset: labelFa = "غروب"; break;
                        case SunPreset.Night: labelFa = "شب"; break;
                      }

                      return (
                        <button
                          key={value}
                          onClick={() => setSunPresetTime(value)}
                          className={`py-2 px-1 text-[10px] font-bold rounded-xl text-center transition-all duration-150 border cursor-pointer ${
                            settings.sunPreset === value
                              ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                              : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {labelFa}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sun Slider */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-white bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{Math.floor(settings.sunTime).toString().padStart(2, "0")}:{Math.round((settings.sunTime % 1) * 60).toString().padStart(2, "0")}</span>
                      <span className="text-amber-400/90 font-sans font-semibold">تنظیم دقیق زاویه خورشید</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="23"
                      step="0.1"
                      value={settings.sunTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        let preset = SunPreset.Noon;
                        if (val < 8) preset = SunPreset.Sunrise;
                        else if (val < 14) preset = SunPreset.Noon;
                        else if (val < 17) preset = SunPreset.Afternoon;
                        else if (val < 19.5) preset = SunPreset.Sunset;
                        else preset = SunPreset.Night;
                        onChange({ ...settings, sunTime: val, sunPreset: preset });
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>
                </div>

                {/* Fog / Visibility Limits */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">{settings.fogCover}%</span>
                    <span className="font-semibold text-slate-300">غلظت و ضخامت مه (Fog Density)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.fogCover}
                    onChange={(e) => updateSetting("fogCover", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[9px] text-slate-500 block">شبیه‌سازی تجمع مه گرانشی غلیظ چگال در افق سطح دریا</span>
                </div>

                {/* Haze / Dust levels */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-amber-600 font-mono font-bold bg-amber-600/10 px-1.5 py-0.5 rounded border border-amber-600/20">{settings.dustHaze}%</span>
                    <span className="font-semibold text-slate-300">میزان ذرات گرد و غبار (Dust & Haze)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.dustHaze}
                    onChange={(e) => updateSetting("dustHaze", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-slate-500 block">پراکندگی آئروسل‌ها و ذرات خاکی شنی ساحل معلق در جو اتمسفر</span>
                </div>
              </div>
            )}

            {/* 4. GENERAL TAB */}
            {activeTab === "general" && (
              <div className="space-y-4 text-right">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-400 mb-3 flex items-center gap-2 justify-end">
                  <span className="text-[11px] text-indigo-300 font-bold">شبیه‌ساز و فرکانس‌های صوتی</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]"></div>
                </h2>

                {/* Graphics Mode & Navigation */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">حالت حرکت و ناوبری دوربین (Camera Matrix)</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsFirstPerson(true)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl text-center transition-all duration-200 border cursor-pointer ${
                        isFirstPerson 
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                          : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      🚶 اول شخص (پیاده‌روی)
                    </button>
                    <button
                      onClick={() => setIsFirstPerson(false)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl text-center transition-all duration-200 border cursor-pointer ${
                        !isFirstPerson 
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                          : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      🛸 پرواز آزاد (Free Fly)
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 block text-right mt-1 leading-relaxed">
                    {isFirstPerson 
                      ? "در حالت پیاده‌روی با جاذبه روی ماسه‌ها قدم می‌زنید. با کلیدهای حرکت ماجراجویی کنید."
                      : "در حالت پرواز بدون مهار به هر ارتفاعی صعود کنید تا لایه‌های جو را از نزدیک ببینید."}
                  </span>
                </div>

                {/* Synth Wind Sound Settings */}
                <div className="space-y-3 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{settings.soundVolume}%</span>
                    <span className="font-semibold text-slate-300">صدای افکت زوزه‌ی باد (Physical Audio Synth)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateSetting("soundEnabled", !settings.soundEnabled)}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                        settings.soundEnabled 
                          ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300" 
                          : "bg-black/40 border border-white/10 text-slate-500 hover:text-slate-300"
                      }`}
                      title={settings.soundEnabled ? "غیرفعال کردن صدا" : "فعال کردن صدا"}
                    >
                      {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>

                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.soundVolume}
                        onChange={(e) => updateSetting("soundVolume", Number(e.target.value))}
                        disabled={!settings.soundEnabled}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-45 accent-emerald-400"
                      />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 block leading-relaxed">
                    موتور شبیه‌ساز صداگذاری با سنتز موج نویز سفید فیلتر فرکانسی کم‌گذر و تلاطم زنده وزش تندباد ساحلی.
                  </span>
                </div>
              </div>
            )}
            
          </div>

          {/* Quick Help Toggler */}
          <div className="p-3.5 bg-black/40 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between text-[11px] text-slate-400 hover:text-white transition-all w-full text-right cursor-pointer"
            >
              <div className="flex items-center gap-1">
                <HelpCircle size={12} className="text-sky-400" />
                <span>راهنمای کلیدهای میانبر {showHelp ? "▲" : "▼"}</span>
              </div>
              <span className="font-mono text-[9px] text-slate-500">Shortcut Matrix</span>
            </button>

            {showHelp && (
              <div className="text-[10px] text-slate-300 space-y-1.5 border-t border-white/5 pt-2 leading-relaxed text-right font-sans">
                <div className="flex justify-between text-slate-400">
                  <span className="text-white text-right font-mono font-bold">W, A, S, D / Arrow Keys</span>
                  <span>حرکت در محیط</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-white text-right font-mono font-bold">Space / Shift</span>
                  <span>صعود / سقوط (پرواز آزاد)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-white text-right font-mono font-bold">Left Click + Drag (ماوس)</span>
                  <span>چرخش ۳۶۰ درجه دوربین</span>
                </div>
                <p className="text-[9px] text-emerald-300/90 bg-emerald-500/10 p-2 rounded-lg mt-1 border border-emerald-500/10">
                  💡 نکته: با تغییر سرعت باد، فرکانس زوزه‌ی صدای شبیه‌ساز به‌طور خودکار تغییر فرکانس می‌دهد.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
