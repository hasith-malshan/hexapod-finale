import React from 'react';
import type { TelemetryFrame, EmotionMood } from '../../types';
import { Eye, PlayCircle, RefreshCw, Smile } from 'lucide-react';

interface EmotionControlProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

interface EmotionDef {
  id: EmotionMood;
  name: string;
  colorName: string;
  colorHex: string;
  desc: string;
}

const EMOTIONS_LIST: EmotionDef[] = [
  { id: 'IDLE', name: 'Normal / Idle', colorName: 'Cyan', colorHex: '#00f2fe', desc: 'Neutral calm glowing eyes with natural blinking' },
  { id: 'AGGRESSIVE', name: 'Aggressive', colorName: 'Red', colorHex: '#ff3366', desc: 'Angered intense gaze for high-energy music' },
  { id: 'ENERGY', name: 'Energy / Hyped', colorName: 'Orange', colorHex: '#ffb703', desc: 'Wide hyped expression matching fast tempos' },
  { id: 'CHILL', name: 'Chill / Relaxed', colorName: 'Purple', colorHex: '#9d4edd', desc: 'Sleepy relaxed posture for ambient music' },
  { id: 'VOICE_ACTIVE', name: 'Voice Listening', colorName: 'Green', colorHex: '#00ff88', desc: 'Speech recognition active & processing' },
  { id: 'HAPPY', name: 'Happy / Excited', colorName: 'Yellow', colorHex: '#ffd166', desc: 'Upbeat excited smiling eye curvature' },
  { id: 'CONFUSED', name: 'Confused / Asymmetric', colorName: 'Pink', colorHex: '#ff70a6', desc: 'Asymmetric winking / quizzical tilt eyes' },
];

export const EmotionControl: React.FC<EmotionControlProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system, audio } = telemetry;

  const handleSetEmotion = (mood: string) => {
    sendCommand(`EMOTION:${mood}`);
  };

  const handleResetAuto = () => {
    sendCommand('EMOTION:AUTO');
  };

  const handleRunTestCycle = () => {
    sendCommand('EMOTION:TEST');
  };

  return (
    <div className="glass-card flex flex-col gap-3" style={{ height: '100%' }}>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Eye className="w-4 h-4 text-[#00f2fe]" /> ILI9341 LCD Screen Eye Emotions
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            320x240 TFT SPI display expressive face & music/beat-reactive eye engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTestCycle}
            className="glow-button"
            style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--neon-cyan)' }}
          >
            <PlayCircle className="w-3 h-3 text-[#00f2fe]" /> Test Cycle (2.5s)
          </button>
          <button
            onClick={handleResetAuto}
            className={`glow-button ${!system.manualMood ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            <RefreshCw className="w-3 h-3" /> Auto Sync {!system.manualMood && '✓'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Smile className="w-4 h-4 text-[#00ff88]" />
          <span>Active Display State:</span>
          <strong className="text-[#00ff88]">
            {system.manualMood 
              ? `MANUAL OVERRIDE: ${system.manualMood}`
              : `AUTO: ${audio.energyLevel === 'HIGH' ? 'ENERGY/AGGRESSIVE' : 'IDLE/CHILL'}`}
          </strong>
        </div>
        <span className="text-[10px] text-[#00ff88]">Music Beat Sync Active | 33Hz SPI</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EMOTIONS_LIST.map((emo) => {
          const isActive = system.manualMood === emo.id;
          return (
            <button
              key={emo.id}
              onClick={() => handleSetEmotion(emo.id)}
              className="glow-button flex flex-col items-start gap-1 p-2.5 text-left transition-all"
              style={{
                height: 'auto',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isActive ? emo.colorHex : 'var(--border-glass)',
                background: isActive ? `${emo.colorHex}22` : 'rgba(23, 28, 53, 0.4)',
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: emo.colorHex, boxShadow: `0 0 8px ${emo.colorHex}` }}
                />
                <span className="font-bold text-[11px] text-white truncate">{emo.name}</span>
              </div>
              <span className="text-[9px] text-[#8e9bb4] line-clamp-1">{emo.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
