import React from 'react';
import type { UltrasonicData } from '../../types';
import { ShieldAlert, Compass, Cpu, Volume2, Sparkles, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';

interface RadarVisualizerProps {
  data: UltrasonicData;
  isObstacleAlert?: boolean;
}

export const RadarVisualizer: React.FC<RadarVisualizerProps> = ({
  data,
}) => {
  const { front, back } = data;

  // Exact clarified zones:
  // 0 - 30cm: Excluded due to leg lengths (Filtered)
  // 30 - 60cm: DANGER (Critical hazard, Red LEDs, Stop)
  // 60 - 90cm: OBSTACLE CAUTION (Amber LEDs, Voice alert)
  // > 90cm: CLEAR TRAJECTORY (Green, music beat sync)
  const evalZone = (val: number) => {
    if (val < 30.0) return 'EXCLUDED';
    if (val <= 60.0) return 'DANGER';
    if (val <= 90.0) return 'WARNING';
    return 'CLEAR';
  };

  const frontZone = evalZone(front);
  const backZone = evalZone(back);

  const isDanger = frontZone === 'DANGER' || backZone === 'DANGER';
  const isWarning = !isDanger && (frontZone === 'WARNING' || backZone === 'WARNING');
  const isExcluded = !isDanger && !isWarning && (frontZone === 'EXCLUDED' || backZone === 'EXCLUDED');

  const getDistanceColor = (val: number) => {
    const z = evalZone(val);
    if (z === 'EXCLUDED') return '#8e9bb4'; // Muted grey for leg exclusion
    if (z === 'DANGER') return '#ff3366';   // Danger Red (30-60cm)
    if (z === 'WARNING') return '#ffb703';  // Warning Amber (60-90cm)
    return '#00ff88';                       // Clear Green (>90cm)
  };

  const getZoneBadge = (val: number) => {
    const z = evalZone(val);
    if (z === 'EXCLUDED') return 'LEG EXCLUSION (0-30cm)';
    if (z === 'DANGER') return 'DANGER (30-60cm)';
    if (z === 'WARNING') return 'OBSTACLE (60-90cm)';
    return 'CLEAR (>90cm)';
  };

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Compass className="w-4 h-4 text-[#00f2fe]" /> Dual Ultrasonic Collision Radar
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Front & Rear distance sensors with Leg Exclusion, Obstacle Caution & Voice Alerts
          </p>
        </div>

        <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-[#8e9bb4]">
          <Cpu className="w-3 h-3 text-[#00f2fe]" />
          <span>ESP32 2-Channel</span>
        </div>
      </div>

      {/* ALL LED STRIP STATUS & VOICE ALERT BANNER */}
      <div 
        className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 transition-all"
        style={{
          border: '1px solid',
          borderColor: isDanger ? '#ff3366' : isWarning ? '#ffb703' : 'rgba(0, 255, 136, 0.25)',
          background: isDanger ? 'rgba(255, 51, 102, 0.15)' : isWarning ? 'rgba(255, 183, 3, 0.15)' : 'rgba(0, 255, 136, 0.08)'
        }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles 
            className={`w-4 h-4 ${isDanger ? 'text-[#ff3366] animate-spin' : isWarning ? 'text-[#ffb703]' : 'text-[#00ff88]'}`} 
          />
          <div>
            <div className="text-[11px] font-bold text-white uppercase flex items-center gap-1.5">
              <span>ALL LED Strip Status:</span>
              <strong style={{ color: isDanger ? '#ff3366' : isWarning ? '#ffb703' : '#00ff88' }}>
                {isDanger ? '🔴 FLASHING INTENSE RED' : isWarning ? '🟠 SOLID AMBER / ORANGE CAUTION' : '🟢 DYNAMIC MUSIC MOOD SYNC'}
              </strong>
            </div>
            <div className="text-[10px] text-[#8e9bb4]">
              {isDanger 
                ? '30-60cm: Critical Hazard! Emergency Red Strobe & Voice Alert: Stopping!' 
                : isWarning 
                ? '60-90cm: Obstacle Caution! Amber LEDs & Voice Alert: Obstacle ahead.' 
                : '>90cm: Trajectory Clear. LEDs syncing with music beats. (0-30cm filtered for leg length)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-white">
          <Volume2 className="w-3 h-3 text-[#00f2fe]" />
          <span>Voice Alerts: ON</span>
        </div>
      </div>

      {/* Radar & Pinout Overview */}
      <div className="flex flex-col items-center justify-center gap-4 my-auto">
        <div className="radar-container" style={{ width: '175px', height: '175px' }}>
          <div className="radar-sweep"></div>
          <div className="radar-center"></div>

          {/* Front Value Overlay */}
          <div 
            className={`radar-value radar-north ${isDanger ? 'danger' : ''}`}
            style={{ color: getDistanceColor(front), fontWeight: 'bold' }}
          >
            ▲ FWD: {front.toFixed(0)}cm
          </div>

          {/* Back Value Overlay */}
          <div 
            className={`radar-value radar-south ${isDanger ? 'danger' : ''}`}
            style={{ color: getDistanceColor(back), fontWeight: 'bold' }}
          >
            ▼ REAR: {back.toFixed(0)}cm
          </div>

          {/* Zone 0: Leg Exclusion Inner Ring (0-30cm) */}
          <div 
            style={{ 
              position: 'absolute',
              width: '45px',
              height: '45px',
              border: '1px dotted #8e9bb4',
              borderRadius: '50%',
              pointerEvents: 'none',
              backgroundColor: 'rgba(142, 155, 180, 0.08)'
            }}
            title="0-30cm: Hexapod Leg Reach Exclusion Ring"
          />

          {/* Zone 1: Danger Ring (30-60cm) */}
          <div 
            style={{ 
              position: 'absolute',
              width: '90px',
              height: '90px',
              border: '1.5px dashed #ff3366',
              borderRadius: '50%',
              pointerEvents: 'none',
              backgroundColor: 'rgba(255, 51, 102, 0.05)'
            }}
            title="30-60cm: Critical Hazard Ring"
          />

          {/* Zone 2: Obstacle Caution Ring (60-90cm) */}
          <div 
            style={{ 
              position: 'absolute',
              width: '140px',
              height: '140px',
              border: '1px dashed #ffb703',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
            title="60-90cm: Obstacle Caution Ring"
          />
        </div>

        {/* Dual Sensor Pinout Breakdown Cards */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {/* Front Sensor Card */}
          <div 
            className="bg-black/40 border rounded-xl p-2.5 flex flex-col gap-1 transition-all"
            style={{ borderColor: getDistanceColor(front) }}
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
            <div className="text-[9px] font-bold" style={{ color: getDistanceColor(front) }}>
              {getZoneBadge(front)}
            </div>
          </div>

          {/* Back Sensor Card */}
          <div 
            className="bg-black/40 border rounded-xl p-2.5 flex flex-col gap-1 transition-all"
            style={{ borderColor: getDistanceColor(back) }}
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
            <div className="text-[9px] font-bold" style={{ color: getDistanceColor(back) }}>
              {getZoneBadge(back)}
            </div>
          </div>
        </div>

        {/* Dynamic Zone Feedback Banner */}
        {isDanger ? (
          <div className="w-full bg-[#ff3366]/15 border border-[#ff3366]/40 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#ff3366] animate-pulse">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold uppercase">30 – 60 cm: DANGER ZONE</div>
              <div className="text-[10px] text-white">
                Critical obstacle in path! ALL LEDs Red Strobe | Spoken: <em>"Warning! Critical obstacle ahead! Stopping!"</em>
              </div>
            </div>
          </div>
        ) : isWarning ? (
          <div className="w-full bg-[#ffb703]/15 border border-[#ffb703]/40 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#ffb703]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold uppercase">60 – 90 cm: OBSTACLE CAUTION</div>
              <div className="text-[10px] text-white">
                Approaching obstacle! ALL LEDs Solid Amber | Spoken: <em>"Obstacle detected ahead."</em>
              </div>
            </div>
          </div>
        ) : isExcluded ? (
          <div className="w-full bg-[#8e9bb4]/10 border border-[#8e9bb4]/30 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#8e9bb4]">
            <Ban className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="font-bold uppercase">0 – 30 cm: LEG EXCLUSION FILTERED</div>
              <div className="text-[10px] text-[#8e9bb4]">
                Self-body leg reach radius (0-30cm) is filtered to prevent false positive triggers.
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-[#00ff88]">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#00ff88]" />
            <div>
              <div className="font-bold uppercase">&gt; 90 cm: CLEAR TRAJECTORY</div>
              <div className="text-[10px] text-[#00ff88]/90">
                Front & Rear clear. ALL LEDs in dynamic music beat sync.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
