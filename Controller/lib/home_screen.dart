import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:ui';
import 'robot_service.dart';
import 'screens/ik_leg_control_screen.dart';
import 'screens/motor_control_screen.dart';
import 'screens/dance_control_screen.dart';
import 'screens/wifi_config_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final robot = Provider.of<RobotService>(context);

    final bg = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: robot.isConnected
          ? [const Color(0xFF050518), const Color(0xFF0D2137)]
          : [const Color(0xFF0A0A0A), const Color(0xFF1A1A2E)],
    );

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('HEXAPOD IK CONTROL',
            style: TextStyle(
                letterSpacing: 2,
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.white70)),
        actions: [
          IconButton(
            icon: const Icon(Icons.wifi_find, color: Colors.blueAccent),
            tooltip: 'Wi-Fi Hotspot Setup',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const WifiConfigScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.celebration, color: Colors.pinkAccent),
            tooltip: 'Dancing Movements',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const DanceControlScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.tune, color: Colors.cyanAccent),
            tooltip: 'IK Leg Control',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const IkLegControlScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.build_circle_outlined, color: Colors.white54),
            tooltip: 'Raw Servo Debug',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const MotorControlScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white54),
            onPressed: () => _showSettings(context, robot),
          ),
          _ConnectionBadge(isConnected: robot.isConnected),
          const SizedBox(width: 12),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(gradient: bg),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 8),
              _StatusPanel(status: robot.movementStatus, isConnected: robot.isConnected),
              const SizedBox(height: 16),
              if (robot.isObstacleDetected) ...[
                _ObstacleAlertBanner(),
                const SizedBox(height: 16),
              ],
              _TiltIndicator(rollAngle: robot.bodyRollAngle, isConnected: robot.isConnected),
              const Spacer(),
              // D-pad gait controls
              _GaitDPad(robot: robot),
              const SizedBox(height: 24),
              // Stop / Stand row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    Expanded(child: _ActionButton(
                      label: 'STAND',
                      icon: Icons.accessibility_new,
                      color: Colors.green,
                      onTap: robot.stand,
                    )),
                    const SizedBox(width: 16),
                    Expanded(child: _ActionButton(
                      label: 'STOP',
                      icon: Icons.stop_circle_outlined,
                      color: Colors.redAccent,
                      onTap: robot.stop,
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (robot.isConnected) {
            robot.disconnect();
          } else {
            robot.connect();
          }
        },
        backgroundColor: robot.isConnected
            ? Colors.red.shade800
            : const Color(0xFF00BCD4),
        icon: Icon(robot.isConnected ? Icons.link_off : Icons.link),
        label: Text(robot.isConnected ? 'DISCONNECT' : 'CONNECT'),
      ),
    );
  }

  void _showSettings(BuildContext context, RobotService robot) {
    final ipCtrl = TextEditingController(text: robot.ipAddress);
    final portCtrl = TextEditingController(text: robot.port.toString());
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text('Connection', style: TextStyle(color: Colors.white)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          _dialogField(ipCtrl, 'IP Address'),
          const SizedBox(height: 12),
          _dialogField(portCtrl, 'Port', numeric: true),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              robot.saveSettings(ipCtrl.text, int.tryParse(portCtrl.text) ?? 80);
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _dialogField(TextEditingController c, String label,
      {bool numeric = false}) {
    return TextField(
      controller: c,
      style: const TextStyle(color: Colors.white),
      keyboardType: numeric ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60),
        enabledBorder:
            const UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
      ),
    );
  }
}

// ─────────────────────────────── Widgets ────────────────────────────────────

class _ConnectionBadge extends StatelessWidget {
  final bool isConnected;
  const _ConnectionBadge({required this.isConnected});

  @override
  Widget build(BuildContext context) {
    final color = isConnected ? Colors.greenAccent : Colors.redAccent;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.6)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        CircleAvatar(radius: 3.5, backgroundColor: color),
        const SizedBox(width: 6),
        Text(isConnected ? 'ONLINE' : 'OFFLINE',
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
      ]),
    );
  }
}

class _StatusPanel extends StatelessWidget {
  final String status;
  final bool isConnected;
  const _StatusPanel({required this.status, required this.isConnected});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Column(children: [
            Text('SYSTEM STATUS',
                style: TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 2)),
            const SizedBox(height: 6),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: Text(
                isConnected ? status.toUpperCase() : 'DISCONNECTED',
                key: ValueKey('$status$isConnected'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isConnected ? Colors.cyanAccent : Colors.grey,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.5,
                  shadows: isConnected
                      ? [const BoxShadow(color: Colors.cyan, blurRadius: 12)]
                      : [],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}



class _GaitDPad extends StatelessWidget {
  final RobotService robot;
  const _GaitDPad({required this.robot});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      _DPadButton(
        icon: Icons.keyboard_arrow_up_rounded,
        label: 'FWD',
        onPressed: robot.isConnected ? robot.walkForward : null,
      ),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        _DPadButton(
          icon: Icons.rotate_left,
          label: 'LEFT',
          onPressed: robot.isConnected ? robot.turnLeft : null,
        ),
        const SizedBox(width: 56),
        _DPadButton(
          icon: Icons.rotate_right,
          label: 'RIGHT',
          onPressed: robot.isConnected ? robot.turnRight : null,
        ),
      ]),
      _DPadButton(
        icon: Icons.keyboard_arrow_down_rounded,
        label: 'BWD',
        onPressed: robot.isConnected ? robot.walkBackward : null,
      ),
    ]);
  }
}

class _DPadButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  const _DPadButton({required this.icon, required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final active = onPressed != null;
    return GestureDetector(
      onTapDown: (_) => onPressed?.call(),
      child: Container(
        width: 80,
        height: 80,
        margin: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: active
              ? [const Color(0xFF1E3A5F), const Color(0xFF0A1929)]
              : [Colors.grey.shade900, Colors.black]),
          border: Border.all(
            color: active ? Colors.cyanAccent.withValues(alpha: 0.5) : Colors.white12,
            width: 1.5,
          ),
          boxShadow: active
              ? [BoxShadow(color: Colors.cyan.withValues(alpha: 0.25), blurRadius: 16, spreadRadius: 2)]
              : [],
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: active ? Colors.cyanAccent : Colors.white24, size: 28),
          Text(label,
              style: TextStyle(
                  color: active ? Colors.cyan.shade200 : Colors.white24,
                  fontSize: 9,
                  letterSpacing: 1,
                  fontWeight: FontWeight.bold)),
        ]),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionButton(
      {required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withValues(alpha: 0.8), color.withValues(alpha: 0.5)],
          ),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: color.withValues(alpha: 0.4)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 12)],
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text(label,
              style: const TextStyle(
                  color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
        ]),
      ),
    );
  }
}

class _ObstacleAlertBanner extends StatelessWidget {
  const _ObstacleAlertBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withValues(alpha: 0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withValues(alpha: 0.1),
            blurRadius: 8,
          ),
        ],
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 20),
          SizedBox(width: 10),
          Text(
            'OBSTACLE DETECTED! GAIT PAUSED',
            style: TextStyle(
              color: Colors.redAccent,
              fontWeight: FontWeight.bold,
              fontSize: 11,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _TiltIndicator extends StatelessWidget {
  final double rollAngle;
  final bool isConnected;

  const _TiltIndicator({required this.rollAngle, required this.isConnected});

  @override
  Widget build(BuildContext context) {
    final active = isConnected;
    final angleRad = rollAngle * 3.14159265358979323846 / 180.0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.black45,
              border: Border.all(
                color: active ? Colors.cyanAccent.withValues(alpha: 0.4) : Colors.white12,
                width: 2,
              ),
            ),
            child: ClipOval(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Transform.rotate(
                    angle: -angleRad,
                    child: Container(
                      width: 100,
                      height: 100,
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            height: 50,
                            color: active 
                                ? Colors.cyanAccent.withValues(alpha: 0.12) 
                                : Colors.white12,
                          ),
                          Container(
                            height: 1.5,
                            color: active ? Colors.cyanAccent : Colors.white30,
                          ),
                          const SizedBox(height: 48),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Colors.pinkAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(width: 24, height: 1, color: Colors.white24),
                  Container(width: 1, height: 24, color: Colors.white24),
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ROLL TELEMETRY',
                  style: TextStyle(
                    color: active ? Colors.white38 : Colors.white12,
                    fontSize: 8,
                    letterSpacing: 2,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      active ? '${rollAngle.toStringAsFixed(1)}°' : 'N/A',
                      style: TextStyle(
                        color: active ? Colors.white : Colors.white30,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (active && rollAngle.abs() > 0.5)
                      Icon(
                        rollAngle > 0 ? Icons.arrow_right_alt : Icons.arrow_left,
                        color: Colors.pinkAccent,
                        size: 16,
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  active 
                      ? (rollAngle.abs() < 2.0 ? 'Stable' : 'Tilted') 
                      : 'Offline',
                  style: TextStyle(
                    color: active 
                        ? (rollAngle.abs() < 2.0 ? Colors.greenAccent : Colors.orangeAccent) 
                        : Colors.white12,
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
