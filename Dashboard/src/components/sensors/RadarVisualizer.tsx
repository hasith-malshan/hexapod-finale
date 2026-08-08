import React from 'react';
import type { UltrasonicData } from '../../types';
import { ShieldAlert, Compass, Cpu } from 'lucide-react';

interface RadarVisualizerProps {
  data: UltrasonicData;
  isObstacleAlert: boolean;
}

export const RadarVisualizer: React.FC<RadarVisualizerProps> = ({
  data,
  isObstacleAlert,
}) => {
  const { front, back } = data;
  const SAFE_DISTANCE = 40.0; // cm

  const isDanger = (val: number) => val < SAFE_DISTANCE;

  const getDistanceColor = (val: number) => {
    if (val < SAFE_DISTANCE) return '#ff3366';
    if (val < 70) return '#ffb703';
    return '#00ff88';
  };

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Compass className="w-4 h-4 text-[#00f2fe]" /> Dual HC-SR04 Radar Array
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Front & Rear longitudinal collision detection
          </p>
        </div>

        <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-[#8e9bb4]">
          <Cpu className="w-3 h-3 text-[#00f2fe]" />
          <span>ESP32 2-Channel</span>
        </div>
      </div>

      {/* Radar & Pinout Overview */}
      <div className="flex flex-col items-center justify-center gap-4 my-auto">
        <div className="radar-container" style={{ width: '170px', height: '170px' }}>
          <div className="radar-sweep"></div>
          <div className="radar-center"></div>

          {/* Front Value Overlay */}
          <div 
            className={`radar-value radar-north ${isDanger(front) ? 'danger' : ''}`}
            style={{ color: getDistanceColor(front) }}
          >
            ▲ FRONT: {front.toFixed(0)}cm
          </div>

          {/* Back Value Overlay */}
          <div 
            className={`radar-value radar-south ${isDanger(back) ? 'danger' : ''}`}
            style={{ color: getDistanceColor(back) }}
          >
            ▼ REAR: {back.toFixed(0)}cm
          </div>

          {/* Safety Critical Radius Ring (40cm) */}
          <div 
            style={{ 
              position: 'absolute',
              width: '85px',
              height: '85px',
              border: '1px dashed rgba(255, 51, 102, 0.4)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Dual Sensor Pinout Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {/* Front Sensor Card */}
          <div 
            className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 transition-all"
            style={{ borderColor: isDanger(front) ? '#ff3366' : undefined }}
          >
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-white uppercase">Front Sensor</span>
              <span 
                className="font-mono font-bold"
                style={{ color: getDistanceColor(front) }}
              >
                {front.toFixed(1)} cm
              </span>
            </div>
            <div className="text-[9px] text-[#8e9bb4] font-mono">
              Trig: <span className="text-[#00f2fe]">GPIO 18</span> | Echo: <span className="text-[#00f2fe]">GPIO 19</span>
            </div>
          </div>

          {/* Back Sensor Card */}
          <div 
            className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex flex-col gap-1 transition-all"
            style={{ borderColor: isDanger(back) ? '#ff3366' : undefined }}
          >
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-white uppercase">Rear Sensor</span>
              <span 
                className="font-mono font-bold"
                style={{ color: getDistanceColor(back) }}
              >
                {back.toFixed(1)} cm
              </span>
            </div>
            <div className="text-[9px] text-[#8e9bb4] font-mono">
              Trig: <span className="text-[#ffb703]">GPIO 27</span> | Echo: <span className="text-[#ffb703]">GPIO 14</span>
            </div>
          </div>
        </div>

        {/* Hazard Alert Banner */}
        {isObstacleAlert || isDanger(front) || isDanger(back) ? (
          <div className="w-full bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#ff3366] animate-pulse">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold uppercase">PROXIMITY WARNING</div>
              <div className="text-[10px] text-[#ff3366]/90">
                Obstacle detected inside 40cm safe perimeter!
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#00ff88]">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-[#00ff88]" />
            <div>
              <div className="font-bold uppercase">CLEAR TRAJECTORY</div>
              <div className="text-[10px] text-[#00ff88]/90">
                Front & Rear channels clear. Ranging nominal.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
