import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../robot_service.dart';

/// IK Leg Control Screen
/// Lets the user drag foot position sliders (X, Y, Z in mm)
/// per leg. Sends LEG_POS commands to the ESP32 IK solver.
class IkLegControlScreen extends StatefulWidget {
  const IkLegControlScreen({super.key});

  @override
  State<IkLegControlScreen> createState() => _IkLegControlScreenState();
}

class _IkLegControlScreenState extends State<IkLegControlScreen> {
  // Local copy of foot positions [leg][x,y,z]
  final List<List<double>> _pos = List.generate(6, (_) => [80.0, 0.0, -60.0]);

  // Which legs are expanded
  final List<bool> _expanded = List.filled(6, false);

  // Last set body height
  double _syncZ = -60.0;

  @override
  void initState() {
    super.initState();
    // Seed from service state
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final robot = Provider.of<RobotService>(context, listen: false);
      for (int i = 0; i < 6; i++) {
        _pos[i] = List.from(robot.footPositions[i]);
      }
      setState(() {});
    });
  }

  void _sendLeg(int leg) {
    final robot = Provider.of<RobotService>(context, listen: false);
    robot.setLegPosition(leg, _pos[leg][0], _pos[leg][1], _pos[leg][2]);
  }

  void _resetAll() {
    final robot = Provider.of<RobotService>(context, listen: false);
    setState(() {
      for (int i = 0; i < 6; i++) {
        _pos[i] = [80.0, 0.0, -60.0];
        robot.setLegPosition(i, 80.0, 0.0, -60.0);
      }
      _syncZ = -60.0;
    });
  }

  void _standup() {
    Provider.of<RobotService>(context, listen: false).stand();
    setState(() {
      for (int i = 0; i < 6; i++) {
        _pos[i] = [80.0, 0.0, -60.0];
      }
      _syncZ = -60.0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final robot = Provider.of<RobotService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF060614),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0A1E),
        title: const Text('IK LEG CONTROL',
            style: TextStyle(
                color: Colors.cyanAccent,
                letterSpacing: 2,
                fontSize: 14,
                fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white70),
        actions: [
          IconButton(
            icon: const Icon(Icons.accessibility_new, color: Colors.greenAccent),
            tooltip: 'Stand (All Neutral)',
            onPressed: robot.isConnected ? _standup : null,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white54),
            tooltip: 'Reset Sliders',
            onPressed: robot.isConnected ? _resetAll : null,
          ),
        ],
      ),
      body: Column(
        children: [
          // Connection warning banner
          if (!robot.isConnected)
            Container(
              width: double.infinity,
              color: Colors.red.shade900.withValues(alpha: 0.6),
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: const Text('⚠  Not connected – slider changes will not be sent',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.redAccent, fontSize: 12)),
            ),

          // Permanent Body Height Control
          _BodyHeightControl(
            enabled: robot.isConnected,
            height: _syncZ,
            onChanged: (v) {
              setState(() {
                _syncZ = v;
                for (int i = 0; i < 6; i++) {
                  _pos[i][2] = v;
                }
              });
              robot.setBodyHeight(v);
            },
          ),

          // Leg cards
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: 6,
              itemBuilder: (context, leg) => _LegCard(
                leg: leg,
                name: RobotService.legNames[leg],
                pos: _pos[leg],
                isExpanded: _expanded[leg],
                onToggle: () => setState(() => _expanded[leg] = !_expanded[leg]),
                onXChanged: robot.isConnected
                    ? (v) {
                        setState(() => _pos[leg][0] = v);
                        _sendLeg(leg);
                      }
                    : null,
                onYChanged: robot.isConnected
                    ? (v) {
                        setState(() => _pos[leg][1] = v);
                        _sendLeg(leg);
                      }
                    : null,
                onZChanged: robot.isConnected
                    ? (v) {
                        setState(() => _pos[leg][2] = v);
                        _sendLeg(leg);
                      }
                    : null,
                onReset: robot.isConnected
                    ? () {
                        setState(() => _pos[leg] = [80.0, 0.0, -60.0]);
                        _sendLeg(leg);
                      }
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _BodyHeightControl extends StatelessWidget {
  final bool enabled;
  final double height;
  final ValueChanged<double> onChanged;

  const _BodyHeightControl({
    required this.enabled,
    required this.height,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.cyan.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.cyan.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        const Icon(Icons.height, color: Colors.cyanAccent, size: 20),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('BODY HEIGHT',
                style: TextStyle(
                    color: Colors.cyanAccent,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5)),
            const SizedBox(height: 2),
            Text('${height.toStringAsFixed(0)} mm',
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Slider(
            value: height.clamp(-90.0, -30.0),
            min: -90.0,
            max: -30.0,
            divisions: 60,
            activeColor: Colors.cyanAccent,
            inactiveColor: Colors.white12,
            onChanged: enabled ? onChanged : null,
          ),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _LegCard extends StatelessWidget {
  final int leg;
  final String name;
  final List<double> pos;
  final bool isExpanded;
  final VoidCallback onToggle;
  final ValueChanged<double>? onXChanged;
  final ValueChanged<double>? onYChanged;
  final ValueChanged<double>? onZChanged;
  final VoidCallback? onReset;

  const _LegCard({
    required this.leg,
    required this.name,
    required this.pos,
    required this.isExpanded,
    required this.onToggle,
    required this.onXChanged,
    required this.onYChanged,
    required this.onZChanged,
    required this.onReset,
  });

  // Accent colour per leg side
  Color get _accent =>
      leg < 3 ? const Color(0xFF00BCD4) : const Color(0xFF7C4DFF);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _accent.withValues(alpha: 0.25)),
      ),
      child: Column(children: [
        // Header row
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              // Leg indicator dot
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                    shape: BoxShape.circle, color: _accent),
              ),
              const SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('LEG ${leg + 1}  ·  $name',
                    style: TextStyle(
                        color: _accent,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2)),
                const SizedBox(height: 2),
                Text(
                    'X:${pos[0].toStringAsFixed(0)}  '
                    'Y:${pos[1].toStringAsFixed(0)}  '
                    'Z:${pos[2].toStringAsFixed(0)} mm',
                    style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ]),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.refresh, size: 18, color: Colors.white38),
                tooltip: 'Reset leg',
                onPressed: onReset,
                padding: EdgeInsets.zero,
              ),
              Icon(
                isExpanded ? Icons.expand_less : Icons.expand_more,
                color: Colors.white38,
              ),
            ]),
          ),
        ),

        // Expanded sliders
        if (isExpanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(children: [
              _AxisSlider(
                axis: 'X',
                label: 'Radial Extension / Stance',
                value: pos[0],
                min: 50,
                max: 120,
                accentColor: _accent,
                onChanged: onXChanged,
              ),
              _AxisSlider(
                axis: 'Y',
                label: 'Forward Reach / Swing',
                value: pos[1],
                min: -40,
                max: 40,
                accentColor: _accent,
                onChanged: onYChanged,
              ),
              _AxisSlider(
                axis: 'Z',
                label: 'Height',
                value: pos[2],
                min: -90,
                max: -30,
                accentColor: _accent,
                onChanged: onZChanged,
              ),
            ]),
          ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _AxisSlider extends StatelessWidget {
  final String axis;
  final String label;
  final double value;
  final double min;
  final double max;
  final Color accentColor;
  final ValueChanged<double>? onChanged;

  const _AxisSlider({
    required this.axis,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.accentColor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onChanged == null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        // Axis badge
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: disabled
                ? Colors.white12
                : accentColor.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(axis,
              style: TextStyle(
                  color: disabled ? Colors.white24 : accentColor,
                  fontSize: 11,
                  fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(label,
                  style: TextStyle(
                      color: disabled ? Colors.white24 : Colors.white60,
                      fontSize: 10,
                      letterSpacing: 0.8)),
              Text('${value.toStringAsFixed(1)} mm',
                  style: TextStyle(
                      color: disabled ? Colors.white24 : accentColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ]),
            Slider(
              value: value.clamp(min, max),
              min: min,
              max: max,
              divisions: ((max - min) / 2).round(),
              activeColor: disabled ? Colors.white24 : accentColor,
              inactiveColor: Colors.white10,
              onChanged: onChanged,
            ),
          ]),
        ),
      ]),
    );
  }
}
