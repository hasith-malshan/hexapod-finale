// ================================================================
// hexapod_ik.ino  –  Inverse Kinematics Hexapod Controller
// OPTIMIZED: FreeRTOS + Ultrasonic Sensors + Wi-Fi Stability Fixes
// ================================================================
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

// --- ULTRASONIC SENSOR PINS ---
#define TRIG_F 25
#define ECHO_F 26
#define TRIG_B 27
#define ECHO_B 14
#define TRIG_L 18
#define ECHO_L 19
#define TRIG_R 23
#define ECHO_R 13

// --- OBSTACLE RANGE CONFIGURATION ---
#define OBS_MIN_DIST 30.0f
#define OBS_MAX_DIST 50.0f

const char* ssid     = "Hexapod_Controller";
const char* password = "password123";
WiFiServer  server(80);
WiFiClient  activeClient;

Adafruit_PWMServoDriver pwm1 = Adafruit_PWMServoDriver(0x40);
Adafruit_PWMServoDriver pwm2 = Adafruit_PWMServoDriver(0x41);
Adafruit_MPU6050 mpu;
float baseRoll = 0.0f;
unsigned long lastImuTime = 0;

#define SERVOMIN   150
#define SERVOMAX   600
#define SERVO_FREQ 50

static uint16_t _pwmShadow[32];
static bool     _shadowDirty[32];

void shadowInit() {
  for (int i = 0; i < 32; i++) { _pwmShadow[i] = 0; _shadowDirty[i] = false; }
}

inline void stagePWM(uint8_t ch, uint16_t pulse) {
  if (_pwmShadow[ch] != pulse) { _pwmShadow[ch] = pulse; _shadowDirty[ch] = true; }
}

void flushDriver(uint8_t addr, int base) {
  uint8_t buf[64]; bool anyDirty = false;
  for (int ch = 0; ch < 16; ch++) {
    if (_shadowDirty[base + ch]) anyDirty = true;
    uint16_t off = _pwmShadow[base + ch];
    buf[ch * 4 + 0] = 0; buf[ch * 4 + 1] = 0; buf[ch * 4 + 2] = off & 0xFF; buf[ch * 4 + 3] = off >> 8;
  }
  if (!anyDirty) return;
  Wire.beginTransmission(addr); Wire.write(0x06); Wire.write(buf, 64); Wire.endTransmission();
  for (int ch = 0; ch < 16; ch++) _shadowDirty[base + ch] = false;
}
void flushAllServos() { flushDriver(0x40, 0); flushDriver(0x41, 16); yield(); }  // yield() gives Wi-Fi stack CPU time
inline void stageServoAngle(uint8_t ch, uint8_t angle) {
  uint16_t pulse = (uint16_t)map(angle, 0, 180, SERVOMIN, SERVOMAX);
  stagePWM(ch, pulse);
}

const uint8_t LEG_CH[6][3] = {
  {  0,  1,  2 }, {  3,  4,  5 }, {  6,  7,  8 },
  { 16, 17, 18 }, { 19, 20, 21 }, { 22, 23, 24 }
};
const bool IS_LEFT[6] = { true, true, true, false, false, false };

#define COXA_LEN   45.0f
#define FEMUR_LEN  80.0f
#define TIBIA_LEN 134.0f
#define COXA_N     90.0f
#define FEMUR_N    50.0f
#define TIBIA_N    80.0f
#define SAFE_COXA_DEG   90
#define SAFE_FEMUR_DEG  65
#define SAFE_TIBIA_DEG  95
#define FEMUR_GEO_N  (-10.43f)
#define TIBIA_GEO_N  ( 78.65f)

float REST_X = 80.0f;
float REST_Z = -60.0f;

#define STEP_FWD_DEG  20.0f
#define STEP_BWD_DEG  20.0f
#define TURN_DEG      20.0f
#define LIFT_Z        45.0f
#define INTERP_STEPS  15
#define STEP_MS        8
#define WALK_Z_DROP    0.0f

struct IKCache { float x, z, L, D, footAngle; bool valid; };
#define IK_CACHE_SIZE 16
static IKCache ikCache[IK_CACHE_SIZE];
static uint8_t ikCacheNext = 0;

static void clearIKCache() { for (int i = 0; i < IK_CACHE_SIZE; i++) ikCache[i].valid = false; ikCacheNext = 0; }
static bool lookupIKCache(float x, float z, float& L, float& D, float& footAngle) {
  for (int i = 0; i < IK_CACHE_SIZE; i++) {
    if (ikCache[i].valid && fabsf(ikCache[i].x - x) < 0.5f && fabsf(ikCache[i].z - z) < 0.5f) {
      L = ikCache[i].L; D = ikCache[i].D; footAngle = ikCache[i].footAngle; return true;
    }
  } return false;
}
static void insertIKCache(float x, float z, float L, float D, float footAngle) {
  uint8_t slot = ikCacheNext % IK_CACHE_SIZE;
  ikCache[slot] = { x, z, L, D, footAngle, true };
  ikCacheNext = (ikCacheNext + 1) % IK_CACHE_SIZE;
}

enum RobotState {
  IDLE, WALK_FORWARD, WALK_BACKWARD, TURN_LEFT, TURN_RIGHT,
  DANCE_WAVE, DANCE_RIPPLE, DANCE_RIPPLE_2, DANCE_PEACOCK, DANCE_SALSA,
  DANCE_TWIST, DANCE_TWIST_2, DANCE_ROLL, DANCE_ROLL_2,
  DANCE_ROLL_FAST, DANCE_ROLL_SLOW, DANCE_CIRCLE, DANCE_CIRCLE_2,
  DANCE_CRAWL, DANCE_HEADBANG, DANCE_STROBE, DANCE_PULSE, DANCE_GALLOP,
  DANCE_BEG_WAVE, DANCE_CHASSIS_BREATHE, DANCE_BELLY_CRAWL,
  DANCE_PITCH_PIVOT, DANCE_TWITCH, DANCE_WORM,
  TEST_LEG_0, TEST_LEG_1, TEST_LEG_2, TEST_LEG_3, TEST_LEG_4, TEST_LEG_5,
  RELAX_LEGS
};

RobotState currentState = IDLE;

enum CmdSource { SRC_NONE, SRC_WIFI, SRC_SERIAL };
volatile CmdSource activeSource = SRC_NONE;

// FreeRTOS Emergency Flag for Obstacles
volatile bool emergencyStopFlag = false;

#define DANCE_INTERRUPTED() do { \
  for (int _i = 0; _i < 6; _i++) { footPos[_i][0]=REST_X; footPos[_i][1]=0; footPos[_i][2]=REST_Z; } \
  clearIKCache(); sendReady(); return; \
} while(0)

struct LegAngles { uint8_t coxa, femur, tibia; };
float footPos[6][3];

// -------------------------------------------------------------
// FREERTOS: ULTRASONIC SENSOR BACKGROUND TASK (CORE 0)
// -------------------------------------------------------------
float readUltrasonic(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // FIX: Reduced timeout to 4000us (~68cm limit). 
  // Prevents sensor reads from starving the Wi-Fi task and dropping Flutter connection!
  long duration = pulseIn(echoPin, HIGH, 4000); 
  
  if (duration == 0) return 999.0f; // Sensor not found or out of range
  return (duration / 2.0f) * 0.0343f; // Convert to cm
}

bool inObstacleRange(float dist) {
  return (dist >= OBS_MIN_DIST && dist <= OBS_MAX_DIST);
}

void sensorTask(void * pvParameters) {
  for(;;) {
    float distF = readUltrasonic(TRIG_F, ECHO_F);
    float distB = readUltrasonic(TRIG_B, ECHO_B);
    float distL = readUltrasonic(TRIG_L, ECHO_L);
    float distR = readUltrasonic(TRIG_R, ECHO_R);

    // If ANY sensor detects an object between 30cm and 50cm...
    bool obstacleDetected = inObstacleRange(distF) || inObstacleRange(distB) || 
                            inObstacleRange(distL) || inObstacleRange(distR);

    // FIX: Only trigger emergency stop if moving FORWARD or doing forward crawls.
    // This allows you to manually WALK_BACKWARD or stand/dance while facing a wall!
    if (obstacleDetected && (currentState == WALK_FORWARD || currentState == DANCE_CRAWL)) {
      emergencyStopFlag = true;
    }

    // FIX: Increased delay to 100ms. Gives the Wi-Fi task plenty of time to process Flutter App data.
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// -------------------------------------------------------------
// INVERSE KINEMATICS LOGIC
// -------------------------------------------------------------
void forwardKinematics(float femur_deg, float tibia_deg, float& rx, float& rz) {
  float f_rad = (FEMUR_GEO_N - (femur_deg - FEMUR_N)) * (float)M_PI / 180.0f;
  float t_dir = f_rad + (TIBIA_GEO_N + (tibia_deg - TIBIA_N)) * (float)M_PI / 180.0f - (float)M_PI;
  rz = FEMUR_LEN * sinf(f_rad) + TIBIA_LEN * sinf(t_dir);
  rx = COXA_LEN + FEMUR_LEN * cosf(f_rad) + TIBIA_LEN * cosf(t_dir);
}

struct LegAngles solveIK(int leg, float x, float y, float z) {
  struct LegAngles r = { (uint8_t)COXA_N, (uint8_t)FEMUR_N, (uint8_t)TIBIA_N };
  float coxa_geo = atan2f(y, x) * 180.0f / (float)M_PI;
  float H = sqrtf(x * x + y * y);
  float L, D, footAngle;
  if (!lookupIKCache(H, z, L, D, footAngle)) {
    L = H - COXA_LEN;
    D = constrain(sqrtf(L * L + z * z), fabsf(FEMUR_LEN - TIBIA_LEN) + 1.0f, FEMUR_LEN + TIBIA_LEN - 1.0f);
    footAngle = atan2f(-z, L) * 180.0f / (float)M_PI;
    insertIKCache(H, z, L, D, footAngle);
  }
  float cosA = constrain((FEMUR_LEN*FEMUR_LEN + D*D - TIBIA_LEN*TIBIA_LEN)/(2.0f*FEMUR_LEN*D), -1.0f, 1.0f);
  float cosB = constrain((FEMUR_LEN*FEMUR_LEN + TIBIA_LEN*TIBIA_LEN - D*D)/(2.0f*FEMUR_LEN*TIBIA_LEN), -1.0f, 1.0f);
  r.coxa  = (uint8_t)constrain((int)roundf(COXA_N + (IS_LEFT[leg] ? coxa_geo : -coxa_geo)), 0, 180);
  r.femur = (uint8_t)constrain((int)roundf(FEMUR_N - (-(footAngle - acosf(cosA)*180.0f/(float)M_PI) - FEMUR_GEO_N)), 0, 180);
  r.tibia = (uint8_t)constrain((int)roundf(TIBIA_N + (acosf(cosB)*180.0f/(float)M_PI - TIBIA_GEO_N)), 0, 180);
  return r;
}

void applyAllLegsIK(float x[6], float y[6], float z[6]) {
  for (int leg = 0; leg < 6; leg++) {
    LegAngles a = solveIK(leg, x[leg], y[leg], z[leg]);
    stageServoAngle(LEG_CH[leg][0], a.coxa); stageServoAngle(LEG_CH[leg][1], a.femur); stageServoAngle(LEG_CH[leg][2], a.tibia);
  }
  flushAllServos();
  for (int leg = 0; leg < 6; leg++) { footPos[leg][0]=x[leg]; footPos[leg][1]=y[leg]; footPos[leg][2]=z[leg]; }
}

void applyAllAngles(const LegAngles angles[6]) {
  for (int leg = 0; leg < 6; leg++) {
    stageServoAngle(LEG_CH[leg][0], angles[leg].coxa); stageServoAngle(LEG_CH[leg][1], angles[leg].femur); stageServoAngle(LEG_CH[leg][2], angles[leg].tibia);
  }
  flushAllServos();
}

void setSafePosition() {
  LegAngles safe[6];
  for (int i=0; i<6; i++) safe[i] = { SAFE_COXA_DEG, SAFE_FEMUR_DEG, SAFE_TIBIA_DEG };
  applyAllAngles(safe);
}

void relaxAllServos() {
  for (int i = 0; i < 32; i++) { _pwmShadow[i] = 0; _shadowDirty[i] = true; }
  flushAllServos(); clearIKCache();
  Serial.println("Servos Deactivated (Relaxed).");
}

void sendReady() {
  activeSource = SRC_NONE; // Reset lock when ready for next command
  Serial.println("READY (to USB)");
  Serial2.println("READY");
  if (activeClient && activeClient.connected()) activeClient.println("READY");
}

// -------------------------------------------------------------
// CHECK STOP / SERIAL READER
// -------------------------------------------------------------
bool checkStop() {
  // 1. Check for FreeRTOS Obstacle Interrupt First
  if (emergencyStopFlag) {
    emergencyStopFlag = false;
    currentState = IDLE;
    activeSource = SRC_NONE; // Reset lock
    Serial.println("OBSTACLE DETECTED! Aborting Movement...");
    if (activeClient && activeClient.connected()) {
      activeClient.println("OBSTACLE!");
      activeClient.flush(); // Force message to Flutter App
    }
    return true; // Abort current IK loop immediately!
  }

  String line = "";
  CmdSource detectedSource = SRC_NONE;
  
  // 2. Check Wi-Fi (Flutter App)
  if (activeClient && activeClient.connected() && activeClient.available()) {
    line = activeClient.readStringUntil('\n'); 
    line.trim();
    if (line.length() > 0) {
      detectedSource = SRC_WIFI;
    }
  }
  
  // 3. Check UART Serial (Raspberry Pi Brain on GPIO 16/17)
  if (line.length() == 0 && Serial2.available()) {
    line = Serial2.readStringUntil('\n'); 
    line.trim();
    if (line.length() > 0) {
      detectedSource = SRC_SERIAL;
    }
  }
  
  // 4. Process if command exists
  if (line.length() > 0) { 
    // Source Locking: If a controller is busy executing a gait/dance, only accept from that same source
    if (activeSource != SRC_NONE && detectedSource != activeSource) {
      Serial.print("Ignored command (busy with source ");
      Serial.print(activeSource);
      Serial.print("): ");
      Serial.println(line);
      return false; 
    }

    activeSource = detectedSource;
    processCommand(line); 
    
    // If the command did not transition to a movement state (it remains IDLE), release lock immediately
    if (currentState == IDLE) {
      activeSource = SRC_NONE;
    }
    return true; 
  }
  
  return false;
}

void processCommand(const String& cmd) {
  clearIKCache();
  if (cmd.startsWith("MOVE:")) {
    int comma = cmd.indexOf(',', 5);
    if (comma != -1) {
      float x = cmd.substring(5, comma).toFloat();
      float y = cmd.substring(comma + 1).toFloat();
      if (fabsf(x) < 0.15f && fabsf(y) < 0.15f) {
        standUpFast(); 
        currentState = IDLE; 
        sendReady();
      } else if (fabsf(y) >= fabsf(x)) {
        currentState = (y > 0.0f) ? WALK_FORWARD : WALK_BACKWARD;
      } else {
        currentState = (x > 0.0f) ? TURN_RIGHT : TURN_LEFT;
      }
    }
    return;
  }
  if (cmd.startsWith("LEG_POS:")) {
    int c1 = cmd.indexOf(':');
    int c2 = cmd.indexOf(':', c1 + 1);
    if (c1 != -1 && c2 != -1) {
      int leg = cmd.substring(c1 + 1, c2).toInt();
      String coords = cmd.substring(c2 + 1);
      int comma1 = coords.indexOf(',');
      int comma2 = coords.indexOf(',', comma1 + 1);
      if (comma1 != -1 && comma2 != -1) {
        float x = coords.substring(0, comma1).toFloat();
        float y = coords.substring(comma1 + 1, comma2).toFloat();
        float z = coords.substring(comma2 + 1).toFloat();
        if (leg >= 0 && leg < 6) {
          currentState = IDLE;
          applyLegIK(leg, x, y, z);
          flushAllServos();
        }
      }
    }
    return;
  }
  if (cmd.startsWith("BODY_HEIGHT:")) {
    float z = cmd.substring(12).toFloat();
    currentState = IDLE;
    float px[6], py[6], pz[6];
    for (int i = 0; i < 6; i++) {
      px[i] = footPos[i][0];
      py[i] = footPos[i][1];
      pz[i] = z;
    }
    applyAllLegsIK(px, py, pz);
    return;
  }
  if (cmd.startsWith("SET ")) {
    int s1 = cmd.indexOf(' ');
    int s2 = cmd.indexOf(' ', s1 + 1);
    if (s1 != -1 && s2 != -1) {
      int channel = cmd.substring(s1 + 1, s2).toInt();
      int angle = cmd.substring(s2 + 1).toInt();
      if (channel >= 0 && channel < 32) {
        currentState = IDLE;
        stageServoAngle(channel, constrain(angle, 0, 180));
        flushAllServos();
      }
    }
    return;
  }

  if (cmd == "WALK_FORWARD")   { currentState = WALK_FORWARD;    return; }
  if (cmd == "WALK_BACKWARD")  { currentState = WALK_BACKWARD;   return; }
  if (cmd == "TURN_LEFT")      { currentState = TURN_LEFT;       return; }
  if (cmd == "TURN_RIGHT")     { currentState = TURN_RIGHT;      return; }
  if (cmd == "STOP"||cmd=="STAND"){ standUpFast(); currentState = IDLE; sendReady(); return; }
  
  if (cmd == "DANCE_WAVE")       { currentState = DANCE_WAVE;       return; }
  if (cmd == "DANCE_RIPPLE")     { currentState = DANCE_RIPPLE;     return; }
  if (cmd == "DANCE_RIPPLE_2")   { currentState = DANCE_RIPPLE_2;   return; }
  if (cmd == "DANCE_PEACOCK")    { currentState = DANCE_PEACOCK;    return; }
  if (cmd == "DANCE_SALSA")      { currentState = DANCE_SALSA;      return; }
  if (cmd == "DANCE_TWIST")      { currentState = DANCE_TWIST;      return; }
  if (cmd == "DANCE_TWIST_2")    { currentState = DANCE_TWIST_2;    return; }
  if (cmd == "DANCE_ROLL")       { currentState = DANCE_ROLL;       return; }
  if (cmd == "DANCE_ROLL_2")     { currentState = DANCE_ROLL_2;     return; }
  if (cmd == "DANCE_ROLL_FAST")  { currentState = DANCE_ROLL_FAST;  return; }
  if (cmd == "DANCE_ROLL_SLOW")  { currentState = DANCE_ROLL_SLOW;  return; }
  if (cmd == "DANCE_CIRCLE")     { currentState = DANCE_CIRCLE;     return; }
  if (cmd == "DANCE_CIRCLE_2")   { currentState = DANCE_CIRCLE_2;   return; }
  if (cmd == "DANCE_CRAWL")      { currentState = DANCE_CRAWL;      return; }
  if (cmd == "DANCE_HEADBANG")   { currentState = DANCE_HEADBANG;   return; }
  if (cmd == "DANCE_STROBE")     { currentState = DANCE_STROBE;     return; }
  if (cmd == "DANCE_PULSE")      { currentState = DANCE_PULSE;      return; }
  if (cmd == "DANCE_GALLOP")     { currentState = DANCE_GALLOP;     return; }
  if (cmd == "DANCE_BEG_WAVE")        { currentState = DANCE_BEG_WAVE;        return; }
  if (cmd == "DANCE_CHASSIS_BREATHE") { currentState = DANCE_CHASSIS_BREATHE; return; }
  if (cmd == "DANCE_BELLY_CRAWL")     { currentState = DANCE_BELLY_CRAWL;     return; }
  if (cmd == "DANCE_PITCH_PIVOT")     { currentState = DANCE_PITCH_PIVOT;     return; }
  if (cmd == "DANCE_TWITCH")          { currentState = DANCE_TWITCH;          return; }
  if (cmd == "DANCE_WORM")            { currentState = DANCE_WORM;            return; }

  if (cmd == "TEST_LEG_0") { currentState = TEST_LEG_0; return; }
  if (cmd == "TEST_LEG_1") { currentState = TEST_LEG_1; return; }
  if (cmd == "TEST_LEG_2") { currentState = TEST_LEG_2; return; }
  if (cmd == "TEST_LEG_3") { currentState = TEST_LEG_3; return; }
  if (cmd == "TEST_LEG_4") { currentState = TEST_LEG_4; return; }
  if (cmd == "TEST_LEG_5") { currentState = TEST_LEG_5; return; }
  
  if (cmd == "RELAX") { currentState = RELAX_LEGS; return; }
}

void applyLegIK(int leg, float x, float y, float z) {
  footPos[leg][0] = x; footPos[leg][1] = y; footPos[leg][2] = z;
  LegAngles a = solveIK(leg, x, y, z);
  stageServoAngle(LEG_CH[leg][0], a.coxa); stageServoAngle(LEG_CH[leg][1], a.femur); stageServoAngle(LEG_CH[leg][2], a.tibia);
}

void smoothLegsToTarget(const int legs[], int legCount, const float tx[], const float ty[], const float tz[], int steps, int stepMs) {
  if (currentState == IDLE) return;
  float sx[6], sy[6], sz[6];
  for (int i=0; i<legCount; i++) { int l = legs[i]; sx[i]=footPos[l][0]; sy[i]=footPos[l][1]; sz[i]=footPos[l][2]; }
  for (int s=1; s<=steps; s++) {
    if (checkStop()) return; float t = (float)s / (float)steps;
    for (int i=0; i<legCount; i++) {
      int l = legs[i]; float x = sx[i]+t*(tx[i]-sx[i]), y = sy[i]+t*(ty[i]-sy[i]), z = sz[i]+t*(tz[i]-sz[i]);
      applyLegIK(l, x, y, z);
    }
    flushAllServos(); delay(stepMs);
  }
}

void standUpFast() {
  clearIKCache();
  for (int s=1; s<=8; s++) {
    if (checkStop()) DANCE_INTERRUPTED();
    float t = s/8.0f, px[6], py[6], pz[6];
    for (int l=0; l<6; l++) { px[l]=footPos[l][0]+t*(REST_X-footPos[l][0]); py[l]=footPos[l][1]+t*(0.0f-footPos[l][1]); pz[l]=footPos[l][2]+t*(REST_Z-footPos[l][2]); }
    applyAllLegsIK(px, py, pz); delay(STEP_MS);
  }
}

void testSingleLeg(int leg) {
  int legs[1] = { leg };
  float tx[1] = { REST_X }; float ty[1] = { 0 }; float tz[1] = { REST_Z + 40.0f }; 
  smoothLegsToTarget(legs, 1, tx, ty, tz, 15, 15); delay(300);
  tx[0] = REST_X + 30.0f; smoothLegsToTarget(legs, 1, tx, ty, tz, 15, 15); delay(300);
  tx[0] = REST_X; tz[0] = REST_Z; smoothLegsToTarget(legs, 1, tx, ty, tz, 15, 15); delay(300);
}

// -------------------------------------------------------------
// DANCES 
// -------------------------------------------------------------
const int TRIPOD_A[3] = {0, 3, 4}; const int TRIPOD_B[3] = {1, 2, 5};
void swingTripod(const int swingLegs[], int count, float coxaDeg) {
  float tx[3], ty[3], tz[3]; float r = coxaDeg * M_PI/180.0f;
  for(int i=0;i<count;i++){ tx[i]=REST_X; ty[i]=0; tz[i]=REST_Z+LIFT_Z; } smoothLegsToTarget(swingLegs, count, tx, ty, tz, INTERP_STEPS, STEP_MS);
  for(int i=0;i<count;i++){ tx[i]=REST_X*cosf(r); ty[i]=REST_X*sinf(r); } smoothLegsToTarget(swingLegs, count, tx, ty, tz, INTERP_STEPS, STEP_MS);
  for(int i=0;i<count;i++){ tz[i]=REST_Z-WALK_Z_DROP; } smoothLegsToTarget(swingLegs, count, tx, ty, tz, INTERP_STEPS, STEP_MS);
}
void powerStrokeWalk(float sweepDeg) {
  int all[6] = {0,1,2,3,4,5}; float tx[6], ty[6], tz[6], r = sweepDeg * M_PI/180.0f;
  for (int i=0;i<6;i++) { float a = atan2f(footPos[i][1], footPos[i][0])-r; tx[i]=REST_X*cosf(a); ty[i]=REST_X*sinf(a); tz[i]=REST_Z-WALK_Z_DROP; }
  smoothLegsToTarget(all, 6, tx, ty, tz, INTERP_STEPS, STEP_MS);
}
void powerStrokeTurn(float sweepDeg) {
  int all[6] = {0,1,2,3,4,5}; float tx[6], ty[6], tz[6], r = sweepDeg * M_PI/180.0f;
  for (int i=0;i<6;i++) { float a = atan2f(footPos[i][1],footPos[i][0])-(IS_LEFT[i]?r:-r); tx[i]=REST_X*cosf(a); ty[i]=REST_X*sinf(a); tz[i]=REST_Z-WALK_Z_DROP; }
  smoothLegsToTarget(all, 6, tx, ty, tz, INTERP_STEPS, STEP_MS);
}
void walkForward() { swingTripod(TRIPOD_A,3,STEP_FWD_DEG); if(currentState==IDLE)return; powerStrokeWalk(STEP_FWD_DEG); if(currentState==IDLE)return; swingTripod(TRIPOD_B,3,STEP_FWD_DEG); if(currentState==IDLE)return; powerStrokeWalk(STEP_FWD_DEG); }
void walkBackward(){ swingTripod(TRIPOD_A,3,-STEP_BWD_DEG); if(currentState==IDLE)return; powerStrokeWalk(-STEP_BWD_DEG); if(currentState==IDLE)return; swingTripod(TRIPOD_B,3,-STEP_BWD_DEG); if(currentState==IDLE)return; powerStrokeWalk(-STEP_BWD_DEG); }
void turnLeft()    { swingTripod(TRIPOD_A,3,-TURN_DEG); if(currentState==IDLE)return; powerStrokeTurn(-TURN_DEG); if(currentState==IDLE)return; swingTripod(TRIPOD_B,3,-TURN_DEG); if(currentState==IDLE)return; powerStrokeTurn(-TURN_DEG); }
void turnRight()   { swingTripod(TRIPOD_A,3,TURN_DEG); if(currentState==IDLE)return; powerStrokeTurn(TURN_DEG); if(currentState==IDLE)return; swingTripod(TRIPOD_B,3,TURN_DEG); if(currentState==IDLE)return; powerStrokeTurn(TURN_DEG); }

void dancewave() {
  float px[6], py[6], pz[6];
  for(int l=0;l<6;l++){px[l]=REST_X;py[l]=0;pz[l]=REST_Z+45.0f;} applyAllLegsIK(px,py,pz); delay(150);
  for(int l=0;l<6;l++){px[l]=REST_X;py[l]=20;pz[l]=REST_Z+45.0f;} applyAllLegsIK(px,py,pz); delay(150);
  for(int l=0;l<6;l++){px[l]=REST_X;py[l]=-20;pz[l]=REST_Z+45.0f;} applyAllLegsIK(px,py,pz); delay(150);
  for(int l=0;l<6;l++){px[l]=REST_X;py[l]=0;pz[l]=REST_Z;}       applyAllLegsIK(px,py,pz); delay(150);
}
void danceRippleRotate() {
  int o[6]={0,3,4,5,2,1}; float phY[4]={0,20,-20,0}; float phZ[4]={REST_Z+45,REST_Z+45,REST_Z+45,REST_Z};
  for(int r=0;r<2;r++){ for(int t=0;t<68;t++){ if(checkStop())DANCE_INTERRUPTED(); float px[6],py[6],pz[6];
    for(int i=0;i<6;i++){ px[i]=footPos[i][0];py[i]=footPos[i][1];pz[i]=footPos[i][2];}
    for(int i=0;i<6;i++){ int lT=t-(i*4); if(lT<0)continue; int ph=lT/12; int pS=lT%12;
      if(ph>=4){px[o[i]]=REST_X;py[o[i]]=0;pz[o[i]]=REST_Z;continue;}
      float fY=ph==0?footPos[o[i]][1]:phY[ph-1], fZ=ph==0?footPos[o[i]][2]:phZ[ph-1], b=(pS+1)/12.0f;
      px[o[i]]=REST_X; py[o[i]]=fY+b*(phY[ph]-fY); pz[o[i]]=fZ+b*(phZ[ph]-fZ);
    } applyAllLegsIK(px,py,pz); delay(10);
  }}
}
void danceRippleRotate2() {
  int o[6]={0,3,4,5,2,1};
  for(int r=0;r<3;r++){ for(int t=0;t<70;t++){ if(checkStop())DANCE_INTERRUPTED(); float px[6],py[6],pz[6];
    for(int i=0;i<6;i++){ px[i]=footPos[i][0];py[i]=footPos[i][1];pz[i]=footPos[i][2];}
    for(int i=0;i<6;i++){ int lT=t-(i*8); if(lT<0)continue;
      if(lT>=30){px[o[i]]=REST_X;py[o[i]]=0;pz[o[i]]=REST_Z;continue;}
      float a=(lT/30.0f)*2.0f*M_PI; px[o[i]]=REST_X; py[o[i]]=35.0f*sinf(a); pz[o[i]]=REST_Z+35.0f*(1.0f-cosf(a));
    } applyAllLegsIK(px,py,pz); delay(27);
  } delay(150); }
}
void dancePeacock() {
  auto mV = [&](float x[], float y[], float z[]){
    float sx[6],sy[6],sz[6]; for(int i=0;i<6;i++){sx[i]=footPos[i][0];sy[i]=footPos[i][1];sz[i]=footPos[i][2];}
    for(int s=1;s<=30;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/30.0f,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float px[6],py[6],pz[6];
      for(int i=0;i<6;i++){px[i]=sx[i]+b*(x[i]-sx[i]);py[i]=sy[i]+b*(y[i]-sy[i]);pz[i]=sz[i]+b*(z[i]-sz[i]);} applyAllLegsIK(px,py,pz);delay(16);
    }
  };
  float tx[6],ty[6],tz[6];
  for(int r=0;r<3;r++){
    tx[0]=REST_X+20;ty[0]=25;tz[0]=REST_Z+50; tx[1]=REST_X;ty[1]=0;tz[1]=REST_Z-15; tx[2]=REST_X-10;ty[2]=-15;tz[2]=REST_Z-15;
    tx[3]=REST_X+20;ty[3]=-25;tz[3]=REST_Z+50; tx[4]=REST_X;ty[4]=0;tz[4]=REST_Z-15; tx[5]=REST_X-10;ty[5]=15;tz[5]=REST_Z-15;
    mV(tx,ty,tz); delay(300);
    tx[0]=REST_X-10;ty[0]=15;tz[0]=REST_Z-15; tx[2]=REST_X+20;ty[2]=-25;tz[2]=REST_Z+50;
    tx[3]=REST_X-10;ty[3]=-15;tz[3]=REST_Z-15; tx[5]=REST_X+20;ty[5]=25;tz[5]=REST_Z+50;
    mV(tx,ty,tz); delay(300);
  }
}
void danceSalsa() {
  auto mL = [&](int l[],int c,float x[],float y[],float z[]){
    float sx[3],sy[3],sz[3]; for(int i=0;i<c;i++){sx[i]=footPos[l[i]][0];sy[i]=footPos[l[i]][1];sz[i]=footPos[l[i]][2];}
    for(int s=1;s<=20;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/20.0f,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float px[6],py[6],pz[6];
      for(int i=0;i<6;i++){px[i]=footPos[i][0];py[i]=footPos[i][1];pz[i]=footPos[i][2];}
      for(int i=0;i<c;i++){px[l[i]]=sx[i]+b*(x[i]-sx[i]);py[l[i]]=sy[i]+b*(y[i]-sy[i]);pz[l[i]]=sz[i]+b*(z[i]-sz[i]);} applyAllLegsIK(px,py,pz);delay(14);
    }
  };
  int tA[3]={0,3,4}; int tB[3]={1,2,5}; float xA[3],yA[3],zA[3],xB[3],yB[3],zB[3];
  for(int r=0;r<4;r++){
    xA[0]=REST_X;yA[0]=20;zA[0]=REST_Z+35; xA[1]=REST_X;yA[1]=-20;zA[1]=REST_Z+35; xA[2]=REST_X;yA[2]=-20;zA[2]=REST_Z+35;
    xB[0]=REST_X;yB[0]=-20;zB[0]=REST_Z-10; xB[1]=REST_X;yB[1]=-20;zB[1]=REST_Z-10; xB[2]=REST_X;yB[2]=20;zB[2]=REST_Z-10;
    mL(tA,3,xA,yA,zA); mL(tB,3,xB,yB,zB); delay(150);
    xB[0]=REST_X;yB[0]=20;zB[0]=REST_Z+35; xB[1]=REST_X;yB[1]=20;zB[1]=REST_Z+35; xB[2]=REST_X;yB[2]=-20;zB[2]=REST_Z+35;
    for(int i=0;i<3;i++){xA[i]=REST_X;yA[i]=0;zA[i]=REST_Z;} mL(tA,3,xA,yA,zA); mL(tB,3,xB,yB,zB); delay(150);
  }
}
void danceBodyTwist() {
  auto tw = [&](float f,float to){
    for(int s=1;s<=35;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/35.0f,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float r=(f+b*(to-f))*M_PI/180.0f;
      float px[6],py[6],pz[6]; for(int i=0;i<6;i++){px[i]=REST_X*cosf(IS_LEFT[i]?-r:r);py[i]=REST_X*sinf(IS_LEFT[i]?-r:r);pz[i]=REST_Z;}
      applyAllLegsIK(px,py,pz); delay(9);
    }
  }; for(int r=0;r<4;r++){tw(0,24);tw(24,-24);tw(-24,0);delay(80);}
}
void danceBodyTwist2() {
  float fX[6], fY[6], fZ[6]; for(int i=0;i<6;i++){fX[i]=footPos[i][0];fY[i]=footPos[i][1];fZ[i]=footPos[i][2];}
  auto tw = [&](float f,float to){
    for(int s=1;s<=30;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/30.0f,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float r=(f+b*(to-f))*M_PI/180.0f;
      float px[6],py[6],pz[6]; for(int i=0;i<6;i++){px[i]=fX[i]*cosf(r)+fY[i]*sinf(r);py[i]=-fX[i]*sinf(r)+fY[i]*cosf(r);pz[i]=fZ[i];} applyAllLegsIK(px,py,pz); delay(16);
    }
  }; for(int r=0;r<4;r++){tw(0,20);tw(20,-20);tw(-20,0);delay(100);}
}
void doHW(float d,int st,int ms){
  auto r = [&](float f,float to){
    for(int s=1;s<=st;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/(float)st,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float amt=f+b*(to-f);
      LegAngles a[6]; for(int i=0;i<6;i++){a[i].coxa=SAFE_COXA_DEG;a[i].femur=(uint8_t)constrain(roundf(SAFE_FEMUR_DEG+(IS_LEFT[i]?amt:-amt)),0,180);a[i].tibia=SAFE_TIBIA_DEG;} applyAllAngles(a);delay(ms);
    }
  }; for(int x=0;x<4;x++){r(0,d);r(d,-d);r(-d,0);delay(80);}
  for(int i=0;i<6;i++){footPos[i][0]=REST_X;footPos[i][1]=0;footPos[i][2]=REST_Z;}
}
void danceBodyRoll() { doHW(13.0f, 35, 16); }
void danceBodyRoll2() {
  auto r = [&](float f,float to){
    for(int s=1;s<=35;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/35.0f,b=t<0.5f?2*t*t:-1+(4-2*t)*t; float amt=f+b*(to-f);
      float px[6],py[6],pz[6]; for(int i=0;i<6;i++){px[i]=REST_X;py[i]=0;pz[i]=REST_Z+(IS_LEFT[i]?-amt:amt);} applyAllLegsIK(px,py,pz); delay(16);
    }
  }; for(int x=0;x<4;x++){r(0,25);r(25,-25);r(-25,0);delay(80);}
}
void danceBodyRollFast() { doHW(13.0f, 20, 4); }
void danceBodyRollSlow() { doHW(13.0f, 40, 8); }
void danceCircle() {
  for(int r=0;r<4;r++){ for(int s=0;s<72;s++){ if(checkStop())DANCE_INTERRUPTED(); float a=(s/72.0f)*2.0f*M_PI, ox=25.0f*cosf(a), oy=25.0f*sinf(a);
    LegAngles an[6]; for(int i=0;i<6;i++) an[i]=solveIK(i,REST_X-ox,-(IS_LEFT[i]?oy:-oy),REST_Z); applyAllAngles(an); delay(14);
  }} for(int i=0;i<6;i++){footPos[i][0]=REST_X;footPos[i][1]=0;footPos[i][2]=REST_Z;}
}
void danceCircle2() {
  for(int r=0;r<4;r++){ for(int s=0;s<60;s++){ if(checkStop())DANCE_INTERRUPTED(); float a=(s/60.0f)*2.0f*M_PI;
    float px[6],py[6],pz[6]; for(int i=0;i<6;i++){px[i]=REST_X+20.0f*cosf(a);py[i]=20.0f*sinf(a);pz[i]=footPos[i][2];} applyAllLegsIK(px,py,pz); delay(12);
  }}
}
void danceCrawl() {
  const float lZ=REST_Z+48.0f; const float sY=30.0f; const int SEQ[6]={0,3,1,4,2,5};
  for(int r=0;r<3;r++){ for(int w=0;w<6;w++){ if(checkStop())DANCE_INTERRUPTED(); int lg=SEQ[w]; int l1[1]={lg};
    float tX[1]={REST_X}, tY[1]={IS_LEFT[lg]?-sY:sY}, tZ[1]={lZ}; smoothLegsToTarget(l1,1,tX,tY,tZ,20,18); delay(80);
    tY[0]=0; tZ[0]=REST_Z; smoothLegsToTarget(l1,1,tX,tY,tZ,18,18); delay(120);
  }}
}
void danceHeadbang() {
  const int F[2]={0,3}, M[2]={1,4}, R[2]={2,5};
  auto b = [&](const int ls[],int c){
    for(int r=0;r<2;r++){ if(checkStop())DANCE_INTERRUPTED(); float tX[2],tY[2],tZ[2];
      for(int i=0;i<c;i++){tX[i]=REST_X;tY[i]=0;tZ[i]=REST_Z+55.0f;} smoothLegsToTarget(ls,c,tX,tY,tZ,8,10);
      for(int i=0;i<c;i++)tZ[i]=REST_Z-5.0f; smoothLegsToTarget(ls,c,tX,tY,tZ,6,8); delay(60);
    }
  }; for(int r=0;r<4;r++){ b(F,2); b(R,2); b(M,2); delay(100); }
}
void danceGallop() {
  const int W[6]={0,3,1,4,2,5};
  for(int r=0;r<5;r++){ for(int i=0;i<6;i++){ if(checkStop())DANCE_INTERRUPTED(); int lg[1]={W[i]};
    float tx[1]={REST_X+15}, ty[1]={0}, tz[1]={REST_Z+46}; smoothLegsToTarget(lg,1,tx,ty,tz,9,9);
    tx[0]=REST_X; tz[0]=REST_Z; smoothLegsToTarget(lg,1,tx,ty,tz,7,9);
  } delay(40); }
}
void danceStrobe() {
  float upZ=REST_Z+36, dnZ=REST_Z-8, szA[3], szB[3];
  for(int i=0;i<3;i++){ szA[i]=footPos[TRIPOD_A[i]][2]; szB[i]=footPos[TRIPOD_B[i]][2]; }
  for(int r=0;r<14;r++){ if(checkStop())DANCE_INTERRUPTED(); bool aUp=(r%2==0); float tzA=aUp?upZ:dnZ, tzB=aUp?dnZ:upZ;
    for(int s=1;s<=6;s++){ float t=s/6.0f, px[6], py[6], pz[6]; for(int i=0;i<6;i++){px[i]=REST_X;py[i]=0;}
      for(int i=0;i<3;i++){ pz[TRIPOD_A[i]]=szA[i]+t*(tzA-szA[i]); pz[TRIPOD_B[i]]=szB[i]+t*(tzB-szB[i]); } applyAllLegsIK(px,py,pz); delay(5);
    } for(int i=0;i<3;i++){szA[i]=tzA;szB[i]=tzB;} delay(12);
  }
}
void dancePulse() {
  float pR=32, pL=22, a[6]={2.094,2.618,3.665,0.524,5.760,5.236};
  auto dp = [&](float f,float to,int st,int ms){
    for(int s=1;s<=st;s++){ if(checkStop())DANCE_INTERRUPTED(); float t=s/(float)st, b=t<0.5f?2*t*t:-1+(4-2*t)*t, am=f+b*(to-f), px[6],py[6],pz[6];
      for(int i=0;i<6;i++){px[i]=REST_X+am*cosf(a[i]);py[i]=am*sinf(a[i]);pz[i]=REST_Z+(am/pR)*pL;} applyAllLegsIK(px,py,pz); delay(ms);
    }
  }; for(int r=0;r<8;r++){dp(0,pR,10,5); dp(pR,0,8,5); delay(18);}
}
void danceBegWave() {
  float tx[6], ty[6], tz[6]; int all[6] = {0,1,2,3,4,5};
  for(int i=0;i<6;i++) { tx[i]=REST_X; ty[i]=0; tz[i]=REST_Z; }
  tz[1]=tz[4]=REST_Z+25.0f; tz[2]=tz[5]=REST_Z+50.0f; smoothLegsToTarget(all, 6, tx, ty, tz, 25, 12);
  tz[0]=tz[3]=REST_Z+110.0f; tx[0]=tx[3]=REST_X-10.0f; smoothLegsToTarget(all, 6, tx, ty, tz, 20, 15); delay(200);
  float px[6], py[6], pz[6]; for(int i=0;i<6;i++){ px[i]=footPos[i][0]; py[i]=footPos[i][1]; pz[i]=footPos[i][2]; }
  for(int rep=0; rep<4; rep++) { if(checkStop())DANCE_INTERRUPTED(); py[0]=40; py[3]=40; applyAllLegsIK(px,py,pz); delay(200); py[0]=-40; py[3]=-40; applyAllLegsIK(px,py,pz); delay(200); }
}
void danceChassisBreathe() {
  for (int rep=0; rep<4; rep++) { for (int s=0; s<60; s++) { if(checkStop())DANCE_INTERRUPTED();
      float zOffset = sinf((s/60.0f)*2.0f*M_PI)*35.0f; float px[6], py[6], pz[6];
      for(int i=0; i<6; i++){ px[i]=REST_X; py[i]=0; pz[i]=REST_Z+zOffset; } applyAllLegsIK(px, py, pz); delay(20);
  }}
}
void danceBellyCrawl() {
  float px[6], py[6], pz[6];
  for(int i=0; i<6; i++){ px[i]=REST_X; py[i]=0; pz[i]=REST_Z+60.0f; } applyAllLegsIK(px, py, pz); delay(300);
  for(int rep=0; rep<4; rep++) { if(checkStop())DANCE_INTERRUPTED();
     py[0]=35; py[3]=-35; py[2]=-35; py[5]=35; applyAllLegsIK(px,py,pz); delay(250);
     py[0]=-35; py[3]=35; py[2]=35; py[5]=-35; applyAllLegsIK(px,py,pz); delay(250);
  }
}
void dancePitchPivot() {
  for (int rep=0; rep<4; rep++) { for(int s=0; s<40; s++) { if(checkStop())DANCE_INTERRUPTED();
      float rad=(s/40.0f)*2.0f*M_PI; float px[6], py[6], pz[6];
      for(int i=0; i<6; i++){ px[i]=REST_X+cosf(rad)*15.0f; py[i]=sinf(rad)*20.0f*(IS_LEFT[i]?1:-1); pz[i]=REST_Z+sinf(rad)*25.0f*(IS_LEFT[i]?-1:1); }
      applyAllLegsIK(px, py, pz); delay(22);
  }}
}
void danceTwitch() {
  for (int rep=0; rep<60; rep++) { if(checkStop())DANCE_INTERRUPTED(); float px[6], py[6], pz[6];
    for(int i=0; i<6; i++){ px[i]=REST_X+(rand()%12-6); py[i]=(rand()%12-6); pz[i]=REST_Z+(rand()%12-6); } applyAllLegsIK(px, py, pz); delay(15);
  } for(int i=0;i<6;i++){footPos[i][0]=REST_X;footPos[i][1]=0;footPos[i][2]=REST_Z;}
}
void danceWorm() {
  int order[3][2] = {{0,3}, {1,4}, {2,5}};
  for(int rep=0; rep<6; rep++){ for(int step=0; step<3; step++){ if(checkStop())DANCE_INTERRUPTED();
       float px[6], py[6], pz[6]; for(int i=0; i<6; i++){ px[i]=REST_X; py[i]=0; pz[i]=REST_Z; }
       pz[order[step][0]]=REST_Z+45.0f; pz[order[step][1]]=REST_Z+45.0f; applyAllLegsIK(px, py, pz); delay(75);
  }}
}

// ================================================================
// SETUP + MAIN LOOP
// ================================================================
void setup() {
  Serial.begin(115200); // For PC Debugging via USB
  Serial2.begin(115200, SERIAL_8N1, 16, 17); // For Raspberry Pi UART (RX=16, TX=17)
  
  Wire.begin();
  Wire.setClock(100000); 
  pwm1.begin(); pwm1.setPWMFreq(SERVO_FREQ); 
  pwm2.begin(); pwm2.setPWMFreq(SERVO_FREQ);
  shadowInit(); 

  // --- INITIALIZE ULTRASONIC PINS ---
  pinMode(TRIG_F, OUTPUT); pinMode(ECHO_F, INPUT);
  pinMode(TRIG_B, OUTPUT); pinMode(ECHO_B, INPUT);
  pinMode(TRIG_L, OUTPUT); pinMode(ECHO_L, INPUT);
  pinMode(TRIG_R, OUTPUT); pinMode(ECHO_R, INPUT);

  // --- LAUNCH FREERTOS BACKGROUND SENSOR TASK (Core 0) ---
  xTaskCreatePinnedToCore(
    sensorTask,   // Function to execute
    "SensorTask", // Name of the task
    4096,         // Stack size in words
    NULL,         // Task input parameter
    1,            // Priority (1 is standard)
    NULL,         // Task handle
    0             // Run on Core 0 (0 = Network/Sensors, 1 = Arduino/Motors)
  );
  
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    delay(100);
    float sumRoll = 0; sensors_event_t a, g, temp;
    for(int i = 0; i < 50; i++) { mpu.getEvent(&a, &g, &temp); sumRoll += atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI; delay(10); }
    baseRoll = sumRoll / 50.0f;
  }

  setSafePosition(); delay(800);
  float rx, rz; forwardKinematics(SAFE_FEMUR_DEG, SAFE_TIBIA_DEG, rx, rz);
  REST_X = rx; REST_Z = rz;
  for (int leg=0;leg<6;leg++){footPos[leg][0]=REST_X;footPos[leg][1]=0;footPos[leg][2]=REST_Z;}
  
  WiFi.softAP(ssid, password); 
  server.begin(); 
  sendReady();
}

void loop() {
  // FIX: Properly manage dropping dead clients so Flutter can reconnect easily
  if (activeClient) {
    if (!activeClient.connected()) {
      activeClient.stop();
      // Also accept any pending new client immediately after cleanup
      WiFiClient newClient = server.available();
      if (newClient) activeClient = newClient;
    }
  } else {
    activeClient = server.available();
  }

  if (currentState == IDLE) checkStop();

  // FIX: Throttled to 250ms and single-write to avoid TCP fragmentation
  if (millis() - lastImuTime > 250) {
    lastImuTime = millis();
    sensors_event_t a, g, temp;
    if (mpu.getEvent(&a, &g, &temp)) {
      float tiltVal = (atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI) - baseRoll;
      // Single snprintf + single write to prevent TCP splitting "TILT:" and the value
      char tiltBuf[32];
      int len = snprintf(tiltBuf, sizeof(tiltBuf), "TILT:%.2f\n", tiltVal);
      Serial2.print(tiltBuf); // Send to Pi via UART
      if (activeClient && activeClient.connected()) {
        activeClient.write((const uint8_t*)tiltBuf, len);
      }
    }
  }

  switch (currentState) {
    case WALK_FORWARD:    walkForward();     break;
    case WALK_BACKWARD:   walkBackward();    break;
    case TURN_LEFT:       turnLeft();        break;
    case TURN_RIGHT:      turnRight();       break;
    
    case DANCE_WAVE:      dancewave();         standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_RIPPLE:    danceRippleRotate(); standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_RIPPLE_2:  danceRippleRotate2();standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_PEACOCK:   dancePeacock();      standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_SALSA:     danceSalsa();        standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_TWIST:     danceBodyTwist();    standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_TWIST_2:   danceBodyTwist2();   standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_ROLL:      danceBodyRoll();     standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_ROLL_2:    danceBodyRoll2();    standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_ROLL_FAST: danceBodyRollFast(); standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_ROLL_SLOW: danceBodyRollSlow(); standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_CIRCLE:    danceCircle();       standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_CIRCLE_2:  danceCircle2();      standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_CRAWL:     danceCrawl();        standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_HEADBANG:  danceHeadbang();     standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_STROBE:    danceStrobe();       standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_PULSE:     dancePulse();        standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_GALLOP:    danceGallop();       standUpFast(); currentState=IDLE; sendReady(); break;
    
    case DANCE_BEG_WAVE:        danceBegWave();        standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_CHASSIS_BREATHE: danceChassisBreathe(); standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_BELLY_CRAWL:     danceBellyCrawl();     standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_PITCH_PIVOT:     dancePitchPivot();     standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_TWITCH:          danceTwitch();         standUpFast(); currentState=IDLE; sendReady(); break;
    case DANCE_WORM:            danceWorm();           standUpFast(); currentState=IDLE; sendReady(); break;

    case TEST_LEG_0: testSingleLeg(0); standUpFast(); currentState=IDLE; sendReady(); break;
    case TEST_LEG_1: testSingleLeg(1); standUpFast(); currentState=IDLE; sendReady(); break;
    case TEST_LEG_2: testSingleLeg(2); standUpFast(); currentState=IDLE; sendReady(); break;
    case TEST_LEG_3: testSingleLeg(3); standUpFast(); currentState=IDLE; sendReady(); break;
    case TEST_LEG_4: testSingleLeg(4); standUpFast(); currentState=IDLE; sendReady(); break;
    case TEST_LEG_5: testSingleLeg(5); standUpFast(); currentState=IDLE; sendReady(); break;
    
    case RELAX_LEGS: relaxAllServos(); currentState=IDLE; sendReady(); break;
    case IDLE: default: break;
  }
}