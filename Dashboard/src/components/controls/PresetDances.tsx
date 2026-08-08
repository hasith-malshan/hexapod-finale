import React, { useState } from 'react';
import type { TelemetryFrame } from '../../types';
import { Music, Disc, Play } from 'lucide-react';

interface PresetDancesProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

interface DanceDef {
  id: string;
  name: string;
  desc: string;
  category: 'Rhythm' | 'Energy' | 'Acrobatic' | 'Special';
  speed: 'Slow' | 'Med' | 'Fast';
}

const ALL_24_DANCES: DanceDef[] = [
  // Rhythm Dances
  { id: 'WAVE', name: 'Leg Wave', desc: 'Legs wave sequentially around chassis', category: 'Rhythm', speed: 'Slow' },
  { id: 'RIPPLE', name: 'Ripple Walk', desc: 'Smooth tripod ripple gait shift', category: 'Rhythm', speed: 'Med' },
  { id: 'RIPPLE_2', name: 'Ripple Phase 2', desc: 'Dual-phase cascading leg wave', category: 'Rhythm', speed: 'Med' },
  { id: 'SALSA', name: 'Salsa Step', desc: 'Syncopated lateral rhythm sway', category: 'Rhythm', speed: 'Fast' },
  { id: 'TWIST', name: 'Body Twist', desc: 'Yaw-axis body torsion rotation', category: 'Rhythm', speed: 'Med' },
  { id: 'TWIST_2', name: 'Twist Dynamic', desc: 'Dual-speed accelerated yaw torsion', category: 'Rhythm', speed: 'Fast' },

  // Energy Dances
  { id: 'ROLL', name: 'Gyroscopic Roll', desc: 'Roll-axis posture oscillation', category: 'Energy', speed: 'Med' },
  { id: 'ROLL_2', name: 'Roll Stance', desc: 'Alternating pitch-roll combo sway', category: 'Energy', speed: 'Med' },
  { id: 'ROLL_FAST', name: 'Fast Roll', desc: 'High-frequency roll oscillation', category: 'Energy', speed: 'Fast' },
  { id: 'ROLL_SLOW', name: 'Slow Roll', desc: 'Gentle rhythmic roll breathing', category: 'Energy', speed: 'Slow' },
  { id: 'CIRCLE', name: 'Orbit Circle', desc: 'Horizontal circular chassis drag', category: 'Energy', speed: 'Med' },
  { id: 'CIRCLE_2', name: 'Orbit Phase 2', desc: 'Wide-radius circular rotation', category: 'Energy', speed: 'Fast' },
  { id: 'HEADBANG', name: 'Headbang', desc: 'Pitch-axis vertical bounce on beat', category: 'Energy', speed: 'Fast' },
  { id: 'GALLOP', name: 'Gallop Jump', desc: 'Double-leg lunging gait bounce', category: 'Energy', speed: 'Fast' },

  // Acrobatic & Expressive
  { id: 'PEACOCK', name: 'Peacock Pose', desc: 'Raised rear legs display posture', category: 'Acrobatic', speed: 'Slow' },
  { id: 'CRAWL', name: 'Low Crawl', desc: 'Sprawled low posture floor glide', category: 'Acrobatic', speed: 'Slow' },
  { id: 'BEG_WAVE', name: 'Beg & Wave', desc: 'Humanoid front-leg begging wave', category: 'Acrobatic', speed: 'Slow' },
  { id: 'CHASSIS_BREATHE', name: 'Sine Breathe', desc: 'Smooth sine wave vertical rise & fall', category: 'Acrobatic', speed: 'Slow' },
  { id: 'BELLY_CRAWL', name: 'Belly Crawl', desc: 'Ultra-low belly-to-ground slide', category: 'Acrobatic', speed: 'Slow' },
  { id: 'PITCH_PIVOT', name: 'Pitch Pivot', desc: 'Alternating front-to-back tilt', category: 'Acrobatic', speed: 'Med' },

  // High Frequency & Special
  { id: 'STROBE', name: 'Strobe Beat', desc: 'Staccato twitching matched to strobe', category: 'Special', speed: 'Fast' },
  { id: 'PULSE', name: 'Height Pulse', desc: 'Sharp vertical chassis pulse drops', category: 'Special', speed: 'Fast' },
  { id: 'TWITCH', name: 'Twitch Shiver', desc: 'High-frequency jitter & shudder', category: 'Special', speed: 'Fast' },
  { id: 'WORM', name: 'Worm Wave', desc: 'Brownian undulating body ripple', category: 'Special', speed: 'Med' },
];

export const PresetDances: React.FC<PresetDancesProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system } = telemetry;
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDances = ALL_24_DANCES.filter(dance => {
    const matchesCategory = selectedCategory === 'ALL' || dance.category === selectedCategory;
    const matchesSearch = dance.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dance.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dance.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDanceTrigger = (danceId: string) => {
    sendCommand(`DANCE_${danceId}`);
  };

  const getSpeedBadge = (speed: DanceDef['speed']) => {
    switch(speed) {
      case 'Fast': return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ff3366]/20 text-[#ff3366] font-bold">FAST</span>;
      case 'Med': return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffb703]/20 text-[#ffb703] font-bold">MED</span>;
      case 'Slow': return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] font-bold">SLOW</span>;
    }
  };

  return (
    <div className="glass-card flex flex-col gap-3" style={{ height: '100%' }}>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Music className="w-4 h-4 text-[#9d4edd]" /> Choreography Matrix (24 Dances)
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Inverse-kinematics music choreographies with auto beat-sync
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs">
          <Disc className={`w-4 h-4 text-[#9d4edd] ${system.activeGait === 'DANCE' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          <div className="text-[11px]">
            {system.activeGait === 'DANCE' ? (
              <span className="font-bold text-[#9d4edd]">{system.activeDance}</span>
            ) : (
              <span className="text-[#8e9bb4]">Standby / Ready</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
          {['ALL', 'Rhythm', 'Energy', 'Acrobatic', 'Special'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                selectedCategory === cat 
                  ? 'bg-[#9d4edd] text-white shadow-sm' 
                  : 'text-[#8e9bb4] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter dances..."
          className="glow-input text-xs"
          style={{ width: '130px', padding: '4px 8px', fontSize: '11px' }}
        />
      </div>

      {/* Dances grid */}
      <div 
        className="grid grid-cols-2 md:grid-cols-3 gap-2" 
        style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}
      >
        {filteredDances.map((dance) => {
          const isActive = system.activeGait === 'DANCE' && system.activeDance === dance.id;
          return (
            <button
              key={dance.id}
              onClick={() => handleDanceTrigger(dance.id)}
              className="glow-button flex flex-col items-start gap-1 p-2.5 text-left transition-all relative overflow-hidden"
              style={{ 
                height: 'auto', 
                borderWidth: '1px', 
                borderStyle: 'solid', 
                borderColor: isActive ? 'var(--neon-purple)' : 'var(--border-glass)',
                background: isActive ? 'rgba(157, 78, 221, 0.2)' : 'rgba(23, 28, 53, 0.4)'
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`font-bold text-[11px] truncate ${isActive ? 'text-[#9d4edd]' : 'text-white'}`}>
                  {dance.name}
                </span>
                <Play className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-[#9d4edd] fill-[#9d4edd]' : 'text-[#8e9bb4]'}`} />
              </div>
              <span className="text-[9px] text-[#8e9bb4] line-clamp-1">{dance.desc}</span>
              <div className="flex items-center justify-between w-full mt-1">
                <span className="text-[8px] text-[#8e9bb4] uppercase tracking-wider">{dance.id}</span>
                {getSpeedBadge(dance.speed)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
