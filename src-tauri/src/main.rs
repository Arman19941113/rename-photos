// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_lib;
mod files_api;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            files_api::get_files_from_dir,
            files_api::get_files_from_paths,
            files_api::rename_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
