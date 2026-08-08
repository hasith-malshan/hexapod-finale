import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'home_screen.dart';
import 'robot_service.dart';

import 'wifi_service.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => RobotService()),
        ChangeNotifierProvider(create: (_) => WifiService()),
      ],
      child: const HexapodApp(),
    ),
  );
}

class HexapodApp extends StatelessWidget {
  const HexapodApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hexapod Controller',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050510), // Deep bluish black
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00E5FF), // Neon Cyan
          secondary: Color(0xFF7C4DFF), // Deep Purple
          surface: Color(0xFF1E1E2C),
          // background: Color(0xFF050510), // Deprecated
          error: Color(0xFFFF2B2B), // Neon Red
          onPrimary: Colors.black,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Color(0xFF00E5FF),
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
          ),
        ),
        textTheme: const TextTheme(
          headlineSmall: TextStyle(
            color: Colors.white70,
            fontSize: 18,
            letterSpacing: 1.2,
          ),
          bodyMedium: TextStyle(color: Colors.white60),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
