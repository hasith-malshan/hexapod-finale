import 'package:flutter_test/flutter_test.dart';
import 'package:hexapod_controller/robot_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('RobotService', () {
    late RobotService robotService;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      robotService = RobotService();
    });

    test('Initial state should be disconnected and idle', () {
      expect(robotService.isConnected, false);
      expect(robotService.movementStatus, 'Idle');
    });

    // Note: Integration tests with Esp32Service would require mocking socket connections.
    // For unit tests, we'd typically inject a mock Esp32Service.
    // Since we hardcoded the dependency in RobotService for simplicity (in this iteration),
    // we can only test the state logic that doesn't depend on the actual socket being connected
    // unless we mock SharedPreferences (which we did) and maybe check defaults.
    
    test('Default settings should be loaded', () async {
       // Wait for settings to load
       await Future.delayed(Duration.zero);
       expect(robotService.ipAddress, "192.168.4.1");
       expect(robotService.port, 80);
    });

    test('saveSettings should update values', () async {
      await robotService.saveSettings("10.0.0.1", 9090);
      expect(robotService.ipAddress, "10.0.0.1");
      expect(robotService.port, 9090);
    });
  });
}
