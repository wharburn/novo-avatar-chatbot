'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface WeatherData {
  temperature: {
    fahrenheit: number;
    celsius: number;
  };
  condition: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
  icon?: string;
  location?: string;
  feelsLike?: {
    fahrenheit: number;
    celsius: number;
  };
  uv?: number;
  isDay?: boolean;
}

interface WeatherOverlayProps {
  weather: WeatherData | null;
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number; // Duration in ms before auto-hiding
}

export default function WeatherOverlay({
  weather,
  isVisible,
  onComplete,
  duration = 4000,
}: WeatherOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isVisible && weather) {
      setShouldRender(true);
      // Fade in
      requestAnimationFrame(() => {
        setOpacity(1);
      });

      // Auto-hide after duration
      const hideTimer = setTimeout(() => {
        setOpacity(0);
        // Wait for fade out animation before unmounting
        setTimeout(() => {
          setShouldRender(false);
          onCompleteRef.current?.();
        }, 500);
      }, duration);

      return () => clearTimeout(hideTimer);
    } else {
      setOpacity(0);
      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(unmountTimer);
    }
  }, [isVisible, weather, duration]);

  if (!shouldRender || !weather) return null;

  // Get weather icon URL - WeatherAPI returns protocol-relative URLs
  const iconUrl = weather.icon?.startsWith('//') ? `https:${weather.icon}` : weather.icon;

  // Determine background gradient based on conditions
  const getBackgroundGradient = () => {
    const condition = weather.condition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return 'from-slate-700/90 to-blue-900/90';
    }
    if (condition.includes('cloud') || condition.includes('overcast')) {
      return 'from-gray-600/90 to-slate-700/90';
    }
    if (condition.includes('snow')) {
      return 'from-blue-100/90 to-white/90';
    }
    if (weather.isDay) {
      return 'from-sky-400/90 to-blue-500/90';
    }
    return 'from-indigo-900/90 to-slate-900/90';
  };

  const textColor = weather.condition.toLowerCase().includes('snow')
    ? 'text-slate-800'
    : 'text-white';

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${getBackgroundGradient()} bg-gradient-to-b`}
      style={{ opacity }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          setOpacity(0);
          setTimeout(() => {
            setShouldRender(false);
            onCompleteRef.current?.();
          }, 500);
        }}
        className={`absolute top-4 right-4 ${textColor} opacity-50 hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-white/10`}
        aria-label="Close weather"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className={`text-center p-6 ${textColor}`}>
        {/* Location */}
        <p className="text-lg opacity-80 mb-2">{weather.location || 'Your Location'}</p>

        {/* Weather Icon */}
        {iconUrl && (
          <div className="flex justify-center mb-2">
            <Image
              src={iconUrl}
              alt={weather.condition}
              width={96}
              height={96}
              className="drop-shadow-lg"
              unoptimized
            />
          </div>
        )}

        {/* Temperature - Celsius primary */}
        <div className="text-6xl font-light mb-1">{weather.temperature.celsius}°C</div>
        <div className="text-xl opacity-70 mb-2">{weather.temperature.fahrenheit}°F</div>

        {/* Condition */}
        <p className="text-2xl font-medium mb-4 capitalize">{weather.condition}</p>

        {/* Additional info */}
        <div className="flex justify-center gap-6 text-sm opacity-80">
          {weather.feelsLike && (
            <div>
              <span className="block opacity-60">Feels like</span>
              <span>{weather.feelsLike.fahrenheit}°F</span>
            </div>
          )}
          {weather.humidity !== undefined && (
            <div>
              <span className="block opacity-60">Humidity</span>
              <span>{weather.humidity}%</span>
            </div>
          )}
          {weather.windSpeed !== undefined && (
            <div>
              <span className="block opacity-60">Wind</span>
              <span>{weather.windSpeed} mph</span>
            </div>
          )}
          {weather.uv !== undefined && (
            <div>
              <span className="block opacity-60">UV</span>
              <span>{weather.uv}</span>
            </div>
          )}
        </div>

        {/* Attribution */}
        <div className="mt-6 opacity-50 text-xs">
          <a
            href="https://www.weatherapi.com/"
            title="Free Weather API"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            Powered by WeatherAPI.com
          </a>
        </div>
      </div>
    </div>
  );
}
