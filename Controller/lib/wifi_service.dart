import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class WifiNetwork {
  final String ssid;
  final String signal;
  final String security;

  WifiNetwork({required this.ssid, required this.signal, required this.security});

  factory WifiNetwork.fromJson(Map<String, dynamic> json) {
    return WifiNetwork(
      ssid: json['ssid'] ?? '',
      signal: json['signal'] ?? '',
      security: json['security'] ?? '',
    );
  }
}

class WifiService extends ChangeNotifier {
  // Default hotspot IP of the Raspberry Pi
  final String _baseUrl = "http://10.42.0.1:8000/api/wifi";

  bool _isScanning = false;
  String _statusMessage = "Ready";
  List<WifiNetwork> _wifiNetworks = [];
  Map<String, dynamic> _lastStatus = {};

  bool get isScanning => _isScanning;
  String get statusMessage => _statusMessage;
  List<WifiNetwork> get wifiNetworks => _wifiNetworks;
  Map<String, dynamic> get lastStatus => _lastStatus;

  Future<void> loadWifiNetworks() async {
    _isScanning = true;
    _updateStatus("Scanning Wi-Fi networks...");
    notifyListeners();

    try {
      final response = await http.get(Uri.parse('$_baseUrl/scan'))
          .timeout(const Duration(seconds: 15));
          
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> networksJson = data['networks'] ?? [];
        _wifiNetworks = networksJson.map((e) => WifiNetwork.fromJson(e)).toList();
        _updateStatus("Found ${_wifiNetworks.length} networks");
      } else {
        _updateStatus("Failed to scan (Error ${response.statusCode})");
      }
    } catch (e) {
      _updateStatus("Connection failed. Are you connected to Hexapod-AP?");
    }

    _isScanning = false;
    notifyListeners();
  }

  Future<void> connectToWifi(String ssid, String password) async {
    _updateStatus("Sending credentials for $ssid...");
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/connect'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"ssid": ssid, "password": password}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _updateStatus("Credentials sent. Pi is connecting...");
        _startPollingStatus();
      } else {
        _updateStatus("Failed to send credentials.");
      }
    } catch (e) {
      _updateStatus("Error: $e");
    }
    notifyListeners();
  }

  void _startPollingStatus() {
    Future.delayed(const Duration(seconds: 3), () async {
      try {
        final response = await http.get(Uri.parse('$_baseUrl/status'))
            .timeout(const Duration(seconds: 5));
        
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          _lastStatus = data;
          
          if (data['status'] == 'connected') {
            _updateStatus("Connected! Pi IP: ${data['ip']}");
          } else if (data['status'] == 'error') {
            _updateStatus("Connection failed: ${data['message']}");
          } else {
            _updateStatus("Status: ${data['status']}...");
            _startPollingStatus(); // Continue polling
          }
        }
      } catch (e) {
        // If we get an error here, the Pi likely disconnected its hotspot 
        // to join the new network.
        _updateStatus("Hotspot disconnected. Checking if setup was successful...");
      }
      notifyListeners();
    });
  }

  void _updateStatus(String msg) {
    _statusMessage = msg;
    print(msg);
  }
}
