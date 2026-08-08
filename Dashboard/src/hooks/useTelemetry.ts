import { useEffect, useState, useCallback, useRef } from 'react';
import type { TelemetryFrame, LogEntry } from '../types';
import { tempService } from '../utils/tempService';

export type ConnectionMode = 'SIMULATOR' | 'LIVE';

const initialTelemetry: TelemetryFrame = {
  timestamp: Date.now(),
  imu: { roll: 0, pitch: 0, yaw: 0, ax: 0, ay: 0, az: 9.81, gx: 0, gy: 0, gz: 0 },
  ultrasonic: { front: 100, back: 100, left: 100, right: 100 },
  audio: {
    bpm: 0,
    beatConfidence: 0,
    rmsEnergyDb: -60,
    peakAmplitude: 0,
    bassRatio: 0,
    rhythmSpeed: 'SLOW',
    energyLevel: 'LOW',
    activityLevel: 'SMOOTH',
    classification: 'Listening...',
    genre: 'Listening...',
    audioContext: 'Listening...',
    syllableCount: 0,
    voiceActive: false,
    isBeatDetected: false,
  },
  system: {
    online: false,
    serialConnected: false,
    batteryLevel: 0,
    cpuTemp: 0,
    wifiSsid: 'None',
    wifiSignalDb: -100,
    operatingMode: 'AUTO',
    audioSource: 'MIC',
    activeGait: 'STAND',
    activeDance: 'NONE',
    speedMultiplier: 1.0,
    bodyHeight: -60.0,
    manualLedPattern: null,
    manualMood: null,
    showAudioLogs: false,
    robotReady: false,
    bodyRoll: 0,
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
        message: `Connecting to ${wsIp}...`,
        source: 'DASHBOARD'
      }]);
    }
  }, [mode, wsIp]);

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
        const cleanIp = wsIp.replace('http://', '').replace('https://', '').replace('ws://', '').replace('wss://', '');
        const wsUrl = `ws://${cleanIp}/api/ws`;
        
        try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            setConnectionStatus('CONNECTED');
            addLocalLog('success', `WebSocket connected: ${wsUrl}`);
          };

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'telemetry') {
                const raw = msg.data || msg.payload;
                if (raw) {
                  setTelemetry(prev => {
                    const isBeat = typeof raw.bpm === 'number' && raw.bpm > 0;
                    return {
                      ...prev,
                      timestamp: Date.now(),
                      imu: {
                        ...prev.imu,
                        roll: typeof raw.tilt === 'number' ? raw.tilt : prev.imu.roll,
                      },
                      audio: {
                        ...prev.audio,
                        bpm: typeof raw.bpm === 'number' ? raw.bpm : prev.audio.bpm,
                        energyLevel: raw.energy || prev.audio.energyLevel,
                        activityLevel: raw.activity || prev.audio.activityLevel,
                        rhythmSpeed: raw.rhythm_speed || prev.audio.rhythmSpeed,
                        classification: raw.context || prev.audio.classification,
                        audioContext: raw.context || prev.audio.audioContext,
                        genre: raw.genre || prev.audio.genre,
                        rmsEnergyDb: typeof raw.rms_db === 'number' ? raw.rms_db : prev.audio.rmsEnergyDb,
                        peakAmplitude: typeof raw.peak_amplitude === 'number' ? raw.peak_amplitude : prev.audio.peakAmplitude,
                        syllableCount: typeof raw.syllable_count === 'number' ? raw.syllable_count : prev.audio.syllableCount,
                        voiceActive: typeof raw.voice_active === 'boolean' ? raw.voice_active : prev.audio.voiceActive,
                        isBeatDetected: isBeat,
                      },
                      system: {
                        ...prev.system,
                        online: true,
                        serialConnected: true,
                        operatingMode: (raw.mode === 'MANUAL' ? 'MANUAL' : 'AUTO'),
                        audioSource: (raw.audio_source === 'BT' ? 'BT' : 'MIC'),
                        activeDance: raw.current_move || prev.system.activeDance,
                        plannedDance: raw.planned_move || prev.system.plannedDance,
                        manualLedPattern: raw.manual_led_pattern,
                        manualMood: raw.manual_mood || raw.mood,
                        showAudioLogs: raw.show_audio_logs,
                        robotReady: raw.robot_ready,
                        bodyRoll: raw.tilt,
                      }
                    };
                  });
                }
              } else if (msg.type === 'log') {
                const payload = msg.payload || msg.data;
                if (payload) {
                  setLogs(prev => [payload, ...prev].slice(0, 100));
                }
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
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source: 'DASHBOARD'
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const sendCommand = useCallback(async (cmd: string) => {
    if (mode === 'SIMULATOR') {
      tempService.sendCommand(cmd);
      return;
    }

    // First try WebSocket
    let sentViaWs = false;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'command', action: cmd }));
        sentViaWs = true;
        addLocalLog('info', `WS: "${cmd}"`);
      } catch (e) {
        sentViaWs = false;
      }
    }

    // Also send via REST API for fallback / special endpoints
    const cleanIp = wsIp.replace('http://', '').replace('https://', '').replace('ws://', '').replace('wss://', '');
    const baseUrl = `http://${cleanIp}/api`;

    try {
      if (cmd.startsWith('MODE:')) {
        const m = cmd.split(':')[1];
        await fetch(`${baseUrl}/mode?mode=${m}`, { method: 'POST' });
      } else if (cmd.startsWith('LED:')) {
        const pattern = cmd.split(':')[1];
        if (pattern === 'AUTO') {
          await fetch(`${baseUrl}/led/auto`, { method: 'POST' });
        } else {
          await fetch(`${baseUrl}/led?pattern=${pattern}`, { method: 'POST' });
        }
      } else if (cmd.startsWith('EMOTION:')) {
        const emotion = cmd.split(':')[1];
        if (emotion === 'AUTO') {
          await fetch(`${baseUrl}/emotion/auto`, { method: 'POST' });
        } else if (emotion === 'TEST') {
          await fetch(`${baseUrl}/emotion/test`, { method: 'POST' });
        } else {
          await fetch(`${baseUrl}/emotion?mood=${emotion}`, { method: 'POST' });
        }
      } else if (cmd.startsWith('AUDIO_SOURCE:')) {
        const src = cmd.split(':')[1];
        await fetch(`${baseUrl}/audio/source?source=${src}`, { method: 'POST' });
      } else if (cmd === 'TOGGLE_LOGGING') {
        await fetch(`${baseUrl}/logging/toggle`, { method: 'POST' });
      } else if (cmd.startsWith('VOLUME:')) {
        const pct = cmd.replace('VOLUME:', '');
        await fetch(`${baseUrl}/audio/volume?percent=${pct}`, { method: 'POST' });
        addLocalLog('success', `Volume set to: ${pct}%`);
      } else if (cmd === 'VOLUME_MAX') {
        await fetch(`${baseUrl}/audio/volume/max`, { method: 'POST' });
        addLocalLog('success', `Speaker volume boosted to 100% MAX!`);
      } else if (cmd.startsWith('VOICE_TRIGGER:')) {
        const trigger = cmd.replace('VOICE_TRIGGER:', '');
        await fetch(`${baseUrl}/audio/trigger?action=${encodeURIComponent(trigger)}`, { method: 'POST' });
        addLocalLog('info', `Triggered Voice: "${trigger}"`);
      } else if (cmd.startsWith('SPEAK:')) {
        const phrase = cmd.replace('SPEAK:', '');
        await fetch(`${baseUrl}/audio/speak?phrase=${encodeURIComponent(phrase)}`, { method: 'POST' });
        addLocalLog('info', `Speak on Pi: "${phrase}"`);
      } else if (!sentViaWs) {
        await fetch(`${baseUrl}/command?cmd=${encodeURIComponent(cmd)}`, { method: 'POST' });
        addLocalLog('info', `REST: "${cmd}"`);
      }
    } catch (err) {
      if (!sentViaWs) {
        addLocalLog('error', `Command failed: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }
  }, [mode, wsIp]);

  return {
    telemetry,
    logs,
    connectionStatus,
    sendCommand
  };
};
