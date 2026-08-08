import React from 'react';
import type { TelemetryFrame } from '../../types';
import { Music, Disc, Play } from 'lucide-react';

interface PresetDancesProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

const PRESET_DANCES = [
  { id: 'WAVE', name: 'Wave Preset', desc: 'Legs wave sequentially' },
  { id: 'RIPPLE', name: 'Ripple Walk', desc: 'Smooth ripple gait shift' },
  { id: 'SALSA', name: 'Salsa Step', desc: 'Syncopated rhythm sway' },
  { id: 'TWIST', name: 'Body Twist', desc: 'Yaw-axis body torsion' },
  { id: 'ROLL', name: 'Gyroscopic Roll', desc: 'Roll-axis posture tilt' },
  { id: 'CIRCLE', name: 'Orbit rotation', desc: 'Horizontal circular drag' },
  { id: 'CRAWL', name: 'Low Crawl', desc: 'Sprawled low posture crawl' },
  { id: 'HEADBANG', name: 'Headbang Beat', desc: 'Pitch-axis vertical bounce' },
  { id: 'GALLOP', name: 'Gallop Jump', desc: 'Double-leg lunging gait' },
  { id: 'WORM', name: 'Worm Wave', desc: 'Longitudinal body ripple' }
];

export const PresetDances: React.FC<PresetDancesProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system } = telemetry;

  const handleDanceTrigger = (danceId: string) => {
    sendCommand(`DANCE_${danceId}`);
  };

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Music className="w-4 h-4 text-[#9d4edd]" /> Dance Choreography
        </h3>
        <p className="subtitle">Pre-programmed inverse-kinematics dance sequences</p>
      </div>

      <div className="audio-dsp-status flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg p-3 text-xs mb-1">
        <Disc className={`w-5 h-5 text-[#9d4edd] ${system.activeGait === 'DANCE' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
        <div>
          <div className="font-semibold text-white">Choreography Status</div>
          <div className="text-[10px] text-[#8e9bb4]">
            {system.activeGait === 'DANCE' ? (
              <span>ACTIVE: <strong className="text-[#9d4edd]">{system.activeDance}</strong></span>
            ) : (
              <span>STANDBY / Locomotion mode active</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid-cols-2" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
        {PRESET_DANCES.map((dance) => {
          const isActive = system.activeGait === 'DANCE' && system.activeDance === dance.id;
          return (
            <button
              key={dance.id}
              onClick={() => handleDanceTrigger(dance.id)}
              className={`glow-button flex flex-col items-start gap-1 p-3 text-left`}
              style={{ 
                height: 'auto', 
                borderWidth: '1px', 
                borderStyle: 'solid', 
                borderColor: isActive ? 'var(--neon-purple)' : 'var(--border-glass)',
                background: isActive ? 'rgba(157, 78, 221, 0.15)' : 'rgba(23, 28, 53, 0.4)'
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`font-bold text-xs ${isActive ? 'text-[#9d4edd]' : 'text-white'}`}>
                  {dance.name}
                </span>
                <Play className={`w-3 h-3 ${isActive ? 'text-[#9d4edd] fill-[#9d4edd]' : 'text-[#8e9bb4]'}`} />
              </div>
              <span className="text-[9px] text-[#8e9bb4] line-clamp-1">{dance.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
