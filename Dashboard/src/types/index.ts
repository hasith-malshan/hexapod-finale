export interface IMUData {
  roll: number;
  pitch: number;
  yaw: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface UltrasonicData {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface AudioDSPData {
  bpm: number;
  beatConfidence: number;
  rmsEnergyDb: number;
  bassRatio: number;
  rhythmSpeed: 'SLOW' | 'MEDIUM' | 'FAST';
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  activityLevel: 'SMOOTH' | 'MODERATE' | 'BUSY';
  classification: string;
  isBeatDetected: boolean;
}

export interface SystemStatus {
  online: boolean;
  serialConnected: boolean;
  batteryLevel: number; // in Volts, e.g., 7.4 - 8.4V
  cpuTemp: number; // in Celsius
  wifiSsid: string;
  wifiSignalDb: number;
  activeGait: 'STAND' | 'WALK_FORWARD' | 'WALK_BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'RELAX' | 'DANCE' | 'NONE';
  activeDance: string;
  speedMultiplier: number;
  bodyHeight: number; // in mm, e.g. -60mm
}

export interface ServoState {
  id: number;
  name: string;
  angle: number;
  offset: number;
  load: number; // simulated loading
}

export interface TelemetryFrame {
  timestamp: number;
  imu: IMUData;
  ultrasonic: UltrasonicData;
  audio: AudioDSPData;
  system: SystemStatus;
  servos: ServoState[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: 'ESP32' | 'PI' | 'DASHBOARD';
}
