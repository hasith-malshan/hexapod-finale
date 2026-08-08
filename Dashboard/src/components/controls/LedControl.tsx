import React from 'react';
import type { TelemetryFrame, LedPattern } from '../../types';
import { Sparkles, Sun, RefreshCw, Palette } from 'lucide-react';

interface LedControlProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

interface LedDef {
  id: LedPattern;
  name: string;
  desc: string;
  gradient: string;
}

const LED_PATTERNS_LIST: LedDef[] = [
  { id: 'rainbow', name: 'Rainbow Cycle', desc: 'Continuous HSV spectrum wave', gradient: 'linear-gradient(90deg, #ff0055, #ffaa00, #00ff88, #00f2fe, #9d4edd)' },
  { id: 'confetti', name: 'Confetti Glitch', desc: 'Random flash sparkle bursts', gradient: 'linear-gradient(90deg, #ff3366, #33ffcc, #ffcc00)' },
  { id: 'sinelon', name: 'Sinelon Chase', desc: 'Sine-wave bouncing spotlight', gradient: 'linear-gradient(90deg, #00f2fe, #9d4edd)' },
  { id: 'bpm', name: 'BPM Pulse', desc: 'Audio tempo harmonic strobe', gradient: 'linear-gradient(90deg, #ff007f, #ffb703)' },
  { id: 'juggle', name: 'Juggle Balls', desc: 'Multi-point interleaved orbits', gradient: 'linear-gradient(90deg, #9d4edd, #00ff88, #ff3366)' },
  { id: 'fire', name: 'Thermal Fire', desc: 'Realistic heating flame simulation', gradient: 'linear-gradient(90deg, #330000, #ff3300, #ffcc00, #ffffff)' },
  { id: 'color_wipe', name: 'Color Wipe', desc: 'Sequential 4-color block shift', gradient: 'linear-gradient(90deg, #ff0000, #00ff00, #0000ff)' },
  { id: 'theater_chase', name: 'Theater Chase', desc: 'Marquee style marching LEDs', gradient: 'linear-gradient(90deg, #ffb703, #9d4edd)' },
  { id: 'comet', name: 'Comet Trail', desc: 'Decaying meteor head & tail', gradient: 'linear-gradient(90deg, #00f2fe, transparent)' },
  { id: 'dual_scanner', name: 'Dual Scanner', desc: 'Cylon style opposing beams', gradient: 'linear-gradient(90deg, #ff3366, #00f2fe)' },
  { id: 'breathing', name: 'Cyan Breathe', desc: 'Calm sinusoidal glow inhale', gradient: 'linear-gradient(90deg, #003344, #00f2fe)' },
  { id: 'sparkle_burst', name: 'Sparkle Burst', desc: 'High-energy white flashes', gradient: 'linear-gradient(90deg, #ffffff, #9d4edd)' },
  { id: 'strobe', name: 'Strobe Flash', desc: 'Fast optical freezing strobe', gradient: 'linear-gradient(90deg, #ffffff, #111122)' },
  { id: 'wave', name: 'RGB Wave', desc: 'Smooth sinusoidal color gradient', gradient: 'linear-gradient(90deg, #00ff88, #00f2fe, #ff3366)' },
  { id: 'alternating', name: 'Alternating Duo', desc: 'Red & cyan flip-flop matrix', gradient: 'linear-gradient(90deg, #ff3366, #00f2fe)' },
  { id: 'random_palette', name: 'Random Palette', desc: 'Procedural 4-color generation', gradient: 'linear-gradient(90deg, #ff007f, #00ff88, #ffb703, #00f2fe)' },
];

export const LedControl: React.FC<LedControlProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system } = telemetry;
  const currentPattern = system.manualLedPattern;

  const handleSetPattern = (patternId: string) => {
    sendCommand(`LED:${patternId}`);
  };

  const handleResetAuto = () => {
    sendCommand('LED:AUTO');
  };

  return (
    <div className="glass-card flex flex-col gap-3" style={{ height: '100%' }}>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Sun className="w-4 h-4 text-[#ffb703]" /> WS2811 LED Controller (16 Patterns)
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            7-Pixel RGB Neopixel strip real-time animation engine
          </p>
        </div>

        <button
          onClick={handleResetAuto}
          className={`glow-button ${!currentPattern ? 'active' : ''}`}
          style={{ padding: '6px 12px', fontSize: '11px' }}
        >
          <RefreshCw className="w-3 h-3" /> Auto Mood Sync {!currentPattern && '✓'}
        </button>
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#00f2fe]" />
          <span>Active Mode:</span>
          <strong className="text-[#00f2fe]">
            {currentPattern ? `MANUAL OVERRIDE (${currentPattern.toUpperCase()})` : 'AUTO (Music Reactive Sync)'}
          </strong>
        </div>
        <span className="text-[10px] text-[#8e9bb4]">GPIO 13 | 7x LEDs | WS2811 GRB</span>
      </div>

      <div 
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}
      >
        {LED_PATTERNS_LIST.map((pattern) => {
          const isActive = currentPattern === pattern.id;
          return (
            <button
              key={pattern.id}
              onClick={() => handleSetPattern(pattern.id)}
              className="glow-button flex flex-col items-start gap-1 p-2 text-left transition-all relative overflow-hidden"
              style={{
                height: 'auto',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isActive ? 'var(--neon-yellow)' : 'var(--border-glass)',
                background: isActive ? 'rgba(255, 183, 3, 0.15)' : 'rgba(23, 28, 53, 0.4)',
              }}
            >
              <div 
                className="w-full h-1.5 rounded-full mb-1" 
                style={{ background: pattern.gradient }}
              />
              <div className="flex justify-between items-center w-full">
                <span className={`font-bold text-[11px] truncate ${isActive ? 'text-[#ffb703]' : 'text-white'}`}>
                  {pattern.name}
                </span>
                {isActive && <Sparkles className="w-3 h-3 text-[#ffb703]" />}
              </div>
              <span className="text-[9px] text-[#8e9bb4] line-clamp-1">{pattern.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
