import type { TelemetryFrame, LogEntry, ServoState } from '../types';

class TempService {
  private operatingMode: 'AUTO' | 'MANUAL' = 'AUTO';
  private audioSource: 'MIC' | 'BT' = 'MIC';
  private voiceActionMode: 'SPEAK_AND_ACT' | 'SPEAK_ONLY' = 'SPEAK_AND_ACT';
  private showAudioLogs: boolean = false;
  private manualLedPattern: string | null = null;
  private manualMood: string | null = null;
  private activeGait: TelemetryFrame['system']['activeGait'] = 'STAND';
  private activeDance: string = 'NONE';
  private plannedDance: string = 'DANCE_WAVE';
  private speedMultiplier = 1.0;
  private bodyHeight = -60.0;
  private batteryLevel = 8.2;
  private bodyRoll = 0.0;
  private robotReady = true;
  private lastVoiceCommand: TelemetryFrame['system']['lastVoiceCommand'] = {
    phrase: 'None',
    recognized_command: 'STAND',
    spoken_response: 'Ready',
    timestamp: Date.now(),
    action_executed: false,
    action_mode: 'SPEAK_AND_ACT',
  };

  private logs: LogEntry[] = [
    { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'TempService Initialized', source: 'DASHBOARD' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), level: 'success', message: 'Offline Simulator Mode active', source: 'DASHBOARD' }
  ];
  private logCallbacks: ((log: LogEntry) => void)[] = [];
  private telemetryCallbacks: ((frame: TelemetryFrame) => void)[] = [];
  private tickInterval: any = null;
  private frameCount = 0;

  // Servo names corresponding to 18 joints (6 legs: LF, LM, LR, RF, RM, RR; 3 joints per leg: Coxa, Femur, Tibia)
  private servos: ServoState[] = this.initializeServos();

  constructor() {
    this.startSimulation();
  }

  private initializeServos(): ServoState[] {
    const legs = ['LF', 'LM', 'LR', 'RF', 'RM', 'RR'];
    const joints = ['Coxa', 'Femur', 'Tibia'];
    const servos: ServoState[] = [];
    let id = 0;
    for (const leg of legs) {
      for (const joint of joints) {
        servos.push({
          id,
          name: `${leg}_${joint}`,
          angle: joint === 'Coxa' ? 90 : joint === 'Femur' ? 45 : 75,
          offset: 0,
          load: 10 + Math.random() * 15
        });
        id++;
      }
    }
    return servos;
  }

  private startSimulation() {
    this.tickInterval = setInterval(() => {
      this.frameCount++;
      const frame = this.generateFrame();
      this.telemetryCallbacks.forEach(cb => cb(frame));

      // Random logs occasionally
      if (Math.random() < 0.03) {
        this.generateRandomLog();
      }

      // Slowly drain battery
      if (this.frameCount % 100 === 0) {
        this.batteryLevel = Math.max(6.8, parseFloat((this.batteryLevel - 0.01).toFixed(2)));
        if (this.batteryLevel < 7.2) {
          this.addLog('warn', `Low battery alert: ${this.batteryLevel}V`, 'ESP32');
        }
      }
    }, 150); // ~7Hz update rate
  }

  public stopSimulation() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  }

  private generateFrame(): TelemetryFrame {
    const t = Date.now() / 1000;
    const isWalking = this.activeGait !== 'STAND' && this.activeGait !== 'RELAX' && this.activeGait !== 'NONE';

    // Simulate IMU
    const baseOscillation = isWalking ? Math.sin(t * 5 * this.speedMultiplier) * 8 : 0;
    const imu = {
      roll: parseFloat((baseOscillation + Math.sin(t * 0.5) * 1.5 + this.bodyRoll).toFixed(2)),
      pitch: parseFloat((baseOscillation * 0.5 + Math.cos(t * 0.5) * 1.0).toFixed(2)),
      yaw: parseFloat(((t * 2) % 360).toFixed(2)),
      ax: parseFloat((Math.sin(t * 5) * (isWalking ? 0.3 : 0.02)).toFixed(3)),
      ay: parseFloat((Math.cos(t * 5) * (isWalking ? 0.2 : 0.01)).toFixed(3)),
      az: parseFloat((9.81 + Math.sin(t * 10) * (isWalking ? 0.5 : 0.05)).toFixed(3)),
      gx: parseFloat((isWalking ? Math.sin(t * 5) * 15 : Math.random() * 0.5).toFixed(2)),
      gy: parseFloat((isWalking ? Math.cos(t * 5) * 10 : Math.random() * 0.5).toFixed(2)),
      gz: parseFloat((isWalking ? 5.0 : Math.random() * 0.2).toFixed(2))
    };

    // Simulate Ultrasonic distance sensors
    let dF = 120;
    let dB = 150;
    let dL = 80;
    let dR = 90;

    if (this.activeGait === 'WALK_FORWARD') {
      dF = Math.max(15, 120 - ((this.frameCount % 60) * 1.5));
      if (dF < 35 && this.frameCount % 20 === 0) {
        this.addLog('error', `Emergency Stop: Obstacle detected Front at ${dF.toFixed(0)}cm!`, 'ESP32');
      }
    } else if (this.activeGait === 'WALK_BACKWARD') {
      dB = Math.max(15, 150 - ((this.frameCount % 60) * 2.0));
    }

    const ultrasonic = {
      front: parseFloat(dF.toFixed(1)),
      back: parseFloat(dB.toFixed(1)),
      left: parseFloat((dL + Math.sin(t * 0.2) * 5).toFixed(1)),
      right: parseFloat((dR + Math.cos(t * 0.2) * 5).toFixed(1))
    };

    // Simulate Audio DSP (which is run on Pi)
    const isBeat = Math.sin(t * Math.PI * (128 / 60)) > 0.75;
    const audio = {
      bpm: 128,
      beatConfidence: 0.88,
      rmsEnergyDb: parseFloat((-28 + Math.sin(t * 2) * 8 + (isBeat ? 14 : 0)).toFixed(1)),
      peakAmplitude: parseFloat((0.45 + Math.sin(t * 3) * 0.3).toFixed(2)),
      bassRatio: parseFloat((0.42 + Math.sin(t) * 0.1).toFixed(2)),
      rhythmSpeed: 'MEDIUM' as const,
      energyLevel: 'MEDIUM' as const,
      activityLevel: 'BUSY' as const,
      classification: isBeat ? 'Electronic / Dance Beats' : 'Ambient Music',
      genre: 'Synthwave / Dance',
      audioContext: isBeat ? 'Upbeat Synthwave' : 'Ambient Room Sound',
      syllableCount: Math.floor(Math.abs(Math.sin(t * 0.3) * 6)),
      voiceActive: false,
      isBeatDetected: isBeat
    };

    // Update Servo load & simulated angles
    const updatedServos = this.servos.map(s => {
      let angleOffset = 0;
      if (isWalking) {
        const legIndex = Math.floor(s.id / 3);
        const phase = (legIndex % 2) * Math.PI;
        if (s.name.includes('Coxa')) {
          angleOffset = Math.sin(t * 5 * this.speedMultiplier + phase) * 20;
        } else if (s.name.includes('Femur')) {
          angleOffset = Math.sin(t * 5 * this.speedMultiplier + phase + Math.PI / 4) * 15;
        } else {
          angleOffset = Math.cos(t * 5 * this.speedMultiplier + phase) * 20;
        }
      }
      const baseAngle = s.name.includes('Coxa') ? 90 : s.name.includes('Femur') ? 45 : 75;
      return {
        ...s,
        angle: Math.round(baseAngle + angleOffset + s.offset),
        load: parseFloat((10 + (isWalking ? 25 : 5) + Math.sin(t * 5 + s.id) * 10 + Math.random() * 3).toFixed(1))
      };
    });

    return {
      timestamp: Date.now(),
      imu,
      ultrasonic,
      audio,
      system: {
        online: true,
        serialConnected: true,
        batteryLevel: this.batteryLevel,
        cpuTemp: parseFloat((42.5 + Math.sin(t * 0.05) * 2.0 + (isWalking ? 4.5 : 0)).toFixed(1)),
        wifiSsid: 'Hexapod-AP',
        wifiSignalDb: -52 + Math.round(Math.sin(t * 0.1) * 3),
        operatingMode: this.operatingMode,
        audioSource: this.audioSource,
        voiceActionMode: this.voiceActionMode,
        lastVoiceCommand: this.lastVoiceCommand,
        activeGait: this.activeGait,
        activeDance: this.activeDance,
        plannedDance: this.plannedDance,
        speedMultiplier: this.speedMultiplier,
        bodyHeight: this.bodyHeight,
        manualLedPattern: this.manualLedPattern,
        manualMood: this.manualMood,
        showAudioLogs: this.showAudioLogs,
        robotReady: this.robotReady,
        bodyRoll: this.bodyRoll,
      },
      servos: updatedServos
    };
  }

  private generateRandomLog() {
    const sources = ['ESP32', 'PI', 'DASHBOARD'] as const;
    const src = sources[Math.floor(Math.random() * sources.length)];
    let msg = '';
    let lvl: LogEntry['level'] = 'info';

    if (src === 'ESP32') {
      const msgs = [
        { l: 'info' as const, m: 'IMU MPU6050 calibration verified' },
        { l: 'info' as const, m: 'Tripod gait telemetry synchronized' },
        { l: 'warn' as const, m: 'Servo 4 temperature normal: 42C' }
      ];
      const selected = msgs[Math.floor(Math.random() * msgs.length)];
      msg = selected.m;
      lvl = selected.l;
    } else if (src === 'PI') {
      const msgs = [
        { l: 'info' as const, m: 'Audio DSP: 128 BPM detected with high confidence' },
        { l: 'success' as const, m: 'Choreography state machine: Dance dispatched' },
        { l: 'info' as const, m: 'LCD eye UI frame rendered @ 33Hz' }
      ];
      const selected = msgs[Math.floor(Math.random() * msgs.length)];
      msg = selected.m;
      lvl = selected.l;
    } else {
      const msgs = [
        { l: 'success' as const, m: 'Dashboard command stream active' },
        { l: 'info' as const, m: 'Ping to Hexapod-AP: 8ms' }
      ];
      const selected = msgs[Math.floor(Math.random() * msgs.length)];
      msg = selected.m;
      lvl = selected.l;
    }

    this.addLog(lvl, msg, src);
  }

  private addLog(level: LogEntry['level'], message: string, source: LogEntry['source']) {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 100) this.logs.pop();
    this.logCallbacks.forEach(cb => cb(newLog));
  }

  // APIs accessed by components
  public sendCommand(cmd: string) {
    this.addLog('info', `Command: "${cmd}"`, 'DASHBOARD');

    // Parse commands to change state
    if (cmd.startsWith('VOICE_MODE:')) {
      const vm = cmd.replace('VOICE_MODE:', '') as 'SPEAK_AND_ACT' | 'SPEAK_ONLY';
      this.voiceActionMode = vm;
      this.addLog('success', `Voice Execution Mode: ${vm}`, 'PI');
    } else if (cmd.startsWith('SIMULATE_VOICE:')) {
      const phrase = cmd.replace('SIMULATE_VOICE:', '').toLowerCase();
      let recognizedCmd = 'STAND';
      let spokenResp = 'Stopping';
      
      if (phrase.includes('dance') || phrase.includes('party')) {
        recognizedCmd = 'DANCE_CIRCLE';
        spokenResp = "Let's Dance!";
      } else if (phrase.includes('forward') || phrase.includes('fowrd') || phrase.includes('fwd')) {
        recognizedCmd = 'WALK_FORWARD';
        spokenResp = 'Walking forward';
      } else if (phrase.includes('backward') || phrase.includes('back')) {
        recognizedCmd = 'WALK_BACKWARD';
        spokenResp = 'Walking backward';
      } else if (phrase.includes('left')) {
        recognizedCmd = 'TURN_LEFT';
        spokenResp = 'Turning left';
      } else if (phrase.includes('right')) {
        recognizedCmd = 'TURN_RIGHT';
        spokenResp = 'Turning right';
      } else if (phrase.includes('stop') || phrase.includes('stand')) {
        recognizedCmd = 'STAND';
        spokenResp = 'Stopping';
      }

      const shouldAct = this.voiceActionMode === 'SPEAK_AND_ACT';
      this.lastVoiceCommand = {
        phrase,
        recognized_command: recognizedCmd,
        spoken_response: spokenResp,
        timestamp: Date.now(),
        action_executed: shouldAct,
        action_mode: this.voiceActionMode
      };

      this.addLog('success', `🔊 [TTS]: "${spokenResp}"`, 'PI');
      if (shouldAct) {
        if (recognizedCmd.startsWith('DANCE_')) {
          this.activeGait = 'DANCE';
          this.activeDance = recognizedCmd.replace('DANCE_', '');
        } else {
          this.activeGait = recognizedCmd as any;
          this.activeDance = 'NONE';
        }
        this.addLog('success', `🦾 [VOICE ACTION]: Executed ${recognizedCmd}`, 'ESP32');
      } else {
        this.addLog('info', `🔊 [VOICE VERIFICATION]: Action suppressed in Speak-Only mode`, 'PI');
      }
    } else if (cmd.startsWith('VOICE_TRIGGER:')) {
      const trigger = cmd.replace('VOICE_TRIGGER:', '');
      if (trigger === 'lets_dance') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Let's Dance!'", 'PI');
        if (this.voiceActionMode === 'SPEAK_AND_ACT') {
          this.activeGait = 'DANCE';
          this.activeDance = 'CIRCLE';
          this.manualMood = 'ENERGY';
        }
      } else if (trigger === 'voice_detected') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Voice Detected!'", 'PI');
        this.manualMood = 'VOICE_ACTIVE';
      } else if (trigger === 'activating_command') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Activating command!'", 'PI');
      } else if (trigger === 'party_mode') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Party mode engaged!'", 'PI');
        if (this.voiceActionMode === 'SPEAK_AND_ACT') {
          this.activeGait = 'DANCE';
          this.activeDance = 'ROLL_FAST';
        }
      } else if (trigger === 'stopping') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Stopping!'", 'PI');
        if (this.voiceActionMode === 'SPEAK_AND_ACT') {
          this.activeGait = 'STAND';
          this.activeDance = 'NONE';
        }
      } else if (trigger === 'walking_forward') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Walking forward!'", 'PI');
        if (this.voiceActionMode === 'SPEAK_AND_ACT') {
          this.activeGait = 'WALK_FORWARD';
        }
      } else if (trigger === 'walking_backward') {
        this.addLog('success', "🔊 [TTS SPEAKER]: 'Walking backward!'", 'PI');
        if (this.voiceActionMode === 'SPEAK_AND_ACT') {
          this.activeGait = 'WALK_BACKWARD';
        }
      }
    } else if (cmd.startsWith('SPEAK:')) {
      const phrase = cmd.replace('SPEAK:', '');
      this.addLog('success', `🔊 [TTS SPEAKER]: "${phrase}"`, 'PI');
    } else if (cmd.startsWith('MODE:')) {
      const m = cmd.split(':')[1].toUpperCase() as 'AUTO' | 'MANUAL';
      this.operatingMode = m;
      this.addLog('success', `Operating Mode switched to: ${m}`, 'PI');
    } else if (cmd.startsWith('AUDIO_SOURCE:')) {
      const s = cmd.split(':')[1].toUpperCase() as 'MIC' | 'BT';
      this.audioSource = s;
      this.addLog('success', `Audio source set to: ${s}`, 'PI');
    } else if (cmd === 'TOGGLE_LOGGING') {
      this.showAudioLogs = !this.showAudioLogs;
      this.addLog('info', `Background logging: ${this.showAudioLogs ? 'ON' : 'OFF'}`, 'PI');
    } else if (cmd.startsWith('LED:')) {
      const pattern = cmd.split(':')[1];
      if (pattern === 'AUTO') {
        this.manualLedPattern = null;
        this.addLog('success', 'LEDs returned to AUTO Mood Sync', 'PI');
      } else {
        this.manualLedPattern = pattern;
        this.addLog('success', `LED pattern overridden: ${pattern}`, 'PI');
      }
    } else if (cmd.startsWith('EMOTION:')) {
      const mood = cmd.split(':')[1];
      if (mood === 'AUTO') {
        this.manualMood = null;
        this.addLog('success', 'LCD Emotion returned to AUTO Mood Sync', 'PI');
      } else if (mood === 'TEST') {
        this.addLog('info', 'Running 7-step Emotion Test Cycle (2.5s each)...', 'PI');
        const emotions = ['IDLE', 'AGGRESSIVE', 'ENERGY', 'CHILL', 'VOICE_ACTIVE', 'HAPPY', 'CONFUSED'];
        emotions.forEach((e, idx) => {
          setTimeout(() => {
            this.manualMood = e;
            this.addLog('info', `Emotion cycle: ${e}`, 'PI');
          }, idx * 1500);
        });
        setTimeout(() => {
          this.manualMood = null;
          this.addLog('success', 'Emotion test cycle complete', 'PI');
        }, emotions.length * 1500);
      } else {
        this.manualMood = mood;
        this.addLog('success', `LCD Emotion set to: ${mood}`, 'PI');
      }
    } else if (cmd.startsWith('TEST_LEG_')) {
      const legNum = cmd.replace('TEST_LEG_', '');
      this.addLog('info', `Testing individual Leg ${legNum} actuation sequence...`, 'ESP32');
    } else if (cmd.startsWith('WALK_') || cmd === 'STAND' || cmd === 'RELAX' || cmd === 'TURN_LEFT' || cmd === 'TURN_RIGHT') {
      this.activeGait = cmd as TelemetryFrame['system']['activeGait'];
      this.activeDance = 'NONE';
      this.addLog('success', `Gait mode: ${cmd}`, 'ESP32');
    } else if (cmd.startsWith('DANCE_')) {
      this.activeGait = 'DANCE';
      this.activeDance = cmd.substring(6);
      this.addLog('success', `Dance routine: ${this.activeDance}`, 'ESP32');
    } else if (cmd.startsWith('BODY_HEIGHT:')) {
      const h = parseFloat(cmd.split(':')[1]);
      if (!isNaN(h)) {
        this.bodyHeight = h;
        this.addLog('info', `Set body height: ${h}mm`, 'ESP32');
      }
    } else if (cmd.startsWith('SPEED:')) {
      const s = parseFloat(cmd.split(':')[1]);
      if (!isNaN(s)) {
        this.speedMultiplier = s;
        this.addLog('info', `Set speed factor: ${s}x`, 'PI');
      }
    } else if (cmd.startsWith('SET ')) {
      const parts = cmd.split(' ');
      const ch = parseInt(parts[1]);
      const angle = parseInt(parts[2]);
      if (!isNaN(ch) && !isNaN(angle) && ch >= 0 && ch < this.servos.length) {
        this.servos[ch].angle = angle;
        this.addLog('info', `Override Servo ${ch} (${this.servos[ch].name}) to ${angle} deg`, 'ESP32');
      }
    } else if (cmd.startsWith('CALIBRATE ')) {
      const parts = cmd.split(' ');
      const ch = parseInt(parts[1]);
      const offset = parseInt(parts[2]);
      if (!isNaN(ch) && !isNaN(offset) && ch >= 0 && ch < this.servos.length) {
        this.servos[ch].offset = offset;
        this.addLog('success', `Calibrated Servo ${ch} offset: ${offset}`, 'ESP32');
      }
    }
  }

  public subscribeTelemetry(cb: (frame: TelemetryFrame) => void) {
    this.telemetryCallbacks.push(cb);
    return () => {
      this.telemetryCallbacks = this.telemetryCallbacks.filter(c => c !== cb);
    };
  }

  public subscribeLogs(cb: (log: LogEntry) => void) {
    this.logCallbacks.push(cb);
    return () => {
      this.logCallbacks = this.logCallbacks.filter(c => c !== cb);
    };
  }

  public getHistoryLogs(): LogEntry[] {
    return [...this.logs];
  }
}

export const tempService = new TempService();
