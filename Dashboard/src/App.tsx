import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import type { ConnectionMode } from './hooks/useTelemetry';
import { Header } from './components/common/Header';
import { LocomotionControl } from './components/controls/LocomotionControl';
import { PresetDances } from './components/controls/PresetDances';
import { HanthaneShowcase } from './components/controls/HanthaneShowcase';
import { LedControl } from './components/controls/LedControl';
import { EmotionControl } from './components/controls/EmotionControl';
import { LegDiagnostics } from './components/controls/LegDiagnostics';
import { ModeControl } from './components/controls/ModeControl';
import { AudioCommander } from './components/controls/AudioCommander';
import { Calibration } from './components/controls/Calibration';
import { RadarVisualizer } from './components/sensors/RadarVisualizer';
import { IMUVisualizer } from './components/sensors/IMUVisualizer';
import { AudioVisualizer } from './components/sensors/AudioVisualizer';
import { LogFeed } from './components/common/LogFeed';
import { GodModeCli } from './components/controls/GodModeCli';
import { Zap, Music, Sun, Cpu, Terminal, Volume2 } from 'lucide-react';

type TabSection = 'dashboard' | 'audio' | 'choreo' | 'lighting' | 'diagnostics' | 'terminal';

export const App: React.FC = () => {
  // Automatically detect host/port if accessed via browser on Pi
  const defaultHost = typeof window !== 'undefined' && window.location.host && !window.location.host.includes(':5173')
    ? window.location.host 
    : '10.42.0.1:8080';

  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    typeof window !== 'undefined' && window.location.port !== '5173' ? 'LIVE' : 'SIMULATOR'
  );
  const [wsIp, setWsIp] = useState<string>(defaultHost);
  const [activeTab, setActiveTab] = useState<TabSection>('dashboard');
  
  const { telemetry, logs, connectionStatus, sendCommand } = useTelemetry(connectionMode, wsIp);

  // Check if there is an active obstacle trigger in the ultrasonic ranges (<40cm)
  const isObstacleAlert = 
    telemetry.ultrasonic.front < 40 || 
    telemetry.ultrasonic.back < 40 || 
    telemetry.ultrasonic.left < 40 || 
    telemetry.ultrasonic.right < 40;

  return (
    <div className="main-content" style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* Global Dashboard Header */}
      <Header 
        telemetry={telemetry}
        connectionStatus={connectionStatus}
        mode={connectionMode}
        setMode={setConnectionMode}
        wsIp={wsIp}
        setWsIp={setWsIp}
        sendCommand={sendCommand}
      />

      {/* Navigation Tabs for Clean Organization */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`glow-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Zap className="w-4 h-4" /> Live Dashboard
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`glow-button ${activeTab === 'audio' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Volume2 className="w-4 h-4" /> Audio & Voice Triggers
        </button>
        <button
          onClick={() => setActiveTab('choreo')}
          className={`glow-button ${activeTab === 'choreo' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Music className="w-4 h-4" /> Choreography (24 Dances)
        </button>
        <button
          onClick={() => setActiveTab('lighting')}
          className={`glow-button ${activeTab === 'lighting' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Sun className="w-4 h-4" /> LEDs & LCD Eyes
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`glow-button ${activeTab === 'diagnostics' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Cpu className="w-4 h-4" /> Leg Diagnostics & Calibration
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`glow-button ${activeTab === 'terminal' ? 'active' : ''}`}
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <Terminal className="w-4 h-4" /> God-Mode CLI & Logs
        </button>
      </div>

      {/* TAB 1: LIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-5">
          {/* Row: Mode Controller */}
          <ModeControl 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />

          {/* Row: Audio Commander (Mic Verification & Voice Triggers) */}
          <AudioCommander 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />

          {/* Row 1: Core Navigation & Environmental Ranging */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <LocomotionControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
            
            <RadarVisualizer 
              data={telemetry.ultrasonic}
              isObstacleAlert={isObstacleAlert}
            />

            <IMUVisualizer 
              data={telemetry.imu}
            />
          </div>

          {/* Row 2: Hanthanata Payana Sanda Song Choreography Showcase */}
          <HanthaneShowcase 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />

          {/* Row 3: Audio DSP & Quick Dances */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <AudioVisualizer 
              data={telemetry.audio}
            />

            <PresetDances 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
          </div>

          {/* Row 4: Quick LED & Emotion Overrides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <LedControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
            <EmotionControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
          </div>

          {/* Row 5: Live Telemetry & ESP32 Log Screen */}
          <LogFeed logs={logs} clearLogs={() => sendCommand('CLEAR_LOGS')} />
        </div>
      )}

      {/* TAB 2: AUDIO LAB & VOICE TRIGGERS */}
      {activeTab === 'audio' && (
        <div className="flex flex-col gap-5">
          <AudioCommander 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <AudioVisualizer 
              data={telemetry.audio}
            />
            <ModeControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
          </div>
        </div>
      )}

      {/* TAB 3: CHOREOGRAPHY MATRIX & SONG SHOWCASE */}
      {activeTab === 'choreo' && (
        <div className="flex flex-col gap-5">
          <HanthaneShowcase 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />
          <PresetDances 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />
          <AudioVisualizer 
            data={telemetry.audio}
          />
        </div>
      )}

      {/* TAB 4: LIGHTING & LCD EYE EMOTIONS */}
      {activeTab === 'lighting' && (
        <div className="flex flex-col gap-5">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <LedControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
            <EmotionControl 
              telemetry={telemetry}
              sendCommand={sendCommand}
            />
          </div>
          <IMUVisualizer 
            data={telemetry.imu}
          />
        </div>
      )}

      {/* TAB 5: LEG DIAGNOSTICS & CALIBRATION */}
      {activeTab === 'diagnostics' && (
        <div className="flex flex-col gap-5">
          <LegDiagnostics 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />
          <Calibration 
            telemetry={telemetry}
            sendCommand={sendCommand}
          />
        </div>
      )}

      {/* TAB 6: GOD-MODE CLI & LOGS */}
      {activeTab === 'terminal' && (
        <div className="flex flex-col gap-5">
          <GodModeCli sendCommand={sendCommand} />
          <LogFeed logs={logs} />
        </div>
      )}
    </div>
  );
};

export default App;
