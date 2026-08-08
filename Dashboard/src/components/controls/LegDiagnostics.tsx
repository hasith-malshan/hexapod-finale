import React, { useState } from 'react';
import type { TelemetryFrame } from '../../types';
import { Activity, Cpu, CheckCircle2, Play } from 'lucide-react';

interface LegDiagnosticsProps {
  telemetry: TelemetryFrame;
  sendCommand: (cmd: string) => void;
}

interface LegDef {
  index: number;
  label: string;
  name: string;
  position: 'Front Left' | 'Mid Left' | 'Back Left' | 'Front Right' | 'Mid Right' | 'Back Right';
  servos: string[];
}

const HEXAPOD_LEGS: LegDef[] = [
  { index: 0, label: 'LEG 0', name: 'Front-Left (LF)', position: 'Front Left', servos: ['LF_Coxa', 'LF_Femur', 'LF_Tibia'] },
  { index: 1, label: 'LEG 1', name: 'Mid-Left (LM)', position: 'Mid Left', servos: ['LM_Coxa', 'LM_Femur', 'LM_Tibia'] },
  { index: 2, label: 'LEG 2', name: 'Back-Left (LR)', position: 'Back Left', servos: ['LR_Coxa', 'LR_Femur', 'LR_Tibia'] },
  { index: 3, label: 'LEG 3', name: 'Front-Right (RF)', position: 'Front Right', servos: ['RF_Coxa', 'RF_Femur', 'RF_Tibia'] },
  { index: 4, label: 'LEG 4', name: 'Mid-Right (RM)', position: 'Mid Right', servos: ['RM_Coxa', 'RM_Femur', 'RM_Tibia'] },
  { index: 5, label: 'LEG 5', name: 'Back-Right (RR)', position: 'Back Right', servos: ['RR_Coxa', 'RR_Femur', 'RR_Tibia'] },
];

export const LegDiagnostics: React.FC<LegDiagnosticsProps> = ({
  sendCommand,
}) => {
  const [testingLeg, setTestingLeg] = useState<number | null>(null);

  const handleTestLeg = (legIndex: number) => {
    setTestingLeg(legIndex);
    sendCommand(`TEST_LEG_${legIndex}`);
    setTimeout(() => {
      setTestingLeg(null);
    }, 2000);
  };

  const handleTestAllSequentially = () => {
    HEXAPOD_LEGS.forEach((leg, i) => {
      setTimeout(() => {
        handleTestLeg(leg.index);
      }, i * 1500);
    });
  };

  return (
    <div className="glass-card flex flex-col gap-3" style={{ height: '100%' }}>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="title-glow flex items-center gap-2" style={{ margin: 0 }}>
            <Cpu className="w-4 h-4 text-[#00ff88]" /> Individual Leg Diagnostics (CLI 70-75)
          </h3>
          <p className="subtitle" style={{ fontSize: '11px', margin: 0 }}>
            Isolate and actuate individual tripod leg kinematics & servos
          </p>
        </div>

        <button
          onClick={handleTestAllSequentially}
          className="glow-button"
          style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--neon-green)' }}
        >
          <Play className="w-3 h-3 text-[#00ff88]" /> Test All 6 Legs Sequentially
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {HEXAPOD_LEGS.map((leg) => {
          const isCurrent = testingLeg === leg.index;
          return (
            <div
              key={leg.index}
              className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all hover:border-[#00ff88]/40"
              style={{
                borderColor: isCurrent ? 'var(--neon-green)' : undefined,
                background: isCurrent ? 'rgba(0, 255, 136, 0.15)' : undefined,
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-[#00ff88] uppercase tracking-wider">
                    {leg.label}
                  </span>
                  <div className="font-bold text-xs text-white">{leg.name}</div>
                  <span className="text-[10px] text-[#8e9bb4]">{leg.position}</span>
                </div>
                {isCurrent ? (
                  <Activity className="w-4 h-4 text-[#00ff88] animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#8e9bb4]" />
                )}
              </div>

              <div className="flex flex-wrap gap-1 text-[9px] text-[#8e9bb4]">
                {leg.servos.map((s) => (
                  <span key={s} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
                    {s.split('_')[1]}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleTestLeg(leg.index)}
                className={`glow-button ${isCurrent ? 'active' : ''}`}
                style={{ width: '100%', padding: '6px 10px', fontSize: '10px', marginTop: '4px' }}
              >
                {isCurrent ? 'Actuating Leg...' : `Actuate Leg ${leg.index}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
