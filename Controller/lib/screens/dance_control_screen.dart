import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../robot_service.dart';

class DanceInfo {
  final String name;
  final String description;
  final String duration;
  final String command;
  final Color color;
  final IconData icon;
  final String speedCategory; // 'Intense', 'Snappy', 'Moderate', 'Smooth'

  const DanceInfo({
    required this.name,
    required this.description,
    required this.duration,
    required this.command,
    required this.color,
    required this.icon,
    required this.speedCategory,
  });
}

class DanceControlScreen extends StatelessWidget {
  const DanceControlScreen({super.key});

  static const List<DanceInfo> _dances = [
    DanceInfo(
      name: 'Wave',
      description: 'Sequential leg lifts and forward/backward waves.',
      duration: '1s',
      command: 'DANCE_WAVE',
      color: Color(0xFF00BCD4),
      icon: Icons.waves,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Ripple Rotate',
      description: 'Sequential leg lifting and Y-Z plane stepping.',
      duration: '4s',
      command: 'DANCE_RIPPLE',
      color: Color(0xFF7C4DFF),
      icon: Icons.sync,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Ripple Rotate 2',
      description: 'Clockwise circle stepping in Y-Z plane.',
      duration: '10s',
      command: 'DANCE_RIPPLE_2',
      color: Color(0xFFFF4081),
      icon: Icons.loop,
      speedCategory: 'Smooth',
    ),
    DanceInfo(
      name: 'Peacock',
      description: 'Alternating front and back leg fanning.',
      duration: '4s',
      command: 'DANCE_PEACOCK',
      color: Color(0xFF64FFDA),
      icon: Icons.emoji_nature,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Salsa',
      description: 'Dynamic weight shifts and side-steps.',
      duration: '3s',
      command: 'DANCE_SALSA',
      color: Color(0xFFFFAB40),
      icon: Icons.music_note,
      speedCategory: 'Snappy',
    ),
    DanceInfo(
      name: 'Body Twist',
      description: 'Yaw rotation around the central body axis.',
      duration: '3s',
      command: 'DANCE_TWIST',
      color: Color(0xFF448AFF),
      icon: Icons.screen_rotation_alt,
      speedCategory: 'Snappy',
    ),
    DanceInfo(
      name: 'Body Twist 2',
      description: 'Direct foot target yaw rotation.',
      duration: '3s',
      command: 'DANCE_TWIST_2',
      color: Color(0xFF29B6F6),
      icon: Icons.rotate_right,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Body Roll',
      description: 'Direct femur driving for side-to-side roll.',
      duration: '3s',
      command: 'DANCE_ROLL',
      color: Color(0xFFAB47BC),
      icon: Icons.unfold_more,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Body Roll 2',
      description: 'IK-based smooth rolling movement.',
      duration: '3s',
      command: 'DANCE_ROLL_2',
      color: Color(0xFFEC407A),
      icon: Icons.swap_vert,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Body Roll (Fast)',
      description: 'Rapid side-to-side roll.',
      duration: '1.5s',
      command: 'DANCE_ROLL_FAST',
      color: Color(0xFFFF5252),
      icon: Icons.bolt,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Body Roll (Slow)',
      description: 'Gentle, slow-moving roll.',
      duration: '4.5s',
      command: 'DANCE_ROLL_SLOW',
      color: Color(0xFF26A69A),
      icon: Icons.airline_stops,
      speedCategory: 'Snappy',
    ),
    DanceInfo(
      name: 'Body Circle',
      description: 'Frictionless body leaning in circles.',
      duration: '6s',
      command: 'DANCE_CIRCLE',
      color: Color(0xFFFFEE58),
      icon: Icons.all_out,
      speedCategory: 'Smooth',
    ),
    DanceInfo(
      name: 'Body Circle 2',
      description: 'Circular coxa lean with fixed Z height.',
      duration: '5s',
      command: 'DANCE_CIRCLE_2',
      color: Color(0xFF9CCC65),
      icon: Icons.cameraswitch,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Crawl',
      description: 'Sequential single-leg lift and sweep.',
      duration: '4s',
      command: 'DANCE_CRAWL',
      color: Color(0xFFE040FB),
      icon: Icons.directions_walk,
      speedCategory: 'Snappy',
    ),
    DanceInfo(
      name: 'Headbang',
      description: 'Rapid up/down bounce by leg pairs.',
      duration: '4s',
      command: 'DANCE_HEADBANG',
      color: Color(0xFFFF3D00),
      icon: Icons.graphic_eq,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Strobe',
      description: 'Rapid alternating tripod up/down flashing.',
      duration: '2s',
      command: 'DANCE_STROBE',
      color: Color(0xFFEEFF41),
      icon: Icons.flash_on,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Pulse',
      description: 'Radial expansion and contraction.',
      duration: '2s',
      command: 'DANCE_PULSE',
      color: Color(0xFF00E676),
      icon: Icons.favorite_border,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Gallop',
      description: 'Sequential single-leg quick lift and drop.',
      duration: '3s',
      command: 'DANCE_GALLOP',
      color: Color(0xFF1DE9B6),
      icon: Icons.speed,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Beg Wave',
      description: 'Rear legs crouch, front legs rise and wave.',
      duration: '4s',
      command: 'DANCE_BEG_WAVE',
      color: Color(0xFFFFC400),
      icon: Icons.front_hand,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Chassis Breathe',
      description: 'Sinusoidal Z-axis breathing in unison.',
      duration: '5s',
      command: 'DANCE_CHASSIS_BREATHE',
      color: Color(0xFF00E5FF),
      icon: Icons.air,
      speedCategory: 'Smooth',
    ),
    DanceInfo(
      name: 'Belly Crawl',
      description: 'Lowered stance with alternating lateral sway.',
      duration: '3s',
      command: 'DANCE_BELLY_CRAWL',
      color: Color(0xFF76FF03),
      icon: Icons.pets,
      speedCategory: 'Moderate',
    ),
    DanceInfo(
      name: 'Pitch Pivot',
      description: 'Combined pitch and roll circular rocking.',
      duration: '4s',
      command: 'DANCE_PITCH_PIVOT',
      color: Color(0xFFD500F9),
      icon: Icons.screen_rotation,
      speedCategory: 'Smooth',
    ),
    DanceInfo(
      name: 'Twitch',
      description: 'Random small leg offsets (glitchy vibration).',
      duration: '1s',
      command: 'DANCE_TWITCH',
      color: Color(0xFFCFD8DC),
      icon: Icons.vibration,
      speedCategory: 'Intense',
    ),
    DanceInfo(
      name: 'Worm',
      description: 'Front-to-rear sequential leg pair wave.',
      duration: '2s',
      command: 'DANCE_WORM',
      color: Color(0xFFFF80AB),
      icon: Icons.gesture,
      speedCategory: 'Snappy',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final robot = Provider.of<RobotService>(context);

    final bg = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: robot.isConnected
          ? [const Color(0xFF060614), const Color(0xFF0F172A)]
          : [const Color(0xFF0A0A0A), const Color(0xFF1E1E1E)],
    );

    return DefaultTabController(
      length: 5,
      child: Scaffold(
        backgroundColor: const Color(0xFF060614),
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: const Color(0xFF0A0A1E),
          elevation: 0,
          title: const Text('DANCING MOVEMENTS',
              style: TextStyle(
                  color: Colors.cyanAccent,
                  letterSpacing: 2,
                  fontSize: 14,
                  fontWeight: FontWeight.bold)),
          iconTheme: const IconThemeData(color: Colors.white70),
          actions: [
            _ConnectionBadge(isConnected: robot.isConnected),
            const SizedBox(width: 16),
          ],
        ),
        body: Container(
          decoration: BoxDecoration(gradient: bg),
          child: SafeArea(
            child: Column(
              children: [
                if (!robot.isConnected)
                  Container(
                    width: double.infinity,
                    color: Colors.red.shade900.withValues(alpha: 0.6),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: const Text('⚠  Not connected – cannot trigger dancing movements',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: TabBar(
                    isScrollable: true,
                    indicatorColor: Colors.cyanAccent,
                    labelColor: Colors.cyanAccent,
                    unselectedLabelColor: Colors.white38,
                    labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                    indicatorSize: TabBarIndicatorSize.label,
                    tabs: const [
                      Tab(text: 'ALL'),
                      Tab(text: 'INTENSE'),
                      Tab(text: 'SNAPPY'),
                      Tab(text: 'MODERATE'),
                      Tab(text: 'SMOOTH'),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      _buildDanceGrid(context, robot, _dances),
                      _buildDanceGrid(context, robot, _dances.where((d) => d.speedCategory == 'Intense').toList()),
                      _buildDanceGrid(context, robot, _dances.where((d) => d.speedCategory == 'Snappy').toList()),
                      _buildDanceGrid(context, robot, _dances.where((d) => d.speedCategory == 'Moderate').toList()),
                      _buildDanceGrid(context, robot, _dances.where((d) => d.speedCategory == 'Smooth').toList()),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  child: Row(
                    children: [
                      Expanded(
                        child: _ActionButton(
                          label: 'STAND / SAFE POSTURE',
                          icon: Icons.accessibility_new,
                          color: Colors.green,
                          onTap: robot.isConnected ? robot.stand : () {},
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _ActionButton(
                          label: 'STOP DANCE',
                          icon: Icons.stop_circle_outlined,
                          color: Colors.redAccent,
                          onTap: robot.isConnected ? robot.stop : () {},
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDanceGrid(BuildContext context, RobotService robot, List<DanceInfo> dances) {
    if (dances.isEmpty) {
      return const Center(
        child: Text(
          'No movements in this category',
          style: TextStyle(color: Colors.white38, fontSize: 13),
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 220,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 1.15,
      ),
      itemCount: dances.length,
      itemBuilder: (context, index) {
        final dance = dances[index];
        final isCurrentDance = robot.movementStatus.contains(dance.name) ||
            robot.movementStatus.contains(dance.command.replaceAll('DANCE_', '').replaceAll('_', ' '));
        return _DanceCard(
          dance: dance,
          isActive: isCurrentDance && robot.isConnected,
          isConnected: robot.isConnected,
          onTap: () => robot.startDance(dance.command),
        );
      },
    );
  }
}

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
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
      ]),
    );
  }
}

class _DanceCard extends StatelessWidget {
  final DanceInfo dance;
  final bool isActive;
  final bool isConnected;
  final VoidCallback onTap;

  const _DanceCard({
    required this.dance,
    required this.isActive,
    required this.isConnected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = isConnected && !isActive;

    return Container(
      decoration: BoxDecoration(
        color: isActive 
            ? dance.color.withValues(alpha: 0.15) 
            : Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive 
              ? dance.color 
              : dance.color.withValues(alpha: 0.25),
          width: isActive ? 2.0 : 1.0,
        ),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: dance.color.withValues(alpha: 0.3),
                  blurRadius: 12,
                  spreadRadius: 2,
                )
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Icon(
                      dance.icon,
                      color: isConnected ? dance.color : Colors.white24,
                      size: 24,
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.timer_outlined, color: Colors.white38, size: 10),
                          const SizedBox(width: 2),
                          Text(
                            dance.duration,
                            style: const TextStyle(color: Colors.white38, fontSize: 9),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  dance.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isConnected ? Colors.white : Colors.white54,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  dance.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (isActive)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.0,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.greenAccent),
                        ),
                      )
                    else
                      Icon(
                        Icons.play_arrow_rounded,
                        color: enabled ? dance.color : Colors.white24,
                        size: 18,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withValues(alpha: 0.8), color.withValues(alpha: 0.5)],
          ),
          borderRadius: BorderRadius.circular(25),
          border: Border.all(color: color.withValues(alpha: 0.4)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.25), blurRadius: 8)],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(
                    color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          ],
        ),
      ),
    );
  }
}
