import subprocess
import sys
import os
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_DIR = ROOT / "backend"

frontend_proc: subprocess.Popen | None = None
backend_proc: subprocess.Popen | None = None


def _spawn(command: list[str], cwd: Path) -> subprocess.Popen:
  """Run a command in its own console on Windows, normal process elsewhere."""
  creationflags = 0
  if os.name == "nt":
    creationflags = subprocess.CREATE_NEW_CONSOLE  # type: ignore[attr-defined]
  return subprocess.Popen(
    command,
    cwd=str(cwd),
    shell=True,
    creationflags=creationflags,
  )


def start_frontend() -> None:
  global frontend_proc
  if frontend_proc is not None and frontend_proc.poll() is None:
    messagebox.showinfo("Frontend", "Frontend server is already running.")
    return
  if not FRONTEND_DIR.exists():
    messagebox.showerror("Error", f"Frontend folder not found:\n{FRONTEND_DIR}")
    return
  try:
    frontend_proc = _spawn(["npm", "run", "dev"], FRONTEND_DIR)
    status_frontend.set("Running")
  except Exception as e:
    messagebox.showerror("Error", f"Failed to start frontend:\n{e}")


def stop_frontend() -> None:
  global frontend_proc
  if frontend_proc is None or frontend_proc.poll() is not None:
    status_frontend.set("Stopped")
    return
  try:
    frontend_proc.terminate()
    frontend_proc.wait(timeout=5)
  except Exception:
    try:
      frontend_proc.kill()
    except Exception:
      pass
  finally:
    frontend_proc = None
    status_frontend.set("Stopped")


def start_backend() -> None:
  global backend_proc
  if backend_proc is not None and backend_proc.poll() is None:
    messagebox.showinfo("Backend", "Backend server is already running.")
    return
  if not BACKEND_DIR.exists():
    messagebox.showerror("Error", f"Backend folder not found:\n{BACKEND_DIR}")
    return
  try:
    backend_proc = _spawn(["npm", "run", "dev"], BACKEND_DIR)
    status_backend.set("Running")
  except Exception as e:
    messagebox.showerror("Error", f"Failed to start backend:\n{e}")


def stop_backend() -> None:
  global backend_proc
  if backend_proc is None or backend_proc.poll() is not None:
    status_backend.set("Stopped")
    return
  try:
    backend_proc.terminate()
    backend_proc.wait(timeout=5)
  except Exception:
    try:
      backend_proc.kill()
    except Exception:
      pass
  finally:
    backend_proc = None
    status_backend.set("Stopped")


def start_all() -> None:
  start_backend()
  start_frontend()


def stop_all() -> None:
  stop_backend()
  stop_frontend()


def restart_all() -> None:
  stop_all()
  start_all()


def build_backend() -> None:
  if not BACKEND_DIR.exists():
    messagebox.showerror("Error", f"Backend folder not found:\n{BACKEND_DIR}")
    return
  try:
    _spawn(["npm", "run", "build"], BACKEND_DIR)
  except Exception as e:
    messagebox.showerror("Error", f"Failed to run backend build:\n{e}")


def build_frontend() -> None:
  if not FRONTEND_DIR.exists():
    messagebox.showerror("Error", f"Frontend folder not found:\n{FRONTEND_DIR}")
    return
  try:
    _spawn(["npm", "run", "build"], FRONTEND_DIR)
  except Exception as e:
    messagebox.showerror("Error", f"Failed to run frontend build:\n{e}")


def build_all() -> None:
  build_backend()
  build_frontend()

def on_close() -> None:
  stop_all()
  root.destroy()


root = tk.Tk()
root.title("Bandwidth Server Manager")
root.resizable(False, False)

main_frame = ttk.Frame(root, padding=10)
main_frame.grid(row=0, column=0, sticky="nsew")

status_frontend = tk.StringVar(value="Stopped")
status_backend = tk.StringVar(value="Stopped")

# Frontend controls
ttk.Label(main_frame, text="Frontend (Vite)").grid(row=0, column=0, sticky="w", padx=(0, 8))
ttk.Label(main_frame, textvariable=status_frontend, width=8).grid(row=0, column=1, sticky="w")
ttk.Button(main_frame, text="Start", command=start_frontend).grid(row=0, column=2, padx=4)
ttk.Button(main_frame, text="Stop", command=stop_frontend).grid(row=0, column=3, padx=4)

# Backend controls
ttk.Label(main_frame, text="Backend (Express)").grid(row=1, column=0, sticky="w", padx=(0, 8), pady=(6, 0))
ttk.Label(main_frame, textvariable=status_backend, width=8).grid(row=1, column=1, sticky="w", pady=(6, 0))
ttk.Button(main_frame, text="Start", command=start_backend).grid(row=1, column=2, padx=4, pady=(6, 0))
ttk.Button(main_frame, text="Stop", command=stop_backend).grid(row=1, column=3, padx=4, pady=(6, 0))

# All controls
sep = ttk.Separator(main_frame, orient="horizontal")
sep.grid(row=2, column=0, columnspan=4, sticky="ew", pady=10)

ttk.Button(main_frame, text="Start ALL", command=start_all).grid(
  row=3, column=0, columnspan=2, sticky="ew", padx=(0, 4)
)
ttk.Button(main_frame, text="Stop ALL", command=stop_all).grid(
  row=3, column=2, columnspan=2, sticky="ew", padx=(4, 0)
)

ttk.Button(main_frame, text="Restart ALL", command=restart_all).grid(
  row=4, column=0, columnspan=4, sticky="ew", pady=(6, 0)
)

# Build controls
build_sep = ttk.Separator(main_frame, orient="horizontal")
build_sep.grid(row=5, column=0, columnspan=4, sticky="ew", pady=10)

ttk.Button(main_frame, text="Build Backend", command=build_backend).grid(
  row=6, column=0, columnspan=2, sticky="ew", padx=(0, 4)
)
ttk.Button(main_frame, text="Build Frontend", command=build_frontend).grid(
  row=6, column=2, columnspan=2, sticky="ew", padx=(4, 0)
)

ttk.Button(main_frame, text="Build ALL", command=build_all).grid(
  row=7, column=0, columnspan=4, sticky="ew", pady=(6, 0)
)

root.protocol("WM_DELETE_WINDOW", on_close)

if __name__ == "__main__":
  if not FRONTEND_DIR.exists() or not BACKEND_DIR.exists():
    messagebox.showerror(
      "Error",
      f"Expected folders not found:\n{FRONTEND_DIR}\n{BACKEND_DIR}\n\n"
      "Make sure this script lives in the 'bandwidth' folder next to 'frontend' and 'backend'.",
    )
    sys.exit(1)
  root.mainloop()

