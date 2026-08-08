import React, { useEffect, useState } from 'react';
import type { IMUData } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

interface IMUVisualizerProps {
  data: IMUData;
}

export const IMUVisualizer: React.FC<IMUVisualizerProps> = ({ data }) => {
  const [history, setHistory] = useState<{ time: string; roll: number; pitch: number }[]>([]);

  // Collect history
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory((prev) => {
      const next = [...prev, { time: timeStr, roll: data.roll, pitch: data.pitch }];
      if (next.length > 20) {
        return next.slice(1);
      }
      return next;
    });
  }, [data]);

  return (
    <div className="glass-card flex flex-col gap-4" style={{ height: '100%' }}>
      <div>
        <h3 className="title-glow flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00f2fe]" /> Gyroscope & Attitude
        </h3>
        <p className="subtitle">Real-time orientation and linear acceleration vector logs</p>
      </div>

      <div className="grid-cols-2" style={{ gap: '15px', flex: 1 }}>
        {/* Left: 3D Attitude Indicator */}
        <div className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/5 rounded-xl gap-3">
          <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider">Attitude Indicator (Gyro)</span>
          
          <div 
            style={{ 
              perspective: '300px',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Hexapod 3D mockup */}
            <div 
              style={{
                width: '70px',
                height: '70px',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                border: '3px solid var(--neon-cyan)',
                boxShadow: 'var(--glow-cyan), inset 0 0 10px rgba(0,242,254,0.3)',
                borderRadius: '16px',
                transform: `rotateX(${data.pitch}deg) rotateY(${data.roll}deg)`,
                transition: 'transform 0.1s ease-out',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '11px',
                textShadow: '0 0 5px var(--neon-cyan)'
              }}
            >
              HEXAPOD
              
              {/* Front orientation indicator */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'var(--neon-magenta)',
                  borderRadius: '50%',
                  boxShadow: 'var(--glow-magenta)'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
            <div className="bg-black/30 p-1.5 rounded">
              <div className="text-[9px] text-[#8e9bb4]">ROLL</div>
              <div className="font-bold text-white">{data.roll.toFixed(1)}°</div>
            </div>
            <div className="bg-black/30 p-1.5 rounded">
              <div className="text-[9px] text-[#8e9bb4]">PITCH</div>
              <div className="font-bold text-white">{data.pitch.toFixed(1)}°</div>
            </div>
            <div className="bg-black/30 p-1.5 rounded">
              <div className="text-[9px] text-[#8e9bb4]">YAW</div>
              <div className="font-bold text-white">{data.yaw.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        {/* Right: Attitude Chart */}
        <div className="flex flex-col bg-white/5 border border-white/5 rounded-xl p-3" style={{ height: '210px' }}>
          <span className="text-[10px] text-[#8e9bb4] font-semibold uppercase tracking-wider mb-2">Pitch & Roll History</span>
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRoll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPitch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--neon-magenta)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--neon-magenta)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[-45, 45]} tick={{ fill: '#8e9bb4', fontSize: '9px' }} />
                <Tooltip 
                  contentStyle={{ background: '#0e1122', borderColor: 'var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="roll" stroke="var(--neon-cyan)" fillOpacity={1} fill="url(#colorRoll)" strokeWidth={2} name="Roll" />
                <Area type="monotone" dataKey="pitch" stroke="var(--neon-magenta)" fillOpacity={1} fill="url(#colorPitch)" strokeWidth={2} name="Pitch" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
