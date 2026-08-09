import React, { useState } from 'react';
import type { ConnectionMode } from '../../hooks/useTelemetry';
import type { TelemetryFrame } from '../../types';
import { 
  Battery, 
  Radio, 
  Thermometer, 
  Wifi, 
  CircleDot,
  Bot,
  Power,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';

interface HeaderProps {
  telemetry: TelemetryFrame;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
  wsIp: string;
  setWsIp: (ip: string) => void;
  sendCommand?: (cmd: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  connectionStatus,
  mode,
  setMode,
  wsIp,
  setWsIp,
  sendCommand,
}) => {
  const { system } = telemetry;
  const [showPowerModal, setShowPowerModal] = useState<boolean>(false);
  const [powerAction, setPowerAction] = useState<'NONE' | 'REBOOT_CONFIRM' | 'SHUTDOWN_CONFIRM' | 'EXECUTING'>('NONE');
  const [statusMessage, setStatusMessage] = useState<string>('');

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

        {/* Pi Power Control Trigger */}
        <button
          onClick={() => {
            setShowPowerModal(true);
            setPowerAction('NONE');
            setStatusMessage('');
          }}
          className="glow-button flex items-center justify-center p-2 rounded-lg text-[#ff3366] hover:bg-[#ff3366]/20 border border-[#ff3366]/40 transition-all"
          title="Raspberry Pi Power Options (Reboot / Shutdown)"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {/* Pi Power Management Safe Confirmation Modal */}
      {showPowerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && powerAction !== 'EXECUTING') {
              setShowPowerModal(false);
            }
          }}
        >
          <div 
            className="glass-card flex flex-col gap-4 p-6 rounded-2xl max-w-md w-full border border-[#ff3366]/40 shadow-2xl relative animate-in fade-in zoom-in duration-200"
            style={{ background: 'linear-gradient(135deg, rgba(23, 28, 53, 0.98) 0%, rgba(35, 15, 30, 0.98) 100%)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#ff3366]">
                <Power className="w-5 h-5" />
                <h3 className="text-base font-bold text-white m-0">Raspberry Pi Power Control</h3>
              </div>
              {powerAction !== 'EXECUTING' && (
                <button 
                  onClick={() => setShowPowerModal(false)}
                  className="text-[#8e9bb4] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Area */}
            {powerAction === 'NONE' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#8e9bb4] m-0">
                  Select a system power operation for the onboard Raspberry Pi controller:
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Reboot Option */}
                  <button
                    onClick={() => setPowerAction('REBOOT_CONFIRM')}
                    className="glow-button flex flex-col items-center gap-2 p-4 text-center border border-[#ffb703]/50 hover:bg-[#ffb703]/20 transition-all rounded-xl"
                  >
                    <RotateCcw className="w-6 h-6 text-[#ffb703]" />
                    <div>
                      <span className="font-bold text-sm text-white block">Reboot Pi</span>
                      <span className="text-[10px] text-[#8e9bb4]">Restart Hexapod OS</span>
                    </div>
                  </button>

                  {/* Shutdown Option */}
                  <button
                    onClick={() => setPowerAction('SHUTDOWN_CONFIRM')}
                    className="glow-button flex flex-col items-center gap-2 p-4 text-center border border-[#ff3366]/50 hover:bg-[#ff3366]/20 transition-all rounded-xl"
                  >
                    <Power className="w-6 h-6 text-[#ff3366]" />
                    <div>
                      <span className="font-bold text-sm text-white block">Shutdown Pi</span>
                      <span className="text-[10px] text-[#8e9bb4]">Safe Poweroff</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Reboot Confirmation */}
            {powerAction === 'REBOOT_CONFIRM' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#ffb703] bg-[#ffb703]/10 p-3 rounded-lg border border-[#ffb703]/20">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs">
                    Are you sure you want to <strong>reboot</strong> the Raspberry Pi? Live connections will disconnect temporarily.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setPowerAction('NONE')}
                    className="glow-button px-4 py-2 text-xs text-[#8e9bb4]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setPowerAction('EXECUTING');
                      setStatusMessage('Rebooting Raspberry Pi... Reconnect in ~20 seconds.');
                      if (sendCommand) sendCommand('SYSTEM_REBOOT');
                    }}
                    className="glow-button px-4 py-2 text-xs font-bold text-black bg-[#ffb703] border-none rounded-lg"
                  >
                    Confirm Reboot
                  </button>
                </div>
              </div>
            )}

            {/* Shutdown Confirmation */}
            {powerAction === 'SHUTDOWN_CONFIRM' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#ff3366] bg-[#ff3366]/10 p-3 rounded-lg border border-[#ff3366]/20">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs">
                    Are you sure you want to <strong>safely power off</strong> the Raspberry Pi? You will need physical power cycle to restart.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setPowerAction('NONE')}
                    className="glow-button px-4 py-2 text-xs text-[#8e9bb4]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setPowerAction('EXECUTING');
                      setStatusMessage('Shutting down Raspberry Pi safely. You can cut battery power shortly.');
                      if (sendCommand) sendCommand('SYSTEM_SHUTDOWN');
                    }}
                    className="glow-button px-4 py-2 text-xs font-bold text-white bg-[#ff3366] border-none rounded-lg"
                  >
                    Confirm Shutdown
                  </button>
                </div>
              </div>
            )}

            {/* Executing Status */}
            {powerAction === 'EXECUTING' && (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-10 h-10 border-4 border-[#ff3366]/30 border-t-[#ff3366] rounded-full animate-spin" />
                <span className="text-sm font-semibold text-white">{statusMessage}</span>
                <span className="text-xs text-[#8e9bb4]">Signal sent to backend.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
