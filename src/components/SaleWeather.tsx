import { useEffect, useState } from 'react';
import {
  fetchSaleWeather,
  type SaleWeatherForecast,
  type WeatherIconKind,
} from '../utils/weather';

function WeatherGlyph({ kind }: { kind: WeatherIconKind }) {
  switch (kind) {
    case 'sun':
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
        </svg>
      );
    case 'partly-cloudy':
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6.2 3.2V2M3 4.5l.9.9M2 7.5h1.2M9.2 4.3l.8-.8" />
          <path d="M4.2 7.5a2.3 2.3 0 0 1 4.1-1.3" />
          <path d="M6.3 12.5h5.9a2.1 2.1 0 0 0 .3-4.2 3 3 0 0 0-5.7-.6 2.1 2.1 0 0 0-.5 4.8z" />
        </svg>
      );
    case 'rain':
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 10h7.2a2.2 2.2 0 0 0 .4-4.4 3.3 3.3 0 0 0-6.3-.8A2.3 2.3 0 0 0 4.5 10z" />
          <path d="M5.5 12.2l-.7 1.6M8.5 12.2l-.7 1.6M11.5 12.2l-.7 1.6" />
        </svg>
      );
    case 'snow':
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 9.8h7.2a2.2 2.2 0 0 0 .4-4.4 3.3 3.3 0 0 0-6.3-.8A2.3 2.3 0 0 0 4.5 9.8z" />
          <path d="M5.5 12.6h.01M8.2 13.4h.01M10.9 12.6h.01" strokeWidth={2.1} />
        </svg>
      );
    case 'storm':
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.3 9.5h7.4a2.1 2.1 0 0 0 .4-4.2 3.2 3.2 0 0 0-6.1-.8 2.2 2.2 0 0 0-1.7 5z" />
          <path d="M8.6 9.5L7 12.3h2l-1.2 2.2" />
        </svg>
      );
    case 'cloud':
    default:
      return (
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4.5 11.8h7.2a2.4 2.4 0 0 0 .4-4.8 3.5 3.5 0 0 0-6.7-.9 2.5 2.5 0 0 0-.9 5.7z" />
        </svg>
      );
  }
}

type WeatherState =
  | { kind: 'loading' }
  | { kind: 'ok'; forecast: SaleWeatherForecast }
  | { kind: 'out-of-range' }
  | { kind: 'unavailable' };

export function SaleWeather({
  lat,
  lng,
  date,
}: {
  lat: number;
  lng: number;
  date: string;
}) {
  const [state, setState] = useState<WeatherState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });

    void fetchSaleWeather(lat, lng, date, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.status === 'ok') {
          setState({ kind: 'ok', forecast: res.forecast });
        } else {
          setState({ kind: res.status });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ kind: 'unavailable' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [lat, lng, date]);

  if (state.kind === 'loading') {
    return (
      <div
        className="details-weather is-loading"
        aria-busy="true"
        aria-label="Loading sale day weather forecast"
      >
        <span className="skeleton h-3.5 w-40 rounded" />
        <span className="skeleton h-4 w-20 rounded-full" />
      </div>
    );
  }

  if (state.kind === 'out-of-range') {
    return (
      <div className="details-weather is-muted">
        <span className="details-weather-main">
          <WeatherGlyph kind="partly-cloudy" />
          <span className="details-weather-copy">
            Forecast available within 15 days of sale
          </span>
        </span>
      </div>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <div className="details-weather is-muted">
        <span className="details-weather-main">
          <WeatherGlyph kind="cloud" />
          <span className="details-weather-copy">Forecast unavailable right now</span>
        </span>
      </div>
    );
  }

  const { forecast } = state;
  const rainSuffix =
    forecast.precipChance >= 15 ? ` · ${forecast.precipChance}% rain` : '';
  const summaryTitle = `${forecast.condition}, high ${forecast.tempHigh}${forecast.unit}, low ${forecast.tempLow}${forecast.unit}, ${forecast.precipChance}% chance of rain, wind up to ${forecast.windMax} ${forecast.windUnit}`;

  return (
    <div
      className={`details-weather is-${forecast.rating}`}
      aria-label={`Sale day weather: ${summaryTitle}. ${forecast.verdict}`}
      title={summaryTitle}
    >
      <span className="details-weather-main">
        <span className="details-weather-ic">
          <WeatherGlyph kind={forecast.icon} />
        </span>
        <span className="details-weather-copy">
          <b>{`${forecast.tempHigh}°/${forecast.tempLow}${forecast.unit}`}</b>
          {` · ${forecast.condition}${rainSuffix}`}
        </span>
      </span>
      <span className={`details-weather-badge is-${forecast.rating}`}>
        {forecast.verdict}
      </span>
    </div>
  );
}
