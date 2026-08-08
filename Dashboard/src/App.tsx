import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import type { ConnectionMode } from './hooks/useTelemetry';
import { Header } from './components/common/Header';
import { LocomotionControl } from './components/controls/LocomotionControl';
import { PresetDances } from './components/controls/PresetDances';
import { Calibration } from './components/controls/Calibration';
import { RadarVisualizer } from './components/sensors/RadarVisualizer';
import { IMUVisualizer } from './components/sensors/IMUVisualizer';
import { AudioVisualizer } from './components/sensors/AudioVisualizer';
import { LogFeed } from './components/common/LogFeed';
import { GodModeCli } from './components/controls/GodModeCli';

export const App: React.FC = () => {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('SIMULATOR');
  const [wsIp, setWsIp] = useState<string>('localhost:8000');
  
  const { telemetry, logs, connectionStatus, sendCommand } = useTelemetry(connectionMode, wsIp);

  // Check if there is an active obstacle trigger in the ultrasonic ranges (<40cm)
  const isObstacleAlert = 
    telemetry.ultrasonic.front < 40 || 
    telemetry.ultrasonic.back < 40 || 
    telemetry.ultrasonic.left < 40 || 
    telemetry.ultrasonic.right < 40;

  return (
    <div className="main-content">
      {/* Global Dashboard Header */}
      <Header 
        telemetry={telemetry}
        connectionStatus={connectionStatus}
        mode={connectionMode}
        setMode={setConnectionMode}
        wsIp={wsIp}
        setWsIp={setWsIp}
      />

      {/* Grid Row 1: Core Navigation & Environmental Ranging */}
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

      {/* Grid Row 2: Diagnostics & Custom Choreographies */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <AudioVisualizer 
          data={telemetry.audio}
        />

        <PresetDances 
          telemetry={telemetry}
          sendCommand={sendCommand}
        />
      </div>

      {/* Grid Row 3: Advanced Calibration matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <Calibration 
          telemetry={telemetry}
          sendCommand={sendCommand}
        />
      </div>

      {/* Grid Row 4: System terminal log output */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <LogFeed 
          logs={logs}
        />
      </div>

      {/* Grid Row 5: God Mode CLI Terminal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '10px' }}>
        <GodModeCli sendCommand={sendCommand} />
      </div>
    </div>
  );
};

export default App;
