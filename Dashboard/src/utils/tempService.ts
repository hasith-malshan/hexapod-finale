import type { TelemetryFrame, LogEntry, ServoState } from '../types';

class TempService {
  private activeGait: TelemetryFrame['system']['activeGait'] = 'STAND';
  private activeDance: string = 'NONE';
  private speedMultiplier = 1.0;
  private bodyHeight = -60.0;
  private batteryLevel = 8.2;
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
      roll: parseFloat((baseOscillation + Math.sin(t * 0.5) * 1.5).toFixed(2)),
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
    const isBeat = Math.sin(t * Math.PI * (120 / 60)) > 0.8; // 120 BPM beat simulation
    const audio = {
      bpm: 124,
      beatConfidence: 0.82,
      rmsEnergyDb: parseFloat((-25 + Math.sin(t * 2) * 8 + (isBeat ? 15 : 0)).toFixed(1)),
      bassRatio: parseFloat((0.35 + Math.sin(t) * 0.1).toFixed(2)),
      rhythmSpeed: 'MEDIUM' as const,
      energyLevel: 'MEDIUM' as const,
      activityLevel: 'MODERATE' as const,
      classification: isBeat && Math.random() > 0.7 ? 'Dance/Electronic Music' : 'Ambient Noise',
      isBeatDetected: isBeat
    };

    // Update Servo load & simulated angles
    const updatedServos = this.servos.map(s => {
      let angleOffset = 0;
      if (isWalking) {
        // Simple leg phase shift based on index to simulate tripod gait
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
        wifiSsid: 'Hexapod_Lab_Net',
        wifiSignalDb: -58 + Math.round(Math.sin(t * 0.1) * 4),
        activeGait: this.activeGait,
        activeDance: this.activeDance,
        speedMultiplier: this.speedMultiplier,
        bodyHeight: this.bodyHeight
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
        { l: 'info' as const, m: 'IMU MPU6050 calibration offset verified' },
        { l: 'info' as const, m: 'Tripod gait parameters synchronized' },
        { l: 'warn' as const, m: 'Servo 5 temperature warming: 45C' }
      ];
      const selected = msgs[Math.floor(Math.random() * msgs.length)];
      msg = selected.m;
      lvl = selected.l;
    } else if (src === 'PI') {
      const msgs = [
        { l: 'info' as const, m: 'YAMNet Classification update: Rock/Pop detected' },
        { l: 'success' as const, m: 'Data sync successfully uploaded to local SQLite logs' },
        { l: 'info' as const, m: 'LCD Display driver refresh cycle' }
      ];
      const selected = msgs[Math.floor(Math.random() * msgs.length)];
      msg = selected.m;
      lvl = selected.l;
    } else {
      const msgs = [
        { l: 'success' as const, m: 'Configuration presets successfully cached locally' },
        { l: 'info' as const, m: 'Ping to central host: 12ms' }
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
    this.addLog('info', `Sent command: "${cmd}"`, 'DASHBOARD');

    // Parse commands to change state
    if (cmd.startsWith('WALK_') || cmd === 'STAND' || cmd === 'RELAX') {
      this.activeGait = cmd as TelemetryFrame['system']['activeGait'];
      this.activeDance = 'NONE';
      this.addLog('success', `Movement Mode changed to: ${cmd}`, 'ESP32');
    } else if (cmd.startsWith('DANCE_')) {
      this.activeGait = 'DANCE';
      this.activeDance = cmd.substring(6);
      this.addLog('success', `Dance routine triggered: ${this.activeDance}`, 'ESP32');
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
      // Raw servo change SET ch angle
      const parts = cmd.split(' ');
      const ch = parseInt(parts[1]);
      const angle = parseInt(parts[2]);
      if (!isNaN(ch) && !isNaN(angle) && ch >= 0 && ch < this.servos.length) {
        this.servos[ch].angle = angle;
        this.addLog('info', `Override Servo ${ch} (${this.servos[ch].name}) to ${angle} deg`, 'ESP32');
      }
    } else if (cmd.startsWith('CALIBRATE ')) {
      // CALIBRATE ch offset
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
