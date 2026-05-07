use battery::{Manager as BatteryManager, State as BatteryState};
use default_net::interface::{Interface, InterfaceType};
use serde::Serialize;

const LOW_BATTERY_LEVEL_THRESHOLD: f32 = 0.2;

#[derive(Serialize)]
struct RuntimeContextSnapshot {
    network: &'static str,
    power: &'static str
}

#[tauri::command]
fn get_runtime_context_snapshot() -> RuntimeContextSnapshot {
    RuntimeContextSnapshot {
        network: detect_network_mode(),
        power: detect_power_mode()
    }
}

fn detect_network_mode() -> &'static str {
    match default_net::get_default_interface() {
        Ok(interface) => classify_network_mode(&interface),
        Err(_) => "mobile"
    }
}

fn classify_network_mode(interface: &Interface) -> &'static str {
    match interface.if_type {
        InterfaceType::Wireless80211
        | InterfaceType::Ethernet
        | InterfaceType::Ethernet3Megabit
        | InterfaceType::FastEthernetT
        | InterfaceType::FastEthernetFx
        | InterfaceType::GigabitEthernet => "wifi",
        InterfaceType::Wwanpp
        | InterfaceType::Wwanpp2
        | InterfaceType::Wman
        | InterfaceType::GenericModem
        | InterfaceType::Ppp => "mobile",
        _ => classify_network_mode_from_name(&interface.name)
    }
}

fn classify_network_mode_from_name(name: &str) -> &'static str {
    let lowered = name.to_ascii_lowercase();
    let mobile_tokens = ["wwan", "rmnet", "ccmni", "pdp_ip", "cell", "lte", "mobile", "modem"];
    if mobile_tokens.iter().any(|token| lowered.contains(token)) {
        return "mobile";
    }

    let wifi_tokens = ["wlan", "wifi", "wi-fi", "ether", "eth", "en", "lan"];
    if wifi_tokens.iter().any(|token| lowered.contains(token)) {
        return "wifi";
    }

    "mobile"
}

fn detect_power_mode() -> &'static str {
    let manager = match BatteryManager::new() {
        Ok(manager) => manager,
        Err(_) => return "battery"
    };

    let mut batteries = match manager.batteries() {
        Ok(batteries) => batteries,
        Err(_) => return "battery"
    };

    let mut has_battery = false;
    let mut has_low_battery = false;

    while let Some(result) = batteries.next() {
        let battery = match result {
            Ok(battery) => battery,
            Err(_) => continue
        };

        has_battery = true;
        if matches!(battery.state(), BatteryState::Charging | BatteryState::Full) {
            return "charging";
        }

        if battery.state_of_charge().value <= LOW_BATTERY_LEVEL_THRESHOLD {
            has_low_battery = true;
        }
    }

    if !has_battery {
        return "battery";
    }

    if has_low_battery {
        return "lowBattery";
    }

    "battery"
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![get_runtime_context_snapshot]);

    // TODO(plano-C): when feature `backend-sqlite` is on, register
    // tauri_plugin_sql here with the appropriate migrations.

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
