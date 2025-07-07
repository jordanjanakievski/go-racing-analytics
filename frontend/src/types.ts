// API Response Types
export interface Race {
    race_id: string;
    name: string;
    circuit: string;
    date: string;
}

export interface Driver {
    code: string;
    name?: string;
}

export interface Lap {
    race_id: string;
    driver: string;
    session: string;
    lap_number: number;
    lap_time_seconds: number;
    compound: string;
}

export interface Telemetry {
    race_id: string;
    driver: string;
    session: string;
    lap_number: number;
    timestamp_seconds: number;
    speed: number;
    rpm: number;
    gear: number;
    throttle: number;
}

export interface Summary {
    race_id: string;
    driver: string;
    session: string;
    average_lap_time: number;
    fastest_lap_time: number;
    laps_completed: number;
}

// API Response Wrappers
export interface RacesResponse {
    races: Race[];
}

export interface DriversResponse {
    [key: string]: string; // Array of driver numbers as strings
}

export interface LapsResponse {
    [driverNumber: string]: Lap[];
}

export interface TelemetryResponse {
    [driverNumber: string]: Telemetry[];
}

export interface SummaryResponse {
    [driverNumber: string]: Summary;
}

// UI State Types
export interface DashboardState {
    selectedRace: string;
    session: string;
    selectedDrivers: string[];
    selectedLap: number;
    loading: boolean;
    error: string | null;
}

// Chart Data Types
export interface ChartDataPoint {
    x: number | string;
    y: number;
}

export interface DriverChartData {
    label: string;
    data: ChartDataPoint[];
    borderColor: string;
    backgroundColor: string;
    borderDash?: number[];
}

// Driver Colors for Charts
export const DRIVER_COLORS: { [key: string]: string } = {
    "1": "#0600EF", // Max Verstappen - Red Bull Blue
    "11": "#0600EF", // Sergio Perez - Red Bull Blue
    "44": "#00D2BE", // Lewis Hamilton - Mercedes Cyan
    "63": "#00D2BE", // George Russell - Mercedes Cyan
    "16": "#DC143C", // Charles Leclerc - Ferrari Red
    "55": "#DC143C", // Carlos Sainz - Ferrari Red
    "4": "#FF8700", // Lando Norris - McLaren Orange
    "81": "#FF8700", // Oscar Piastri - McLaren Orange
    "14": "#006F62", // Fernando Alonso - Aston Martin Green
    "18": "#006F62", // Lance Stroll - Aston Martin Green
    "10": "#FFC0CB", // Pierre Gasly - Alpine Pink
    "31": "#FFC0CB", // Esteban Ocon - Alpine Pink
    "77": "#00FF00", // Valtteri Bottas - Alfa Romeo Neon Green
    "24": "#00FF00", // Zhou Guanyu - Alfa Romeo Neon Green
    "20": "#005AFF", // Kevin Magnussen - Haas Blue
    "27": "#005AFF", // Nico Hulkenberg - Haas Blue
    "3": "#2B4562", // Liam Lawson - AlphaTauri Dark Blue
    "22": "#2B4562", // Yuki Tsunoda - AlphaTauri Dark Blue
    "21": "#2B4562", // Nyck de Vries - AlphaTauri Dark Blue
    "2": "#37BEDD", // Logan Sargeant - Williams Light Blue
    "23": "#37BEDD", // Alex Albon - Williams Light Blue
};

// Tire Compound Colors
export const TIRE_COLORS: { [key: string]: string } = {
    SOFT: "#FF3333",
    MEDIUM: "#e3cb7c",
    HARD: "#FFFFFF",
    INTERMEDIATE: "#00FF00",
    WET: "#0066FF",
    UNKNOWN: "#888888",
};

// Utility Types
export type SessionType = "R" | "Q";
export type TelemetryMetric = "speed" | "rpm" | "gear" | "throttle";
