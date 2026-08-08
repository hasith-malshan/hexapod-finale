import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';

class Esp32Service {
  Socket? _socket;
  final _connectionController = StreamController<bool>.broadcast();
  final _responseController = StreamController<String>.broadcast();

  // Line buffer to reassemble fragmented TCP data
  String _lineBuffer = '';

  // Auto-reconnect state
  String? _lastIp;
  int? _lastPort;
  Timer? _reconnectTimer;
  bool _intentionalDisconnect = false;

  Stream<bool> get connectionStream => _connectionController.stream;
  Stream<String> get responseStream => _responseController.stream;
  bool get isConnected => _socket != null;

  Future<bool> connect(String ip, int port) async {
    // Cancel any pending reconnect
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _intentionalDisconnect = false;

    // Store for auto-reconnect
    _lastIp = ip;
    _lastPort = port;

    try {
      debugPrint('Connecting to $ip:$port...');
      _socket = await Socket.connect(ip, port,
          timeout: const Duration(seconds: 5));
      debugPrint('Connected');

      // Reset line buffer on new connection
      _lineBuffer = '';

      _socket!.listen(
        (data) {
          // Accumulate raw bytes into line buffer, emit only complete lines
          _lineBuffer += String.fromCharCodes(data);
          while (_lineBuffer.contains('\n')) {
            final newlineIdx = _lineBuffer.indexOf('\n');
            final line = _lineBuffer.substring(0, newlineIdx).trim();
            _lineBuffer = _lineBuffer.substring(newlineIdx + 1);
            if (line.isNotEmpty) {
              debugPrint('Received: $line');
              _responseController.add(line);
            }
          }
        },
        onError: (error) {
          debugPrint('Socket error: $error');
          _handleDisconnect();
        },
        onDone: () {
          debugPrint('Socket closed by ESP32');
          _handleDisconnect();
        },
      );

      _connectionController.add(true);
      return true;
    } catch (e) {
      debugPrint('Connection failed: $e');
      _scheduleReconnect();
      return false;
    }
  }

  void _handleDisconnect() {
    _socket?.destroy();
    _socket = null;
    _lineBuffer = '';
    _connectionController.add(false);
    if (!_intentionalDisconnect) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_intentionalDisconnect || _lastIp == null || _lastPort == null) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 2), () {
      debugPrint('Auto-reconnecting...');
      connect(_lastIp!, _lastPort!);
    });
  }

  void disconnect() {
    _intentionalDisconnect = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _socket?.destroy();
    _socket = null;
    _lineBuffer = '';
    _connectionController.add(false);
  }

  void send(String command) {
    if (_socket != null) {
      try {
        _socket!.write("$command\n");
      } catch (e) {
        debugPrint('Send failed: $e');
        _handleDisconnect();
      }
    }
  }

  void dispose() {
    _intentionalDisconnect = true;
    _reconnectTimer?.cancel();
    _connectionController.close();
    _responseController.close();
    disconnect();
  }
}
