// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file;

#[tauri::command]
fn read_dir(dir_path: &str) -> Result<Vec<file::FileInfo>, String> {
  println!("command read_dir: {}", dir_path);
  file::get_files_from_dir(dir_path).map_err(|e| e.to_string())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![read_dir])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
