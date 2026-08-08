import React from 'react';
import type { ConnectionMode } from '../../hooks/useTelemetry';
import type { TelemetryFrame } from '../../types';
import { 
  Battery, 
  Radio, 
  Thermometer, 
  Wifi, 
  CircleDot
} from 'lucide-react';

interface HeaderProps {
  telemetry: TelemetryFrame;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
  wsIp: string;
  setWsIp: (ip: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  connectionStatus,
  mode,
  setMode,
  wsIp,
  setWsIp,
}) => {
  const { system } = telemetry;

  const getStatusClass = () => {
    if (connectionStatus === 'CONNECTED') return 'status-badge online';
    if (connectionStatus === 'CONNECTING') return 'status-badge connecting';
    return 'status-badge offline';
  };

  const getBatteryIconColor = (voltage: number) => {
    if (voltage > 7.8) return 'text-[#00ff88]';
    if (voltage > 7.2) return 'text-[#ffb703]';
    return 'text-[#ff3366] animate-pulse';
  };

  return (
    <header className="glass-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ padding: '15px 25px' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <CircleDot className={`w-8 h-8 ${connectionStatus === 'CONNECTED' ? 'text-[#00f2fe] animate-pulse' : 'text-[#ff3366]'}`} />
          {connectionStatus === 'CONNECTED' && (
            <span className="absolute -top-1 -right-1 flex h-3.xl w-3.xl">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
            </span>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0 }} className="title-glow">CODEGENIX HEXAPOD</h1>
          <p className="subtitle" style={{ fontSize: '11px' }}>OS Telemetry & Core Command Dashboard</p>
        </div>
      </div>

      {/* System stats */}
      {connectionStatus === 'CONNECTED' && (
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {/* Battery */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Battery className={`w-4 h-4 ${getBatteryIconColor(system.batteryLevel)}`} />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8e9bb4]">BATTERY</span>
              <span className="font-semibold text-white">{system.batteryLevel.toFixed(2)}V</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Thermometer className="w-4 h-4 text-[#ffb703]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8e9bb4]">CPU TEMP</span>
              <span className="font-semibold text-white">{system.cpuTemp.toFixed(1)}°C</span>
            </div>
          </div>

          {/* WiFi Ssid */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Wifi className="w-4 h-4 text-[#00f2fe]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8e9bb4]">SSID</span>
              <span className="font-semibold text-white truncate max-w-[100px]">{system.wifiSsid}</span>
            </div>
          </div>

          {/* UART Connection Status */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Radio className={`w-4 h-4 ${system.serialConnected ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8e9bb4]">UART LINK</span>
              <span className="font-semibold text-white">{system.serialConnected ? 'ACTIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Mode selection */}
      <div className="flex flex-wrap items-center gap-3">
        {mode === 'LIVE' && (
          <input 
            type="text" 
            value={wsIp}
            onChange={(e) => setWsIp(e.target.value)}
            placeholder="Pi IP:Port"
            className="glow-input text-xs"
            style={{ width: '130px', padding: '6px 10px' }}
          />
        )}

        <select 
          value={mode}
          onChange={(e) => setMode(e.target.value as ConnectionMode)}
          className="glow-input text-xs"
          style={{ padding: '6px 10px', background: 'rgba(23, 28, 53, 0.8)' }}
        >
          <option value="SIMULATOR">🤖 SIMULATOR</option>
          <option value="LIVE">🍓 LIVE PI HOST</option>
        </select>

        <span className={getStatusClass()}>
          {connectionStatus === 'CONNECTED' ? 'ONLINE' : connectionStatus === 'CONNECTING' ? 'CONNECTING' : 'OFFLINE'}
        </span>
      </div>
    </header>
  );
};
