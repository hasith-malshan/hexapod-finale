import React from 'react';
import type { UltrasonicData } from '../../types';
import { ShieldAlert, Compass } from 'lucide-react';

interface RadarVisualizerProps {
  data: UltrasonicData;
  isObstacleAlert: boolean;
}

export const RadarVisualizer: React.FC<RadarVisualizerProps> = ({
  data,
  isObstacleAlert,
}) => {
  const { front, back, left, right } = data;
  const SAFE_DISTANCE = 40.0; // cm

  const isDanger = (val: number) => val < SAFE_DISTANCE;

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#00f2fe]" /> Obstacle Radar
        </h3>
        <p className="subtitle">Real-time HC-SR04 ultrasonic array ranging</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-5 my-auto">
        <div className="radar-container">
          <div className="radar-sweep"></div>
          <div className="radar-center"></div>

          {/* Ranging values overlay */}
          <div className={`radar-value radar-north ${isDanger(front) ? 'danger' : ''}`}>
            F: {front.toFixed(0)}cm
          </div>
          <div className={`radar-value radar-south ${isDanger(back) ? 'danger' : ''}`}>
            B: {back.toFixed(0)}cm
          </div>
          <div className={`radar-value radar-west ${isDanger(left) ? 'danger' : ''}`}>
            L: {left.toFixed(0)}cm
          </div>
          <div className={`radar-value radar-east ${isDanger(right) ? 'danger' : ''}`}>
            R: {right.toFixed(0)}cm
          </div>

          {/* Safety Ring */}
          <div 
            style={{ 
              position: 'absolute',
              width: '90px',
              height: '90px',
              border: '1px dashed rgba(255, 51, 102, 0.4)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Hazard alert box */}
        {isObstacleAlert || isDanger(front) || isDanger(back) || isDanger(left) || isDanger(right) ? (
          <div className="w-full bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#ff3366] animate-pulse">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold uppercase">PROXIMITY WARNING</div>
              <div className="text-[10px] text-[#ff3366]/90">
                Obstacle detected inside 40cm safe radius!
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#00ff88]">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-[#00ff88]" />
            <div>
              <div className="font-bold uppercase">PATH SECURED</div>
              <div className="text-[10px] text-[#00ff88]/90">
                All ranging channels clear. Normal navigation parameters.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
