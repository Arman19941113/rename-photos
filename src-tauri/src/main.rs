// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::file::get_files_from_dir,
            commands::file::get_files_from_paths,
            commands::file::rename_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
