#!/usr/bin/env python3
"""
Setup script for F1 telemetry data ingestion dependencies.

This script installs the required Python packages for the ingestion pipeline.
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python dependencies from requirements.txt."""
    requirements_file = os.path.join(os.path.dirname(__file__), 'requirements.txt')

    if not os.path.exists(requirements_file):
        print("❌ requirements.txt not found!")
        sys.exit(1)

    print("📦 Installing Python dependencies...")

    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', requirements_file
        ])
        print("✅ All dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def create_cache_dir():
    """Create cache directory for FastF1."""
    cache_dir = os.path.join(os.path.dirname(__file__), '..', 'cache')
    os.makedirs(cache_dir, exist_ok=True)
    print(f"📁 Created cache directory: {cache_dir}")

def main():
    print("🏁 F1 Telemetry Ingestion Setup")
    print("-" * 40)

    install_requirements()
    create_cache_dir()

    print("\n🎯 Setup complete!")
    print("You can now run the ingestion script:")
    print("python fetch_and_populate.py --year 2024 --event Belgium --session R")

if __name__ == "__main__":
    main()
