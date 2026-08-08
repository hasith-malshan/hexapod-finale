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
  peakAmplitude?: number;
  bassRatio: number;
  rhythmSpeed: 'SLOW' | 'MEDIUM' | 'FAST' | 'UNKNOWN';
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  activityLevel: 'SMOOTH' | 'MODERATE' | 'BUSY';
  classification: string;
  genre?: string;
  audioContext?: string;
  syllableCount?: number;
  voiceActive?: boolean;
  isBeatDetected: boolean;
}

export interface SystemStatus {
  online: boolean;
  serialConnected: boolean;
  batteryLevel: number; // in Volts, e.g. 7.4 - 8.4V
  cpuTemp: number; // in Celsius
  wifiSsid: string;
  wifiSignalDb: number;
  operatingMode: 'AUTO' | 'MANUAL';
  audioSource: 'MIC' | 'BT';
  activeGait: 'STAND' | 'WALK_FORWARD' | 'WALK_BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'RELAX' | 'DANCE' | 'NONE';
  activeDance: string;
  plannedDance?: string;
  speedMultiplier: number;
  bodyHeight: number; // in mm, e.g. -60mm
  manualLedPattern?: string | null;
  manualMood?: string | null;
  showAudioLogs?: boolean;
  robotReady?: boolean;
  bodyRoll?: number;
}

export interface ServoState {
  id: number;
  name: string;
  angle: number;
  offset: number;
  load: number;
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

export type DanceId = 
  | 'WAVE' | 'RIPPLE' | 'RIPPLE_2' | 'PEACOCK' | 'SALSA' 
  | 'TWIST' | 'TWIST_2' | 'ROLL' | 'ROLL_2' | 'ROLL_FAST' | 'ROLL_SLOW'
  | 'CIRCLE' | 'CIRCLE_2' | 'CRAWL' | 'HEADBANG' | 'STROBE'
  | 'PULSE' | 'GALLOP' | 'BEG_WAVE' | 'CHASSIS_BREATHE' | 'BELLY_CRAWL'
  | 'PITCH_PIVOT' | 'TWITCH' | 'WORM';

export type LedPattern = 
  | 'rainbow' | 'confetti' | 'sinelon' | 'bpm'
  | 'juggle' | 'fire' | 'color_wipe' | 'theater_chase'
  | 'comet' | 'dual_scanner' | 'breathing' | 'sparkle_burst'
  | 'strobe' | 'wave' | 'alternating' | 'random_palette';

export type EmotionMood = 
  | 'IDLE' | 'AGGRESSIVE' | 'ENERGY' | 'CHILL' 
  | 'VOICE_ACTIVE' | 'HAPPY' | 'CONFUSED';
