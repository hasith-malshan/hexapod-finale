import React, { useEffect, useState } from 'react';
import type { AudioDSPData } from '../../types';
import { Music, Radio, Mic } from 'lucide-react';

interface AudioVisualizerProps {
  data: AudioDSPData;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ data }) => {
  const [pulse, setPulse] = useState(false);
  const [simulatedBars, setSimulatedBars] = useState<number[]>(new Array(18).fill(0));

  // Pulse effect on beat detection
  useEffect(() => {
    if (data.isBeatDetected) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 200);
      return () => clearTimeout(t);
    }
  }, [data.isBeatDetected]);

  // Audio spectrum simulation based on RMS level
  useEffect(() => {
    const active = data.rmsEnergyDb > -50;
    const interval = setInterval(() => {
      setSimulatedBars(prev => prev.map(() => {
        if (!active) return Math.random() * 5;
        const multiplier = (data.rmsEnergyDb + 60) / 40; // Normalize between 0 and ~1.5
        const rand = Math.random() * 25 + 5;
        const isBeatBonus = data.isBeatDetected ? 30 : 0;
        return Math.min(60, Math.max(5, rand * multiplier + isBeatBonus));
      }));
    }, 80);

    return () => clearInterval(interval);
  }, [data.rmsEnergyDb, data.isBeatDetected]);

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#ff007f]" /> Music & Audio DSP
        </h3>
        <p className="subtitle">DSP analysis of system ambient audio loopback</p>
      </div>

      <div className="grid-cols-2" style={{ gap: '15px', flex: 1 }}>
        {/* Left Side: Beat info */}
        <div className="flex flex-col justify-between bg-white/5 border border-white/5 p-4 rounded-xl gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider">Beat Tracking</span>
            <span className={`status-badge ${data.isBeatDetected ? 'online' : 'offline'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
              {data.isBeatDetected ? 'BEAT' : 'SILENT'}
            </span>
          </div>

          {/* Glowing beat sphere */}
          <div className="flex items-center justify-center py-4">
            <div 
              className={`rounded-full flex items-center justify-center transition-all duration-100 ${pulse ? 'beat-active' : ''}`}
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-magenta))',
                boxShadow: data.isBeatDetected 
                  ? '0 0 25px var(--neon-magenta), 0 0 50px rgba(255, 0, 127, 0.4)' 
                  : '0 0 10px rgba(157, 78, 221, 0.2)',
                transform: pulse ? 'scale(1.15)' : 'scale(1.0)'
              }}
            >
              <Music className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-black/35 p-1.5 rounded">
              <div className="text-[9px] text-[#8e9bb4]">TEMPO</div>
              <div className="font-bold text-[#ff007f]" style={{ fontFamily: 'var(--font-display)' }}>
                {data.bpm > 0 ? `${data.bpm} BPM` : '0 BPM'}
              </div>
            </div>
            <div className="bg-black/35 p-1.5 rounded">
              <div className="text-[9px] text-[#8e9bb4]">ENERGY</div>
              <div className="font-bold text-white">{data.rmsEnergyDb.toFixed(1)} dB</div>
            </div>
          </div>
        </div>

        {/* Right Side: Classifier & DSP States */}
        <div className="flex flex-col bg-white/5 border border-white/5 rounded-xl p-4 justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider">Classification</span>
            <div className="flex items-center gap-2 bg-black/35 p-2.5 rounded-lg border border-white/5 text-xs">
              <Radio className="w-4 h-4 text-[#ff007f] animate-pulse" />
              <div className="font-bold text-white truncate">{data.classification}</div>
            </div>
          </div>

          {/* Rhythmic Matrix */}
          <div className="flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-[#8e9bb4]">Rhythm Speed:</span>
              <span className="font-bold text-[#ffb703]">{data.rhythmSpeed}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-[#8e9bb4]">Energy Level:</span>
              <span className="font-bold text-[#00f2fe]">{data.energyLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8e9bb4]">Activity Level:</span>
              <span className="font-bold text-[#00ff88]">{data.activityLevel}</span>
            </div>
          </div>

          {/* Audio Bars Simulation */}
          <div className="audio-bar-container">
            {simulatedBars.map((h, i) => (
              <div 
                key={i} 
                className="audio-bar" 
                style={{ 
                  height: `${h}px`,
                  backgroundColor: data.isBeatDetected ? 'var(--neon-magenta)' : undefined
                }} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
