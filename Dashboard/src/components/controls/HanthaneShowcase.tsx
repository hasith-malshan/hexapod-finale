import React, { useState, useEffect, useRef } from 'react';
import type { TelemetryFrame } from '../../types';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Music2, 
  Sparkles, 
  Clock, 
  FastForward,
  Activity,
  Layers
} from 'lucide-react';

interface HanthaneShowcaseProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

interface ChoreoKeyframe {
  time: number;
  move: string;
  section: string;
  note: string;
}

const CHOREOGRAPHY_DATA: ChoreoKeyframe[] = [
  // Intro (0:00 – 0:20)
  { time: 0.0,   move: "DANCE_CHASSIS_BREATHE", section: "Intro",    note: "Wake up — gentle sway on C" },
  { time: 6.5,   move: "DANCE_WAVE",            section: "Intro",    note: "Gentle ripple on F" },
  { time: 6.8,   move: "DANCE_CHASSIS_BREATHE", section: "Intro",    note: "Rest, breathe on G" },
  { time: 14.5,  move: "DANCE_PEACOCK",         section: "Intro",    note: "Proud slow display on Am→G" },

  // Chorus 1 (0:20 – 0:52)
  { time: 21.5,  move: "DANCE_ROLL_SLOW",       section: "Chorus 1", note: "Moonlight ripple — C" },
  { time: 28.5,  move: "DANCE_CHASSIS_BREATHE", section: "Chorus 1", note: "Gentle roll on G" },
  { time: 36.0,  move: "DANCE_PEACOCK",         section: "Chorus 1", note: "Full display — G" },
  { time: 43.0,  move: "DANCE_ROLL_SLOW",       section: "Chorus 1", note: "Ripple through — G7" },
  { time: 45.5,  move: "DANCE_CHASSIS_BREATHE", section: "Chorus 1", note: "Breathe out — C resolve" },
  { time: 49.5,  move: "DANCE_PITCH_PIVOT",     section: "Chorus 1", note: "Lean and return — G7" },
  { time: 51.0,  move: "DANCE_ROLL_SLOW",       section: "Chorus 1", note: "Moonlight ripple — C" },

  // Verse 1 (0:52 – 1:30)
  { time: 53.0,  move: "DANCE_TWIST",           section: "Verse 1",  note: "Anduru lala — C, light twist" },
  { time: 61.0,  move: "DANCE_PITCH_PIVOT",     section: "Verse 1",  note: "Sarasawi bima — Am, ripple 2" },
  { time: 67.0,  move: "DANCE_ROLL_SLOW",       section: "Verse 1",  note: "Themenna — F→C, gentle wave" },
  { time: 74.0,  move: "DANCE_TWIST",           section: "Verse 1",  note: "Repeat — C" },
  { time: 82.0,  move: "DANCE_ROLL_SLOW",       section: "Verse 1",  note: "Em again — light spin" },

  // Inter / Bridge (1:30 – 1:50)
  { time: 89.0,  move: "DANCE_CHASSIS_BREATHE", section: "Bridge",   note: "Wake up — gentle sway on C" },
  { time: 95.5,  move: "DANCE_WAVE",            section: "Bridge",   note: "Gentle ripple on F" },
  { time: 95.8,  move: "DANCE_CHASSIS_BREATHE", section: "Bridge",   note: "Rest, breathe on G" },
  { time: 103.5, move: "DANCE_PEACOCK",         section: "Bridge",   note: "Proud slow display on Am→G" },

  // Chorus 2 (1:50 – 2:22)
  { time: 109.0, move: "DANCE_ROLL_SLOW",       section: "Chorus 2", note: "Moonlight ripple — C" },
  { time: 110.5, move: "DANCE_CHASSIS_BREATHE", section: "Chorus 2", note: "Gentle roll on G" },
  { time: 118.0, move: "DANCE_PEACOCK",         section: "Chorus 2", note: "Full display — G" },
  { time: 125.0, move: "DANCE_ROLL_SLOW",       section: "Chorus 2", note: "Ripple through — G7" },
  { time: 127.5, move: "DANCE_CHASSIS_BREATHE", section: "Chorus 2", note: "Breathe out — C resolve" },
  { time: 131.5, move: "DANCE_PITCH_PIVOT",     section: "Chorus 2", note: "Lean and return — G7" },
  { time: 133.0, move: "DANCE_ROLL_SLOW",       section: "Chorus 2", note: "Moonlight ripple — C" },

  // Verse 2 (2:22 – 3:00)
  { time: 142.0, move: "DANCE_TWIST",           section: "Verse 2",  note: "Latha madulu — C" },
  { time: 145.5, move: "DANCE_CIRCLE",          section: "Verse 2",  note: "Atha wanawi — Em, circle" },
  { time: 149.0, move: "DANCE_RIPPLE_2",        section: "Verse 2",  note: "Epa ahaka — Am" },
  { time: 152.5, move: "DANCE_WAVE",            section: "Verse 2",  note: "Balanna — F→C" },
  { time: 156.5, move: "DANCE_TWIST",           section: "Verse 2",  note: "Repeat — C" },
  { time: 160.0, move: "DANCE_CIRCLE",          section: "Verse 2",  note: "Em" },
  { time: 163.5, move: "DANCE_PITCH_PIVOT",     section: "Verse 2",  note: "Maa geana — G, emotional sway" },
  { time: 167.5, move: "DANCE_HEADBANG",        section: "Verse 2",  note: "Mathakaya guli — G7, nodding" },
  { time: 171.5, move: "DANCE_PEACOCK",         section: "Verse 2",  note: "Maha weal — C, grand display" },
  { time: 175.5, move: "DANCE_SALSA",           section: "Verse 2",  note: "Iyata — G, rising" },
  { time: 179.5, move: "DANCE_RIPPLE",          section: "Verse 2",  note: "Damanna — C, flowing resolve" },

  // Outro (3:00 – end)
  { time: 183.0, move: "DANCE_CHASSIS_BREATHE", section: "Outro",    note: "Settle — C" },
  { time: 187.0, move: "DANCE_WAVE",            section: "Outro",    note: "Farewell wave — Am" },
  { time: 191.0, move: "DANCE_BEG_WAVE",        section: "Outro",    note: "Last moonlit beg — F" },
  { time: 196.0, move: "DANCE_PEACOCK",         section: "Outro",    note: "Final open display — G7→C" },
  { time: 201.0, move: "DANCE_CHASSIS_BREATHE", section: "Outro",    note: "Breathe and rest" },
  { time: 208.0, move: "STAND",                 section: "Outro",    note: "Song ends — stand still" },
];

const SONG_SECTIONS = [
  { label: "Intro", time: 0.0, color: "#00f2fe" },
  { label: "Chorus 1", time: 21.5, color: "#9d4edd" },
  { label: "Verse 1", time: 53.0, color: "#00ff88" },
  { label: "Bridge", time: 89.0, color: "#ffb703" },
  { label: "Chorus 2", time: 109.0, color: "#9d4edd" },
  { label: "Verse 2", time: 142.0, color: "#ff70a6" },
  { label: "Outro", time: 183.0, color: "#00f2fe" },
];

const TOTAL_SONG_DURATION = 208.0;

export const HanthaneShowcase: React.FC<HanthaneShowcaseProps> = ({
  sendCommand,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(TOTAL_SONG_DURATION);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeKeyframe, setActiveKeyframe] = useState<ChoreoKeyframe>(CHOREOGRAPHY_DATA[0]);
  const [nextKeyframe, setNextKeyframe] = useState<ChoreoKeyframe | null>(CHOREOGRAPHY_DATA[1]);

  // Audio source setup
  const audioSrc = "/audio/hanthanata.mp3";

  // Track keyframe based on time
  useEffect(() => {
    let current = CHOREOGRAPHY_DATA[0];
    let next: ChoreoKeyframe | null = null;

    for (let i = 0; i < CHOREOGRAPHY_DATA.length; i++) {
      if (currentTime >= CHOREOGRAPHY_DATA[i].time) {
        current = CHOREOGRAPHY_DATA[i];
        next = i + 1 < CHOREOGRAPHY_DATA.length ? CHOREOGRAPHY_DATA[i + 1] : null;
      } else {
        if (!next) next = CHOREOGRAPHY_DATA[i];
        break;
      }
    }

    setActiveKeyframe(current);
    setNextKeyframe(next);
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handlePlayToggle = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      sendCommand('HANTHANE_STOP');
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        sendCommand(`HANTHANE_START:${audioRef.current?.currentTime || 0}`);
      }).catch((e) => {
        console.warn("Audio play error:", e);
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    sendCommand('HANTHANE_STOP');
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (isPlaying) {
        sendCommand(`HANTHANE_START:${time}`);
      }
    }
  };

  const handleJumpToSection = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          sendCommand(`HANTHANE_START:${time}`);
        });
      } else {
        sendCommand(`HANTHANE_START:${time}`);
      }
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
    if (v > 0 && isMuted) setIsMuted(false);
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const timeRemainingToNext = nextKeyframe ? Math.max(0, nextKeyframe.time - currentTime) : 0;
  const progressPercent = Math.min(100, (currentTime / (duration || TOTAL_SONG_DURATION)) * 100);

  return (
    <div 
      className="glass-card flex flex-col gap-4 relative overflow-hidden" 
      style={{
        border: '1px solid rgba(157, 78, 221, 0.4)',
        background: 'linear-gradient(135deg, rgba(23, 28, 53, 0.95) 0%, rgba(35, 20, 60, 0.95) 100%)',
        boxShadow: '0 0 25px rgba(157, 78, 221, 0.2)'
      }}
    >
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleStop}
        preload="auto"
      />

      {/* Header with Title & Badges */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div 
            className="p-2.5 rounded-xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.4), rgba(0, 242, 254, 0.3))',
              border: '1px solid rgba(157, 78, 221, 0.5)'
            }}
          >
            <Music2 className={`w-6 h-6 text-[#00f2fe] ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="title-glow text-base md:text-lg" style={{ margin: 0 }}>
                හන්තානට පායන සඳ (Hanthanata Payana Sanda)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#9d4edd]/30 text-[#9d4edd] border border-[#9d4edd]/40">
                152 BPM • C Major
              </span>
            </div>
            <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
              Official Hexapod Synchronized Choreography Showcase • Artist: Amarasiri Peiris
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
          <Activity className={`w-4 h-4 ${isPlaying ? 'text-[#00ff88] animate-pulse' : 'text-[#8e9bb4]'}`} />
          <span className="font-semibold text-white">
            {isPlaying ? 'CHOREOGRAPHY LIVE' : 'SHOWCASE READY'}
          </span>
        </div>
      </div>

      {/* Hero Choreography Live Stage Display */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-white/10"
        style={{ background: 'rgba(10, 15, 35, 0.6)' }}
      >
        {/* Section info */}
        <div className="flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#8e9bb4]">Current Song Section</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Layers className="w-4 h-4 text-[#00f2fe]" />
            <span className="text-base font-bold text-white">{activeKeyframe.section}</span>
          </div>
          <span className="text-[11px] text-[#00f2fe]/80 mt-1 italic line-clamp-1">{activeKeyframe.note}</span>
        </div>

        {/* Active move */}
        <div 
          className="flex flex-col justify-center p-2.5 rounded-lg border text-center"
          style={{ 
            background: isPlaying ? 'rgba(157, 78, 221, 0.25)' : 'rgba(255, 255, 255, 0.03)',
            borderColor: isPlaying ? 'var(--neon-purple)' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: isPlaying ? '0 0 15px rgba(157, 78, 221, 0.3)' : 'none'
          }}
        >
          <span className="text-[10px] uppercase tracking-wider text-[#8e9bb4] flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-[#9d4edd]" /> Executing Move
          </span>
          <span className="text-sm md:text-base font-black text-white tracking-wide mt-0.5">
            {isPlaying ? activeKeyframe.move : 'STAND (Standby)'}
          </span>
        </div>

        {/* Next move countdown */}
        <div className="flex flex-col justify-center text-right md:text-right">
          <span className="text-[10px] uppercase tracking-wider text-[#8e9bb4]">Next Choreography Beat</span>
          <span className="text-xs font-bold text-[#ffb703] mt-0.5 truncate">
            {nextKeyframe ? nextKeyframe.move : 'Song Resolve'}
          </span>
          <span className="text-[11px] text-[#8e9bb4] mt-1 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3 text-[#ffb703]" />
            {nextKeyframe ? `in ${timeRemainingToNext.toFixed(1)}s` : 'Ending'}
          </span>
        </div>
      </div>

      {/* Interactive Progress & Timeline Scrubber */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#00f2fe] font-bold">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-[#8e9bb4]">
            <span>Beat interval: 0.395s</span>
            <span>•</span>
            <span>No-Abort Kinematic Blend</span>
          </div>
          <span className="text-[#8e9bb4]">{formatTime(duration)}</span>
        </div>

        {/* Custom Progress Bar */}
        <div 
          className="relative w-full h-3 rounded-full cursor-pointer overflow-hidden border border-white/10"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            handleSeek(pos * duration);
          }}
        >
          <div 
            className="h-full transition-all duration-100"
            style={{ 
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #00f2fe 0%, #9d4edd 70%, #ff3366 100%)',
              boxShadow: '0 0 10px rgba(0, 242, 254, 0.6)'
            }}
          />
        </div>
      </div>

      {/* Quick Section Jump Landmarks */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] text-[#8e9bb4] flex items-center gap-1 flex-shrink-0 mr-1">
          <FastForward className="w-3 h-3 text-[#00f2fe]" /> Jump To:
        </span>
        {SONG_SECTIONS.map((sec) => {
          const isCurrentSection = activeKeyframe.section.toLowerCase().includes(sec.label.toLowerCase());
          return (
            <button
              key={sec.label}
              onClick={() => handleJumpToSection(sec.time)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
              style={{
                border: '1px solid',
                borderColor: isCurrentSection ? sec.color : 'rgba(255, 255, 255, 0.1)',
                background: isCurrentSection ? `${sec.color}33` : 'rgba(255, 255, 255, 0.05)',
                color: isCurrentSection ? '#ffffff' : '#8e9bb4',
                boxShadow: isCurrentSection ? `0 0 8px ${sec.color}66` : 'none'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sec.color }} />
              {sec.label} ({formatTime(sec.time)})
            </button>
          );
        })}
      </div>

      {/* Master Audio & Showcase Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          {/* Play / Pause Main Trigger */}
          <button
            onClick={handlePlayToggle}
            className="glow-button flex items-center gap-2 px-5 py-2 text-xs font-bold"
            style={{
              background: isPlaying 
                ? 'linear-gradient(135deg, rgba(255, 51, 102, 0.4), rgba(157, 78, 221, 0.4))'
                : 'linear-gradient(135deg, rgba(0, 242, 254, 0.4), rgba(157, 78, 221, 0.4))',
              borderColor: isPlaying ? 'var(--neon-pink)' : 'var(--neon-cyan)',
              color: '#ffffff',
              boxShadow: isPlaying ? '0 0 15px rgba(255, 51, 102, 0.4)' : '0 0 15px rgba(0, 242, 254, 0.4)'
            }}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" /> Pause Showcase
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Start Demonstration
              </>
            )}
          </button>

          {/* Stop / Reset */}
          <button
            onClick={handleStop}
            className="glow-button flex items-center gap-1.5 px-3 py-2 text-xs text-[#8e9bb4] hover:text-white"
          >
            <Square className="w-3.5 h-3.5" /> Stop & Reset
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
          <button onClick={handleMuteToggle} className="text-[#8e9bb4] hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-[#ff3366]" /> : <Volume2 className="w-4 h-4 text-[#00f2fe]" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 accent-[#00f2fe] h-1.5 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-[#8e9bb4] w-7 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
