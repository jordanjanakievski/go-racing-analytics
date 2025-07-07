// API utility functions for communicating with the Go backend

import type {
    DriversResponse,
    LapsResponse,
    TelemetryResponse,
    SummaryResponse,
    Race,
} from "../types";

const API_BASE_URL = "http://localhost:8080/api";

class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// Generic fetch wrapper with error handling
async function apiRequest<T>(url: string): Promise<T> {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                errorData.error ||
                    `HTTP ${response.status}: ${response.statusText}`,
                response.status,
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            error instanceof Error ? error.message : "Unknown error occurred",
        );
    }
}

// Build query string from parameters
function buildQueryString(
    params: Record<string, string | number | string[]>,
): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            searchParams.append(key, value.join(","));
        } else {
            searchParams.append(key, value.toString());
        }
    });

    return searchParams.toString();
}

// API Functions

/**
 * Get all available races
 */
export async function getRaces(): Promise<Race[]> {
    const response = await apiRequest<Race[]>(`${API_BASE_URL}/races`);
    return response;
}

/**
 * Get all available drivers for a race and session
 */
export async function getDrivers(
    raceId: string,
    session: string,
): Promise<string[]> {
    const queryString = buildQueryString({ race_id: raceId, session });
    const response = await apiRequest<string[]>(
        `${API_BASE_URL}/drivers?${queryString}`,
    );
    return response;
}

/**
 * Get lap data for specific drivers in a session
 */
export async function getLaps(
    raceId: string,
    drivers: string[],
    session: string,
): Promise<LapsResponse> {
    const queryString = buildQueryString({ race_id: raceId, drivers, session });
    const response = await apiRequest<LapsResponse>(
        `${API_BASE_URL}/laps?${queryString}`,
    );
    return response;
}

/**
 * Get telemetry data for specific drivers and lap in a session
 */
export async function getTelemetry(
    raceId: string,
    drivers: string[],
    lapNumber: number,
    session: string,
): Promise<TelemetryResponse> {
    const queryString = buildQueryString({
        race_id: raceId,
        drivers,
        lap_number: lapNumber,
        session,
    });
    const response = await apiRequest<TelemetryResponse>(
        `${API_BASE_URL}/telemetry?${queryString}`,
    );
    return response;
}

/**
 * Get summary statistics for specific drivers in a session
 */
export async function getSummary(
    raceId: string,
    drivers: string[],
    session: string,
): Promise<SummaryResponse> {
    const queryString = buildQueryString({ race_id: raceId, drivers, session });
    const response = await apiRequest<SummaryResponse>(
        `${API_BASE_URL}/summary?${queryString}`,
    );
    return response;
}

// Utility function to format lap time for display
export function formatLapTime(seconds: number): string {
    if (seconds <= 0) return "--:---.---";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
    } else {
        return `${remainingSeconds.toFixed(3)}s`;
    }
}

// Utility function to get driver display name
export function getDriverDisplayName(driverNumber: string): string {
    const driverNames: { [key: string]: string } = {
        "1": "Max Verstappen",
        "11": "Sergio Perez",
        "44": "Lewis Hamilton",
        "63": "George Russell",
        "16": "Charles Leclerc",
        "55": "Carlos Sainz",
        "4": "Lando Norris",
        "81": "Oscar Piastri",
        "14": "Fernando Alonso",
        "18": "Lance Stroll",
        "10": "Pierre Gasly",
        "31": "Esteban Ocon",
        "77": "Valtteri Bottas",
        "24": "Zhou Guanyu",
        "20": "Kevin Magnussen",
        "27": "Nico Hulkenberg",
        "3": "Liam Lawson",
        "22": "Yuki Tsunoda",
        "21": "Nyck de Vries",
        "2": "Logan Sargeant",
        "23": "Alex Albon",
    };

    return driverNames[driverNumber] || `Driver #${driverNumber}`;
}

// Utility function to check if API is available
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/races`);
        return response.ok;
    } catch {
        return false;
    }
}

export { ApiError };
