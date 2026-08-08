import React from 'react';
import type { ConnectionMode } from '../../hooks/useTelemetry';
import type { TelemetryFrame } from '../../types';
import { 
  Battery, 
  Radio, 
  Thermometer, 
  Wifi, 
  CircleDot,
  Bot
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
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 style={{ fontSize: '20px', margin: 0 }} className="title-glow">CODEGENIX HEXAPOD</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/30">
              GOD-MODE OS
            </span>
          </div>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Unified Real-Time Telemetry & Choreography Control Station
          </p>
        </div>
      </div>

      {/* System stats */}
      {connectionStatus === 'CONNECTED' && (
        <div className="flex flex-wrap items-center gap-3 md:gap-5 text-sm">
          {/* Operating Mode badge */}
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Bot className="w-4 h-4 text-[#00f2fe]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8e9bb4]">MODE</span>
              <span className="font-bold text-xs text-white">
                {system.operatingMode === 'AUTO' ? 'AUTO AI' : 'MANUAL'}
              </span>
            </div>
          </div>

          {/* Battery */}
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Battery className={`w-4 h-4 ${getBatteryIconColor(system.batteryLevel)}`} />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8e9bb4]">BATTERY</span>
              <span className="font-semibold text-xs text-white">{system.batteryLevel.toFixed(2)}V</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Thermometer className="w-4 h-4 text-[#ffb703]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8e9bb4]">CPU</span>
              <span className="font-semibold text-xs text-white">{system.cpuTemp.toFixed(1)}°C</span>
            </div>
          </div>

          {/* WiFi SSID */}
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Wifi className="w-4 h-4 text-[#00f2fe]" />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8e9bb4]">HOTSPOT</span>
              <span className="font-semibold text-xs text-white truncate max-w-[90px]">{system.wifiSsid}</span>
            </div>
          </div>

          {/* UART Link */}
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Radio className={`w-4 h-4 ${system.serialConnected ? 'text-[#00ff88]' : 'text-[#ff3366]'}`} />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8e9bb4]">ESP32 USB</span>
              <span className="font-semibold text-xs text-white">{system.serialConnected ? 'READY' : 'OFF'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Connection & Host Settings */}
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'LIVE' && (
          <input 
            type="text" 
            value={wsIp}
            onChange={(e) => setWsIp(e.target.value)}
            placeholder="10.42.0.1:8000"
            className="glow-input text-xs"
            style={{ width: '140px', padding: '6px 10px', fontSize: '11px' }}
          />
        )}

        <select 
          value={mode}
          onChange={(e) => setMode(e.target.value as ConnectionMode)}
          className="glow-input text-xs"
          style={{ padding: '6px 10px', background: 'rgba(23, 28, 53, 0.8)', fontSize: '11px' }}
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
