import React from 'react';
import { Terminal, ShieldAlert, Activity, Navigation, Music } from 'lucide-react';

interface GodModeCliProps {
  sendCommand: (cmd: string) => void;
}

const COMMAND_CATEGORIES = [
  {
    title: 'Locomotion',
    icon: <Navigation className="w-4 h-4 text-blue-400" />,
    commands: [
      { id: 'WALK_FORWARD', label: 'Walk Forward' },
      { id: 'WALK_BACKWARD', label: 'Walk Backward' },
      { id: 'TURN_LEFT', label: 'Turn Left' },
      { id: 'TURN_RIGHT', label: 'Turn Right' },
      { id: 'STAND', label: 'Stand / Stop' }
    ]
  },
  {
    title: 'Core Dances',
    icon: <Music className="w-4 h-4 text-purple-400" />,
    commands: [
      { id: 'DANCE_WAVE', label: 'Wave' },
      { id: 'DANCE_RIPPLE', label: 'Ripple' },
      { id: 'DANCE_PEACOCK', label: 'Peacock' },
      { id: 'DANCE_SALSA', label: 'Salsa' },
      { id: 'DANCE_TWIST', label: 'Twist' },
      { id: 'DANCE_CIRCLE', label: 'Circle' },
      { id: 'DANCE_CRAWL', label: 'Crawl' },
      { id: 'DANCE_HEADBANG', label: 'Headbang' },
      { id: 'DANCE_GALLOP', label: 'Gallop' },
      { id: 'DANCE_ROLL_FAST', label: 'Fast Roll' },
      { id: 'DANCE_STROBE', label: 'Strobe' },
      { id: 'DANCE_PULSE', label: 'Pulse' }
    ]
  },
  {
    title: 'Experimental Dances',
    icon: <Activity className="w-4 h-4 text-pink-400" />,
    commands: [
      { id: 'DANCE_BEG_WAVE', label: 'Humanoid Beg & Wave' },
      { id: 'DANCE_CHASSIS_BREATHE', label: 'Sine Wave Breathe' },
      { id: 'DANCE_BELLY_CRAWL', label: 'Low-Rider Crawl' },
      { id: 'DANCE_PITCH_PIVOT', label: 'Pitch & Pivot Sway' },
      { id: 'DANCE_TWITCH', label: 'High-Freq Twitch' },
      { id: 'DANCE_WORM', label: 'Brownian Worm' }
    ]
  },
  {
    title: 'Diagnostics & Safety',
    icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
    commands: [
      { id: 'TEST_LEG_0', label: 'Test Leg 0 (FL)' },
      { id: 'TEST_LEG_1', label: 'Test Leg 1 (ML)' },
      { id: 'TEST_LEG_2', label: 'Test Leg 2 (BL)' },
      { id: 'TEST_LEG_3', label: 'Test Leg 3 (FR)' },
      { id: 'TEST_LEG_4', label: 'Test Leg 4 (MR)' },
      { id: 'TEST_LEG_5', label: 'Test Leg 5 (BR)' },
      { id: 'RELAX', label: 'RELAX SERVOS (Safety)' }
    ]
  }
];

export const GodModeCli: React.FC<GodModeCliProps> = ({ sendCommand }) => {
  return (
    <div className="glass-card flex flex-col gap-4">
      <div>
        <h3 className="title-glow flex items-center gap-2 text-red-400">
          <Terminal className="w-5 h-5 text-red-400" /> GOD MODE CLI
        </h3>
        <p className="subtitle">Execute manual backend commands directly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COMMAND_CATEGORIES.map((cat, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-gray-300 border-b border-white/10 pb-1 mb-1">
              {cat.icon} {cat.title}
            </div>
            <div className="flex flex-col gap-2">
              {cat.commands.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => sendCommand(cmd.id)}
                  className="bg-black/30 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-200 text-left px-3 py-2 rounded text-xs text-gray-400 hover:text-white flex justify-between items-center group"
                >
                  <span>{cmd.label}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-[9px] text-red-400/70 font-mono font-bold tracking-wider">
                    {cmd.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
