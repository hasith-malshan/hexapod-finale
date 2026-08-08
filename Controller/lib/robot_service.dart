import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'esp32_service.dart';

class RobotService extends ChangeNotifier {
  final Esp32Service _esp32Service = Esp32Service();
  bool _isConnected = false;
  String _movementStatus = "Idle";

  // Connection settings
  String _ipAddress = "192.168.4.1";
  int _port = 80;

  // IK state – current foot positions per leg [leg][x,y,z]
  // Defaults match REST_X=80, REST_Z=-60 on the robot
  final List<List<double>> _footPositions = List.generate(
    6,
    (_) => [80.0, 0.0, -60.0],
  );

  // Per-leg label
  static const legNames = [
    'Front Left',
    'Mid Left',
    'Back Left',
    'Front Right',
    'Mid Right',
    'Back Right',
  ];

  bool get isConnected => _isConnected;
  String get movementStatus => _movementStatus;
  String get ipAddress => _ipAddress;
  int get port => _port;
  List<List<double>> get footPositions => _footPositions;

  bool _isRobotBusy = false;
  final List<String> _commandQueue = [];

  double _bodyRollAngle = 0.0;
  bool _isObstacleDetected = false;

  double get bodyRollAngle => _bodyRollAngle;
  bool get isObstacleDetected => _isObstacleDetected;

  RobotService() {
    _loadSettings();
    _esp32Service.connectionStream.listen((connected) {
      _isConnected = connected;
      if (!connected) {
        _movementStatus = "Idle";
        _commandQueue.clear();
        _isRobotBusy = false;
        _isObstacleDetected = false;
        _bodyRollAngle = 0.0;
      }
      notifyListeners();
    });

    _esp32Service.responseStream.listen((response) {
      if (response == "READY") {
        _isRobotBusy = false;
        _processNextQueuedCommand();
      } else if (response == "OBSTACLE!") {
        _isObstacleDetected = true;
        notifyListeners();
        // Reset after 3 seconds of safety
        Timer(const Duration(seconds: 3), () {
          _isObstacleDetected = false;
          notifyListeners();
        });
      } else if (response.startsWith("TILT:")) {
        final val = double.tryParse(response.substring(5));
        if (val != null) {
          _bodyRollAngle = val;
          notifyListeners();
        }
      }
    });
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _ipAddress = prefs.getString('ip_address') ?? "192.168.4.1";
    _port = prefs.getInt('port') ?? 80;
    notifyListeners();
  }

  Future<void> saveSettings(String ip, int port) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ip_address', ip);
    await prefs.setInt('port', port);
    _ipAddress = ip;
    _port = port;
    notifyListeners();
  }

  Future<void> connect() async => _esp32Service.connect(_ipAddress, _port);
  void disconnect() => _esp32Service.disconnect();

  void _sendImmediate(String cmd) {
    _commandQueue.clear();
    _isRobotBusy = false;
    _esp32Service.send(cmd);
  }

  void _processNextQueuedCommand() {
    if (_commandQueue.isNotEmpty && _isConnected) {
      _isRobotBusy = true;
      final nextCmd = _commandQueue.removeAt(0);
      _movementStatus = _getMovementStatusForCommand(nextCmd);
      _esp32Service.send(nextCmd);
      notifyListeners();
    } else {
      _isRobotBusy = false;
      _movementStatus = "Idle";
      notifyListeners();
    }
  }

  String _getMovementStatusForCommand(String cmd) {
    if (cmd.startsWith("DANCE_")) {
      return "Dancing: ${cmd.replaceAll('DANCE_', '').replaceAll('_', ' ')}";
    }
    switch (cmd) {
      case "WALK_FORWARD": return "Walking Forward";
      case "WALK_BACKWARD": return "Walking Backward";
      case "TURN_LEFT": return "Turning Left";
      case "TURN_RIGHT": return "Turning Right";
      case "STAND": return "Standing";
      case "STOP": return "Idle";
      default: return "Command Active";
    }
  }

  // ─── IK Gait Commands ───────────────────────────────────────────

  void walkForward() {
    if (!_isConnected) return;
    _movementStatus = "Walking Forward";
    _sendImmediate("WALK_FORWARD");
    notifyListeners();
  }

  void walkBackward() {
    if (!_isConnected) return;
    _movementStatus = "Walking Backward";
    _sendImmediate("WALK_BACKWARD");
    notifyListeners();
  }

  void turnLeft() {
    if (!_isConnected) return;
    _movementStatus = "Turning Left";
    _sendImmediate("TURN_LEFT");
    notifyListeners();
  }

  void turnRight() {
    if (!_isConnected) return;
    _movementStatus = "Turning Right";
    _sendImmediate("TURN_RIGHT");
    notifyListeners();
  }

  void stop() {
    _sendImmediate("STOP");
    _movementStatus = "Idle";
    notifyListeners();
  }

  void startDance(String danceCommand) {
    if (!_isConnected) return;
    if (_isRobotBusy) {
      _commandQueue.add(danceCommand);
      _movementStatus = "Queued: ${_commandQueue.length} dances";
    } else {
      _isRobotBusy = true;
      _movementStatus = _getMovementStatusForCommand(danceCommand);
      _esp32Service.send(danceCommand);
    }
    notifyListeners();
  }

  void stand() {
    if (!_isConnected) return;
    _sendImmediate("STAND");
    _movementStatus = "Standing";
    // Reset local foot position state
    for (int i = 0; i < 6; i++) {
      _footPositions[i] = [80.0, 0.0, -60.0];
    }
    notifyListeners();
  }

  // ─── IK Direct Leg Position ──────────────────────────────────────
  /// Set a specific leg's foot position (x, y, z in mm, leg-local frame).
  /// Sends LEG_POS:leg:x,y,z to ESP32.
  void setLegPosition(int leg, double x, double y, double z) {
    if (!_isConnected) return;
    _footPositions[leg] = [x, y, z];
    final xs = x.toStringAsFixed(1);
    final ys = y.toStringAsFixed(1);
    final zs = z.toStringAsFixed(1);
    _sendImmediate("LEG_POS:$leg:$xs,$ys,$zs");
    notifyListeners();
  }

  // ─── Body Height ─────────────────────────────────────────────────
  /// Adjust body height by setting z for all legs (mm, negative = lower).
  void setBodyHeight(double zMm) {
    if (!_isConnected) return;
    _movementStatus = "Height: ${zMm.toStringAsFixed(0)} mm";
    _sendImmediate("BODY_HEIGHT:${zMm.toStringAsFixed(1)}");
    for (int i = 0; i < 6; i++) {
      _footPositions[i][2] = zMm;
    }
    notifyListeners();
  }

  // ─── Legacy: direct servo (for debug / raw mode) ─────────────────
  void moveServo(int channel, double angle) {
    if (!_isConnected) return;
    _sendImmediate("SET $channel ${angle.toInt()}");
    notifyListeners();
  }

  // ─── Legacy: joystick MOVE:x,y → maps to gait commands ──────────
  void move(double x, double y) {
    if (!_isConnected) return;
    if (x == 0 && y == 0) {
      stop();
      return;
    }
    _sendImmediate("MOVE:${x.toStringAsFixed(2)},${y.toStringAsFixed(2)}");
    notifyListeners();
  }
}
