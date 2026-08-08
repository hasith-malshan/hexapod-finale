import React, { useState, useEffect } from 'react';
import type { TelemetryFrame } from '../../types';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Square, 
  Gauge, 
  Zap, 
  Anchor
} from 'lucide-react';

interface LocomotionControlProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

export const LocomotionControl: React.FC<LocomotionControlProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system } = telemetry;
  const [speedVal, setSpeedVal] = useState(system.speedMultiplier);
  const [heightVal, setHeightVal] = useState(system.bodyHeight);

  // Sync state if changed externally
  useEffect(() => {
    setSpeedVal(system.speedMultiplier);
  }, [system.speedMultiplier]);

  useEffect(() => {
    setHeightVal(system.bodyHeight);
  }, [system.bodyHeight]);

  const handleDpadPress = (action: string) => {
    sendCommand(action);
  };

  const handleSpeedChange = (val: number) => {
    setSpeedVal(val);
    sendCommand(`SPEED:${val.toFixed(2)}`);
  };

  const handleHeightChange = (val: number) => {
    setHeightVal(val);
    sendCommand(`BODY_HEIGHT:${val.toFixed(1)}`);
  };

  return (
    <div className="glass-card flex flex-col gap-6" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00f2fe]" /> Locomotion Interface
        </h3>
        <p className="subtitle">Real-time gait control and body posture vectors</p>
      </div>

      <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-around">
        {/* D-Pad controls */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] text-[#8e9bb4] font-semibold tracking-wider uppercase mb-1">Directional Vector</span>
          <div className="dpad-container">
            <button 
              className={`dpad-btn dpad-up ${system.activeGait === 'WALK_FORWARD' ? 'active' : ''}`}
              onClick={() => handleDpadPress('WALK_FORWARD')}
              title="Walk Forward"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <button 
              className={`dpad-btn dpad-left ${system.activeGait === 'TURN_LEFT' ? 'active' : ''}`}
              onClick={() => handleDpadPress('TURN_LEFT')}
              title="Turn Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
              className={`dpad-btn dpad-center ${system.activeGait === 'STAND' ? 'active' : ''}`}
              onClick={() => handleDpadPress('STAND')}
              title="Stand Pose"
            >
              STAND
            </button>
            <button 
              className={`dpad-btn dpad-right ${system.activeGait === 'TURN_RIGHT' ? 'active' : ''}`}
              onClick={() => handleDpadPress('TURN_RIGHT')}
              title="Turn Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            <button 
              className={`dpad-btn dpad-down ${system.activeGait === 'WALK_BACKWARD' ? 'active' : ''}`}
              onClick={() => handleDpadPress('WALK_BACKWARD')}
              title="Walk Backward"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
          </div>
          <button 
            className={`glow-button danger ${system.activeGait === 'RELAX' ? 'active' : ''}`}
            onClick={() => handleDpadPress('RELAX')}
            style={{ width: '100%', marginTop: '12px', fontSize: '11px' }}
          >
            <Square className="w-3.5 h-3.5" /> RELAX LEGS
          </button>
        </div>

        {/* Posture adjustments */}
        <div className="flex-1 flex flex-col gap-6 w-full max-w-[280px]">
          {/* Height adjustment */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#8e9bb4] uppercase tracking-wider">
                <Anchor className="w-3.5 h-3.5 text-[#ffb703]" /> Body Height
              </span>
              <span className="font-bold text-[#ffb703]">{heightVal.toFixed(0)} mm</span>
            </div>
            <input 
              type="range" 
              min="-100" 
              max="-10" 
              step="5"
              value={heightVal}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              className="w-full accent-[#ffb703] h-1 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#8e9bb4]">
              <span>LOW (-100mm)</span>
              <span>HIGH (-10mm)</span>
            </div>
          </div>

          {/* Speed adjustment */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#8e9bb4] uppercase tracking-wider">
                <Gauge className="w-3.5 h-3.5 text-[#00f2fe]" /> Gait Speed
              </span>
              <span className="font-bold text-[#00f2fe]">{speedVal.toFixed(2)}x</span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="2.0" 
              step="0.1"
              value={speedVal}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full accent-[#00f2fe] h-1 bg-white/10 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#8e9bb4]">
              <span>SLOW (0.2x)</span>
              <span>FAST (2.0x)</span>
            </div>
          </div>

          {/* Status info */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-[#8e9bb4]">Current Gait:</span>
              <span className="font-bold text-[#00f2fe]">{system.activeGait}</span>
            </div>
            {system.activeDance !== 'NONE' && (
              <div className="flex justify-between">
                <span className="text-[#8e9bb4]">Active Dance:</span>
                <span className="font-bold text-[#9d4edd]">{system.activeDance}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
