// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct SidecarState(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Get the sidecar directory from resources
            let resource_path = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir");

            let sidecar_dir = resource_path.join("sidecar");
            let sidecar_script = sidecar_dir.join("dist").join("index.js");

            // Check if sidecar exists
            if sidecar_script.exists() {
                // Start Node.js Sidecar
                match Command::new("node")
                    .arg(&sidecar_script)
                    .current_dir(&sidecar_dir)
                    .spawn()
                {
                    Ok(child) => {
                        println!("Sidecar started with PID: {}", child.id());
                        app.manage(SidecarState(Mutex::new(Some(child))));
                    }
                    Err(e) => {
                        eprintln!("Failed to start sidecar: {}", e);
                        // Continue without sidecar for development
                    }
                }
            } else {
                println!("Sidecar not found at {:?}, running in dev mode", sidecar_script);
                // In development, sidecar runs separately
                app.manage(SidecarState(Mutex::new(None)));
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Cleanup sidecar on window close
                if let Some(state) = window.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            println!("Stopping sidecar...");
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
