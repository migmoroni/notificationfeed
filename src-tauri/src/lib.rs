pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init());

    // TODO(plano-C): when feature `backend-sqlite` is on, register
    // tauri_plugin_sql here with the appropriate migrations.

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
