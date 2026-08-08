import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../wifi_service.dart';

class WifiConfigScreen extends StatefulWidget {
  const WifiConfigScreen({Key? key}) : super(key: key);

  @override
  _WifiConfigScreenState createState() => _WifiConfigScreenState();
}

class _WifiConfigScreenState extends State<WifiConfigScreen> {
  final TextEditingController _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Start scanning as soon as the screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WifiService>().loadWifiNetworks();
    });
  }

  void _showPasswordDialog(BuildContext context, String ssid) {
    _passwordController.clear();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text("Connect to $ssid"),
          content: TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: "Wi-Fi Password",
              hintText: "Enter password",
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                final password = _passwordController.text;
                context.read<WifiService>().connectToWifi(ssid, password);
                Navigator.pop(context);
              },
              child: const Text("Connect"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Hexapod Wi-Fi Setup"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<WifiService>().loadWifiNetworks();
            },
          )
        ],
      ),
      body: Consumer<WifiService>(
        builder: (context, wifiService, child) {
          return Column(
            children: [
              // Status Header
              Container(
                padding: const EdgeInsets.all(16.0),
                color: Colors.blueGrey.shade900,
                width: double.infinity,
                child: Column(
                  children: [
                    Text(
                      wifiService.statusMessage,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                    if (wifiService.lastStatus.containsKey('ip') && 
                        wifiService.lastStatus['ip'] != null && 
                        wifiService.lastStatus['ip'].toString().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          "Pi IP Address: ${wifiService.lastStatus['ip']}",
                          style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
              ),
              
              if (wifiService.isScanning)
                const Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(),
                ),

              // Network List
              Expanded(
                child: wifiService.wifiNetworks.isEmpty && !wifiService.isScanning
                    ? const Center(
                        child: Text(
                          "No Wi-Fi networks found.\nEnsure you are connected to the 'Hexapod-AP' Wi-Fi Hotspot.",
                          textAlign: TextAlign.center,
                        ),
                      )
                    : ListView.builder(
                        itemCount: wifiService.wifiNetworks.length,
                        itemBuilder: (context, index) {
                          final network = wifiService.wifiNetworks[index];
                          final bool isSecure = network.security.isNotEmpty && network.security != "--";
                          
                          return ListTile(
                            leading: Icon(
                              isSecure ? Icons.wifi_lock : Icons.wifi,
                              color: Colors.blueAccent,
                            ),
                            title: Text(network.ssid),
                            subtitle: Text("Signal: ${network.signal}% | Security: ${network.security}"),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _showPasswordDialog(context, network.ssid),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
