import React from 'react';
import type { TelemetryFrame } from '../../types';
import { Sliders, Mic, Headphones, FileText, Bot, Volume2 } from 'lucide-react';

interface ModeControlProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

export const ModeControl: React.FC<ModeControlProps> = ({
  telemetry,
  sendCommand,
}) => {
  const { system, audio } = telemetry;

  const handleModeToggle = (newMode: 'AUTO' | 'MANUAL') => {
    sendCommand(`MODE:${newMode}`);
  };

  const handleSourceToggle = (newSource: 'MIC' | 'BT') => {
    sendCommand(`AUDIO_SOURCE:${newSource}`);
  };

  const handleToggleLogging = () => {
    sendCommand('TOGGLE_LOGGING');
  };

  // Compute VU meter bar from RMS dB (-60 dB to 0 dB)
  const rmsDb = audio.rmsEnergyDb || -60;
  const vuPercent = Math.min(100, Math.max(0, ((rmsDb + 60) / 60) * 100));

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
          <Sliders className="w-4 h-4 text-[#00f2fe]" /> Master Mode & Audio Engine
        </h3>
        <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
          Autonomous AI dance engine vs. God-Mode manual CLI execution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Operating Mode Card */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#8e9bb4] font-bold uppercase tracking-wider">
                Operating Mode
              </span>
              <Bot className="w-4 h-4 text-[#00f2fe]" />
            </div>
            <div className="text-sm font-bold text-white">
              {system.operatingMode === 'AUTO' ? 'Autonomous AI' : 'Manual SSH / UI'}
            </div>
            <p className="text-[10px] text-[#8e9bb4] mt-1 line-clamp-2">
              {system.operatingMode === 'AUTO' 
                ? 'DSP beat & onset analysis auto-selects moves' 
                : 'Full direct servo & choreo control enabled'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleModeToggle('AUTO')}
              className={`glow-button flex-1 ${system.operatingMode === 'AUTO' ? 'active' : ''}`}
              style={{ padding: '6px 8px', fontSize: '10px' }}
            >
              AUTO
            </button>
            <button
              onClick={() => handleModeToggle('MANUAL')}
              className={`glow-button flex-1 ${system.operatingMode === 'MANUAL' ? 'active' : ''}`}
              style={{ padding: '6px 8px', fontSize: '10px' }}
            >
              MANUAL
            </button>
          </div>
        </div>

        {/* Audio Source Card */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#8e9bb4] font-bold uppercase tracking-wider">
                Audio Input Source
              </span>
              {system.audioSource === 'MIC' ? (
                <Mic className="w-4 h-4 text-[#00ff88]" />
              ) : (
                <Headphones className="w-4 h-4 text-[#9d4edd]" />
              )}
            </div>
            <div className="text-sm font-bold text-white">
              {system.audioSource === 'MIC' ? 'Physical Mic' : 'Bluetooth Loopback'}
            </div>
            <p className="text-[10px] text-[#8e9bb4] mt-1 line-clamp-2">
              {system.audioSource === 'MIC' 
                ? 'ALSA SoundCard 16kHz microphone stream' 
                : 'PipeWire / PulseAudio internal loopback'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSourceToggle('MIC')}
              className={`glow-button flex-1 ${system.audioSource === 'MIC' ? 'active' : ''}`}
              style={{ padding: '6px 8px', fontSize: '10px' }}
            >
              MIC
            </button>
            <button
              onClick={() => handleSourceToggle('BT')}
              className={`glow-button flex-1 ${system.audioSource === 'BT' ? 'active' : ''}`}
              style={{ padding: '6px 8px', fontSize: '10px' }}
            >
              BT LOOP
            </button>
          </div>
        </div>

        {/* File Telemetry Logging Card */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#8e9bb4] font-bold uppercase tracking-wider">
                Hexabot File Log (CLI 91)
              </span>
              <FileText className="w-4 h-4 text-[#ffb703]" />
            </div>
            <div className="text-sm font-bold text-white">
              {system.showAudioLogs ? 'File Logging ON' : 'File Logging OFF'}
            </div>
            <p className="text-[10px] text-[#8e9bb4] mt-1 line-clamp-2">
              Appends live DSP events and speech telemetry to hexabot.log
            </p>
          </div>

          <button
            onClick={handleToggleLogging}
            className={`glow-button ${system.showAudioLogs ? 'active' : ''}`}
            style={{ width: '100%', padding: '6px 8px', fontSize: '10px' }}
          >
            {system.showAudioLogs ? 'Logging: ACTIVE (Writing)' : 'Enable File Logging'}
          </button>
        </div>
      </div>

      {/* Live Mic Snapshot & VU Meter */}
      <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span className="font-bold text-white text-[11px]">Live Mic Stream & Syllables (CLI 92-93)</span>
          </div>
          <span className="font-mono text-[10px] text-[#00f2fe]">
            {audio.rmsEnergyDb.toFixed(1)} dB | Peak: {(audio.peakAmplitude || 0).toFixed(2)} | Syl: {audio.syllableCount || 0}/3s
          </span>
        </div>

        {/* Dynamic VU Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex items-center p-0.5">
          <div 
            className="h-full rounded-full transition-all duration-100"
            style={{ 
              width: `${vuPercent}%`,
              background: vuPercent > 80 
                ? 'linear-gradient(90deg, #00ff88, #ffb703, #ff3366)' 
                : vuPercent > 50 
                ? 'linear-gradient(90deg, #00ff88, #ffb703)' 
                : 'var(--neon-green)'
            }}
          />
        </div>
      </div>
    </div>
  );
};
