#!/usr/bin/env python3
"""
Formula 1 Telemetry Data Ingestion Script

This script uses FastF1 to download telemetry and lap data for a given F1 session
and populates a DuckDB database with the data.

Usage:
    python fetch_and_populate.py --year 2024 --event Belgium --session R
    python fetch_and_populate.py --year 2024 --event Belgium --session Q
"""

import argparse
import os
import sys
from pathlib import Path
import duckdb
import fastf1
import pandas as pd
from datetime import datetime

# Enable FastF1 cache for better performance
fastf1.Cache.enable_cache('../cache')

def create_tables(conn):
    """Create DuckDB tables if they don't exist."""
    print("Creating tables if they don't exist...")

    # Create telemetry table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY,
            driver TEXT,
            session TEXT,
            lap_number INTEGER,
            timestamp TIMESTAMP,
            speed DOUBLE,
            rpm DOUBLE,
            gear INTEGER,
            throttle DOUBLE
        )
    """)

    # Create lap_times table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS lap_times (
            id INTEGER PRIMARY KEY,
            driver TEXT,
            session TEXT,
            lap_number INTEGER,
            lap_time_seconds DOUBLE
        )
    """)

    # Create tires table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tires (
            id INTEGER PRIMARY KEY,
            driver TEXT,
            session TEXT,
            lap_number INTEGER,
            compound TEXT
        )
    """)

    print("Tables created successfully.")

def clear_existing_data(conn, session_name):
    """Clear existing data for the session to avoid duplicates."""
    print(f"Clearing existing data for session '{session_name}'...")

    conn.execute("DELETE FROM telemetry WHERE session = ?", [session_name])
    conn.execute("DELETE FROM lap_times WHERE session = ?", [session_name])
    conn.execute("DELETE FROM tires WHERE session = ?", [session_name])

    print(f"Cleared existing data for session '{session_name}'.")

def fetch_and_populate_session(year, event, session_identifier):
    """Fetch F1 session data and populate DuckDB."""

    # Map session identifier to session name
    session_map = {
        'R': 'Race',
        'Q': 'Qualifying',
        'Q1': 'Qualifying 1',
        'Q2': 'Qualifying 2',
        'Q3': 'Qualifying 3',
        'S': 'Sprint',
        'SQ': 'Sprint Qualifying',
        'FP1': 'Practice 1',
        'FP2': 'Practice 2',
        'FP3': 'Practice 3'
    }

    session_name = session_map.get(session_identifier, session_identifier)

    print(f"Fetching data for {year} {event} - {session_name}...")

    try:
        # Load the F1 session
        session = fastf1.get_session(year, event, session_name)
        session.load()

        print(f"Session loaded successfully. Found {len(session.drivers)} drivers.")

        # Connect to DuckDB
        db_path = Path("../duckdb/racing_data.db")
        db_path.parent.mkdir(exist_ok=True)

        conn = duckdb.connect(str(db_path))

        # Create tables
        create_tables(conn)

        # Clear existing data for this session
        clear_existing_data(conn, session_identifier)

        # Process each driver
        telemetry_data = []
        lap_times_data = []
        tires_data = []

        for driver in session.drivers:
            print(f"Processing driver: {driver}")

            try:
                # Get driver's laps
                driver_laps = session.laps.pick_driver(driver)

                if driver_laps.empty:
                    print(f"  No laps found for driver {driver}")
                    continue

                # Process each lap
                for lap_idx, lap in driver_laps.iterrows():
                    lap_number = lap['LapNumber']
                    lap_time = lap['LapTime']
                    tire_compound = lap['Compound'] if 'Compound' in lap else None

                    # Skip invalid laps
                    if pd.isna(lap_time) or lap_time.total_seconds() <= 0:
                        continue

                    # Add lap time data
                    lap_times_data.append({
                        'driver': driver,
                        'session': session_identifier,
                        'lap_number': int(lap_number),
                        'lap_time_seconds': lap_time.total_seconds()
                    })

                    # Add tire data if available
                    if tire_compound and not pd.isna(tire_compound):
                        tires_data.append({
                            'driver': driver,
                            'session': session_identifier,
                            'lap_number': int(lap_number),
                            'compound': str(tire_compound)
                        })

                    # Get telemetry data for this lap
                    try:
                        telemetry = lap.get_telemetry()

                        if not telemetry.empty:
                            # Sample telemetry data (every 10th point to reduce size)
                            telemetry_sample = telemetry.iloc[::10]

                            for tel_idx, tel in telemetry_sample.iterrows():
                                # Convert timestamp to datetime
                                timestamp = session.session_start_time + tel['Time']

                                telemetry_data.append({
                                    'driver': driver,
                                    'session': session_identifier,
                                    'lap_number': int(lap_number),
                                    'timestamp': timestamp,
                                    'speed': float(tel['Speed']) if not pd.isna(tel['Speed']) else 0.0,
                                    'rpm': float(tel['RPM']) if not pd.isna(tel['RPM']) else 0.0,
                                    'gear': int(tel['nGear']) if not pd.isna(tel['nGear']) else 0,
                                    'throttle': float(tel['Throttle']) if not pd.isna(tel['Throttle']) else 0.0
                                })
                    except Exception as e:
                        print(f"  Warning: Could not get telemetry for lap {lap_number}: {e}")
                        continue

                print(f"  Processed {len(driver_laps)} laps for driver {driver}")

            except Exception as e:
                print(f"  Error processing driver {driver}: {e}")
                continue

        # Insert data into DuckDB
        if lap_times_data:
            print(f"Inserting {len(lap_times_data)} lap time records...")
            lap_times_df = pd.DataFrame(lap_times_data)
            conn.execute("INSERT INTO lap_times (driver, session, lap_number, lap_time_seconds) SELECT * FROM lap_times_df")

        if tires_data:
            print(f"Inserting {len(tires_data)} tire records...")
            tires_df = pd.DataFrame(tires_data)
            conn.execute("INSERT INTO tires (driver, session, lap_number, compound) SELECT * FROM tires_df")

        if telemetry_data:
            print(f"Inserting {len(telemetry_data)} telemetry records...")
            telemetry_df = pd.DataFrame(telemetry_data)
            conn.execute("INSERT INTO telemetry (driver, session, lap_number, timestamp, speed, rpm, gear, throttle) SELECT * FROM telemetry_df")

        conn.close()

        print(f"✅ Successfully populated database with {year} {event} {session_name} data!")
        print(f"   - {len(lap_times_data)} lap times")
        print(f"   - {len(tires_data)} tire compounds")
        print(f"   - {len(telemetry_data)} telemetry points")

    except Exception as e:
        print(f"❌ Error fetching session data: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Fetch F1 telemetry data and populate DuckDB')
    parser.add_argument('--year', type=int, required=True, help='F1 season year (e.g., 2024)')
    parser.add_argument('--event', type=str, required=True, help='F1 event name (e.g., Belgium)')
    parser.add_argument('--session', type=str, required=True,
                       help='Session identifier (R=Race, Q=Qualifying, FP1/FP2/FP3=Practice)')

    args = parser.parse_args()

    print("🏁 F1 Telemetry Data Ingestion Script")
    print(f"Year: {args.year}")
    print(f"Event: {args.event}")
    print(f"Session: {args.session}")
    print("-" * 50)

    fetch_and_populate_session(args.year, args.event, args.session)

if __name__ == "__main__":
    main()
