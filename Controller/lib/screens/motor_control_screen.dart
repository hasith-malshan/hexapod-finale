import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../robot_service.dart';

/// Raw servo debug screen – direct channel angle control.
/// Kept as a debug tool; IK leg control is in IkLegControlScreen.
class MotorControlScreen extends StatefulWidget {
  const MotorControlScreen({super.key});

  @override
  State<MotorControlScreen> createState() => _MotorControlScreenState();
}

class _MotorControlScreenState extends State<MotorControlScreen> {
  final Map<int, double> _angles = {};

  static const List<Map<String, dynamic>> _legs = [
    {'name': 'Leg 1 – Front Left',  'channels': [2,  1,  0],  'parts': ['Coxa', 'Femur', 'Tibia']},
    {'name': 'Leg 2 – Mid Left',    'channels': [3,  4,  5],  'parts': ['Coxa', 'Femur', 'Tibia']},
    {'name': 'Leg 3 – Back Left',   'channels': [6,  7,  8],  'parts': ['Coxa', 'Femur', 'Tibia']},
    {'name': 'Leg 4 – Front Right', 'channels': [16, 17, 18], 'parts': ['Coxa', 'Femur', 'Tibia']},
    {'name': 'Leg 5 – Mid Right',   'channels': [19, 20, 21], 'parts': ['Coxa', 'Femur', 'Tibia']},
    {'name': 'Leg 6 – Back Right',  'channels': [22, 23, 24], 'parts': ['Coxa', 'Femur', 'Tibia']},
  ];

  // Neutral angles from FK / IK reference
  static const Map<String, double> _neutralAngles = {
    'Coxa':  90.0,
    'Femur': 50.0,
    'Tibia': 80.0,
  };

  @override
  void initState() {
    super.initState();
    for (final leg in _legs) {
      final channels = leg['channels'] as List<int>;
      final parts    = leg['parts']    as List<String>;
      for (int i = 0; i < 3; i++) {
        _angles[channels[i]] = _neutralAngles[parts[i]]!;
      }
    }
  }

  void _setAngle(int ch, double angle, String part) {
    setState(() => _angles[ch] = angle);
    Provider.of<RobotService>(context, listen: false).moveServo(ch, angle);
  }

  void _resetAll() {
    final robot = Provider.of<RobotService>(context, listen: false);
    setState(() {
      for (final leg in _legs) {
        final channels = leg['channels'] as List<int>;
        final parts    = leg['parts']    as List<String>;
        for (int i = 0; i < 3; i++) {
          final neutral = _neutralAngles[parts[i]]!;
          _angles[channels[i]] = neutral;
        }
      }
    });
    robot.stand();
  }

  @override
  Widget build(BuildContext context) {
    final robot = Provider.of<RobotService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F22),
        title: const Text('RAW SERVO DEBUG',
            style: TextStyle(
                color: Colors.orangeAccent,
                fontSize: 13,
                letterSpacing: 2,
                fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white60),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white54),
            tooltip: 'Reset all to neutral',
            onPressed: robot.isConnected ? _resetAll : null,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(30),
          child: Container(
            width: double.infinity,
            color: Colors.orange.shade900.withValues(alpha: 0.3),
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: const Text(
              '⚠  Debug mode – bypasses IK solver, controls servos directly',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.orangeAccent, fontSize: 11),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          if (!robot.isConnected)
            Container(
              width: double.infinity,
              color: Colors.red.shade900.withValues(alpha: 0.6),
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: const Text('⚠  Not connected – servo controls will not be sent',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.redAccent, fontSize: 12)),
            ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _legs.length,
              itemBuilder: (context, idx) {
                final leg      = _legs[idx];
                final channels = leg['channels'] as List<int>;
                final parts    = leg['parts']    as List<String>;
                return _LegCard(
                  name: leg['name'] as String,
                  channels: channels,
                  parts: parts,
                  angles: _angles,
                  neutralAngles: _neutralAngles,
                  onChanged: robot.isConnected ? _setAngle : null,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _LegCard extends StatelessWidget {
  final String name;
  final List<int> channels;
  final List<String> parts;
  final Map<int, double> angles;
  final Map<String, double> neutralAngles;
  final void Function(int ch, double angle, String part)? onChanged;

  const _LegCard({
    required this.name,
    required this.channels,
    required this.parts,
    required this.angles,
    required this.neutralAngles,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name,
            style: const TextStyle(
                color: Colors.orangeAccent,
                fontWeight: FontWeight.bold,
                fontSize: 13,
                letterSpacing: 1)),
        const Divider(color: Colors.white12, height: 16),
        for (int i = 0; i < 3; i++)
          _ServoRow(
            part:    parts[i],
            channel: channels[i],
            value:   angles[channels[i]] ?? neutralAngles[parts[i]]!,
            neutral: neutralAngles[parts[i]]!,
            onChanged: onChanged != null ? (v) => onChanged!(channels[i], v, parts[i]) : null,
          ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _ServoRow extends StatelessWidget {
  final String part;
  final int channel;
  final double value;
  final double neutral;
  final ValueChanged<double>? onChanged;

  const _ServoRow({
    required this.part,
    required this.channel,
    required this.value,
    required this.neutral,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onChanged == null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('$part (ch $channel)',
              style: TextStyle(color: disabled ? Colors.white24 : Colors.white60, fontSize: 11)),
          Row(children: [
            // Quick-set buttons
            for (final preset in [0.0, neutral, 90.0, 180.0])
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: SizedBox(
                  width: 38,
                  height: 26,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      side: BorderSide(color: disabled ? Colors.white12 : Colors.orange.withValues(alpha: 0.4)),
                      foregroundColor: disabled ? Colors.white24 : Colors.orangeAccent,
                      textStyle: const TextStyle(fontSize: 10),
                    ),
                    onPressed: disabled ? null : () => onChanged!(preset),
                    child: Text(preset.toInt().toString()),
                  ),
                ),
              ),
            const SizedBox(width: 8),
            SizedBox(
              width: 36,
              child: Text('${value.toInt()}°',
                  textAlign: TextAlign.right,
                  style: TextStyle(
                      color: disabled ? Colors.white24 : Colors.orangeAccent,
                      fontSize: 12,
                      fontWeight: FontWeight.bold)),
            ),
          ]),
        ]),
        Slider(
          value: value,
          min: 0,
          max: 180,
          divisions: 180,
          activeColor: disabled ? Colors.white24 : Colors.orangeAccent,
          inactiveColor: Colors.white10,
          onChanged: onChanged,
        ),
      ]),
    );
  }
}
