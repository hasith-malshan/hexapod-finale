import { useEffect, useState, useCallback, useRef } from 'react';
import type { TelemetryFrame, LogEntry } from '../types';
import { tempService } from '../utils/tempService';

export type ConnectionMode = 'SIMULATOR' | 'LIVE';

// Initial structure for loading state
const initialTelemetry: TelemetryFrame = {
  timestamp: Date.now(),
  imu: { roll: 0, pitch: 0, yaw: 0, ax: 0, ay: 0, az: 9.81, gx: 0, gy: 0, gz: 0 },
  ultrasonic: { front: 100, back: 100, left: 100, right: 100 },
  audio: {
    bpm: 0,
    beatConfidence: 0,
    rmsEnergyDb: -60,
    bassRatio: 0,
    rhythmSpeed: 'SLOW',
    energyLevel: 'LOW',
    activityLevel: 'SMOOTH',
    classification: 'Silence',
    isBeatDetected: false
  },
  system: {
    online: false,
    serialConnected: false,
    batteryLevel: 0,
    cpuTemp: 0,
    wifiSsid: 'None',
    wifiSignalDb: -100,
    activeGait: 'STAND',
    activeDance: 'NONE',
    speedMultiplier: 1.0,
    bodyHeight: -60.0
  },
  servos: []
};

export const useTelemetry = (mode: ConnectionMode, wsIp: string) => {
  const [telemetry, setTelemetry] = useState<TelemetryFrame>(initialTelemetry);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');
  const wsRef = useRef<WebSocket | null>(null);

  // Load log history
  useEffect(() => {
    if (mode === 'SIMULATOR') {
      setLogs(tempService.getHistoryLogs());
    } else {
      setLogs([{
        id: 'init',
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Attempting connection to live host...',
        source: 'DASHBOARD'
      }]);
    }
  }, [mode]);

  // Connect to correct service
  useEffect(() => {
    if (mode === 'SIMULATOR') {
      setConnectionStatus('CONNECTED');
      
      const unsubTelemetry = tempService.subscribeTelemetry((frame) => {
        setTelemetry(frame);
      });

      const unsubLogs = tempService.subscribeLogs((newLog) => {
        setLogs(prev => [newLog, ...prev].slice(0, 100));
      });

      return () => {
        unsubTelemetry();
        unsubLogs();
      };
    } else {
      setConnectionStatus('CONNECTING');
      let reconnectTimeout: any;

      const connect = () => {
        // Handle websocket connection
        const cleanIp = wsIp.replace('http://', '').replace('https://', '');
        const wsUrl = `ws://${cleanIp}/api/ws`;
        
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            setConnectionStatus('CONNECTED');
            addLocalLog('success', `Connected to Pi Server: ${wsUrl}`);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'telemetry') {
                setTelemetry(data.payload);
              } else if (data.type === 'log') {
                setLogs(prev => [data.payload, ...prev].slice(0, 100));
              }
            } catch (err) {
              console.error('Error parsing WS message:', err);
            }
          };

          ws.onerror = () => {
            setConnectionStatus('DISCONNECTED');
          };

          ws.onclose = () => {
            setConnectionStatus('DISCONNECTED');
            addLocalLog('warn', 'Connection closed. Reconnecting in 3s...');
            reconnectTimeout = setTimeout(connect, 3000);
          };
        } catch (error) {
          setConnectionStatus('DISCONNECTED');
          addLocalLog('error', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      connect();

      return () => {
        if (wsRef.current) {
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
        clearTimeout(reconnectTimeout);
      };
    }
  }, [mode, wsIp]);

  const addLocalLog = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source: 'DASHBOARD'
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const sendCommand = useCallback((cmd: string) => {
    if (mode === 'SIMULATOR') {
      tempService.sendCommand(cmd);
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'command', payload: cmd }));
        addLocalLog('info', `Sent command: "${cmd}"`);
      } else {
        addLocalLog('error', `Cannot send command "${cmd}": Socket disconnected.`);
      }
    }
  }, [mode]);

  return {
    telemetry,
    logs,
    connectionStatus,
    sendCommand
  };
};
