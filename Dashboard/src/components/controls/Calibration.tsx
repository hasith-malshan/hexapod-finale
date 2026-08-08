import React, { useState } from 'react';
import type { TelemetryFrame } from '../../types';
import { Settings, Cpu } from 'lucide-react';

interface CalibrationProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

export const Calibration: React.FC<CalibrationProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { servos } = telemetry;
  const [selectedChannel, setSelectedChannel] = useState<number>(0);
  const [testAngle, setTestAngle] = useState<number>(90);
  const [calibOffset, setCalibOffset] = useState<number>(0);
  const [activeLegTest, setActiveLegTest] = useState<number | null>(null);

  const handleSetAngle = () => {
    sendCommand(`SET ${selectedChannel} ${testAngle}`);
  };

  const handleSetCalibrate = () => {
    sendCommand(`CALIBRATE ${selectedChannel} ${calibOffset}`);
  };

  const handleLegTest = (legId: number) => {
    if (activeLegTest === legId) {
      setActiveLegTest(null);
      sendCommand('STAND');
    } else {
      setActiveLegTest(legId);
      sendCommand(`TEST_LEG_${legId}`);
    }
  };

  const handleRelax = () => {
    sendCommand('RELAX');
  };

  // Find the selected servo properties
  const selectedServo = servos.find(s => s.id === selectedChannel);

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#ffb703]" /> Diagnostics & Calibration
        </h3>
        <p className="subtitle">Raw servo angle override and permanent non-volatile offset settings</p>
      </div>

      <div className="grid-cols-2" style={{ gap: '15px' }}>
        {/* Left Side: Controls */}
        <div className="flex flex-col gap-4 bg-white/5 border border-white/5 p-4 rounded-xl">
          {/* Leg Diagnostics */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider">Independent Leg Diagnostics</span>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((legId) => (
                <button
                  key={legId}
                  onClick={() => handleLegTest(legId)}
                  className={`glow-button text-xs py-1.5 px-2`}
                  style={{ 
                    borderStyle: 'solid', 
                    borderWidth: '1px',
                    borderColor: activeLegTest === legId ? 'var(--neon-yellow)' : 'var(--border-glass)',
                    background: activeLegTest === legId ? 'rgba(255, 183, 3, 0.15)' : 'rgba(23, 28, 53, 0.4)'
                  }}
                >
                  LEG {legId}
                </button>
              ))}
            </div>
            <button 
              onClick={handleRelax}
              className="glow-button danger text-[10px] mt-2 py-1"
              style={{ width: '100%' }}
            >
              RELAX ALL LEGS
            </button>
          </div>

          {/* Channel Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider">Select Joint Channel (0 - 17)</label>
            <select
              value={selectedChannel}
              onChange={(e) => {
                const ch = parseInt(e.target.value);
                setSelectedChannel(ch);
                const s = servos.find(sv => sv.id === ch);
                if (s) {
                  setTestAngle(s.angle);
                  setCalibOffset(s.offset);
                }
              }}
              className="glow-input w-full text-xs"
              style={{ background: 'rgba(23, 28, 53, 0.8)' }}
            >
              {servos.map((s) => (
                <option key={s.id} value={s.id}>
                  CH {s.id.toString().padStart(2, '0')} - {s.name} (Val: {s.angle}°, Off: {s.offset}°)
                </option>
              ))}
            </select>
          </div>

          {/* Selected Servo Details */}
          {selectedServo && (
            <div className="text-[11px] bg-black/35 rounded p-2 text-[#8e9bb4] border border-white/5 flex justify-between">
              <span>Channel: <strong className="text-white">{selectedServo.id}</strong></span>
              <span>Name: <strong className="text-white">{selectedServo.name}</strong></span>
              <span>Current: <strong className="text-[#00f2fe]">{selectedServo.angle}°</strong></span>
            </div>
          )}

          {/* Raw Angle Override */}
          <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase">Angle Override</span>
              <span className="font-bold text-white">{testAngle}°</span>
            </div>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="180"
                value={testAngle}
                onChange={(e) => setTestAngle(parseInt(e.target.value))}
                className="flex-1 accent-[#00f2fe] h-1 bg-white/10 rounded-lg cursor-pointer align-middle mt-2"
              />
              <button 
                onClick={handleSetAngle}
                className="glow-button primary py-1 px-3 text-xs"
              >
                APPLY
              </button>
            </div>
          </div>

          {/* Calibration offset */}
          <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase">Calibration Offset</span>
              <span className="font-bold text-[#ffb703]">{calibOffset > 0 ? `+${calibOffset}` : calibOffset}°</span>
            </div>
            <div className="flex gap-2">
              <input
                type="range"
                min="-30"
                max="30"
                value={calibOffset}
                onChange={(e) => setCalibOffset(parseInt(e.target.value))}
                className="flex-1 accent-[#ffb703] h-1 bg-white/10 rounded-lg cursor-pointer align-middle mt-2"
              />
              <button 
                onClick={handleSetCalibrate}
                className="glow-button py-1 px-3 text-xs"
                style={{ borderColor: 'var(--neon-yellow)', color: 'var(--neon-yellow)' }}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Servo Matrix list */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider px-1">Servo Driver Load Matrix</span>
          <div className="bg-black/30 border border-white/5 rounded-xl p-2 flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '290px' }}>
            {servos.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#8e9bb4]">
                <Cpu className="w-8 h-8 text-[#ff3366] mx-auto mb-2 animate-pulse" />
                Waiting for Serial Data...
              </div>
            ) : (
              servos.map((s) => {
                const isSelected = s.id === selectedChannel;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedChannel(s.id)}
                    className="flex justify-between items-center p-1.5 px-2.5 rounded text-[10px] cursor-pointer transition-colors"
                    style={{ 
                      background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--neon-cyan)' : '2px solid transparent'
                    }}
                  >
                    <span className="font-mono text-[#8e9bb4]">
                      {s.id.toString().padStart(2, '0')} <span className="text-white font-sans font-medium ml-1">{s.name}</span>
                    </span>
                    <div className="flex gap-3 font-mono">
                      <span>A: <strong className="text-white">{s.angle.toString().padStart(3, ' ')}°</strong></span>
                      <span>O: <strong className="text-[#ffb703]">{s.offset >= 0 ? `+${s.offset}` : s.offset}</strong></span>
                      <span>L: <strong className="text-[#00ff88]">{s.load.toFixed(0)}%</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
