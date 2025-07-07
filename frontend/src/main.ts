// Main TypeScript application for F1 Racing Analytics Dashboard

import "./styles/dashboard.css";

import type {
    DashboardState,
    LapsResponse,
    TelemetryResponse,
    SummaryResponse,
    Race,
} from "./types";
import {
    getDrivers,
    getLaps,
    getTelemetry,
    getSummary,
    getRaces,
    checkApiHealth,
    getDriverDisplayName,
    ApiError,
} from "./utils/api";
import {
    createLapTimesChart,
    createTelemetryChart,
    createDriverLegend,
    createSummaryStatsHTML,
    destroyChart,
    Chart,
} from "./utils/charts";

class F1Dashboard {
    private state: DashboardState = {
        selectedRace: "",
        session: "R",
        selectedDrivers: [],
        selectedLap: 1,
        loading: false,
        error: null,
    };

    private charts: { [key: string]: Chart } = {};

    constructor() {
        this.initializeEventListeners();
        this.initializeDashboard();
    }

    private initializeEventListeners(): void {
        // Race selector
        const raceSelect = document.getElementById(
            "race-select",
        ) as HTMLSelectElement;
        if (raceSelect) {
            raceSelect.addEventListener("change", (e) => {
                this.state.selectedRace = (e.target as HTMLSelectElement).value;
                this.loadDrivers();
            });
        }

        // Session selector (radio buttons)
        const sessionInputs = document.querySelectorAll(
            'input[name="session"]',
        ) as NodeListOf<HTMLInputElement>;
        sessionInputs.forEach((input) => {
            input.addEventListener("change", (e) => {
                this.state.session = (e.target as HTMLInputElement).value;
                this.loadDrivers();
            });
        });

        // Load data button
        const loadDataBtn = document.getElementById(
            "load-data-btn",
        ) as HTMLButtonElement;
        loadDataBtn.addEventListener("click", () => {
            this.loadDashboardData();
        });

        // Lap selector
        const lapSelect = document.getElementById(
            "lap-select",
        ) as HTMLSelectElement;
        lapSelect.addEventListener("change", (e) => {
            this.state.selectedLap =
                parseInt((e.target as HTMLSelectElement).value) || 1;
        });

        // Driver selector (multiple)
        const driverSelect = document.getElementById(
            "driver-select",
        ) as HTMLSelectElement;
        driverSelect.addEventListener("change", (e) => {
            const selectedOptions = Array.from(e.target as HTMLSelectElement)
                .filter((option) => (option as HTMLOptionElement).selected)
                .map((option) => (option as HTMLOptionElement).value)
                .filter((value) => value !== "");

            this.state.selectedDrivers = selectedOptions;
        });
    }

    private async initializeDashboard(): Promise<void> {
        this.showLoading();

        try {
            // Check if API is available
            const apiHealthy = await checkApiHealth();
            if (!apiHealthy) {
                throw new Error(
                    "Unable to connect to API. Please ensure the Go backend is running on port 8080.",
                );
            }

            // Load races into race selector
            const raceSelect = document.getElementById(
                "race-select",
            ) as HTMLSelectElement;
            if (raceSelect) {
                const races = await getRaces();
                this.populateRaceSelect(races);
            }

            // Don't load drivers until a race is selected
            this.hideLoading();
        } catch (error) {
            this.showError(
                error instanceof Error
                    ? error.message
                    : "Failed to initialize dashboard",
            );
        }
    }

    private async loadDrivers(): Promise<void> {
        try {
            if (!this.state.selectedRace) {
                // Clear the driver select if no race is selected
                this.populateDriverSelect([]);
                return;
            }
            const drivers = await getDrivers(
                this.state.selectedRace,
                this.state.session,
            );
            // Sort drivers by number in ascending order
            const sortedDrivers = drivers.sort(
                (a, b) => parseInt(a) - parseInt(b),
            );
            this.populateDriverSelect(sortedDrivers);
        } catch (error) {
            console.error("Failed to load drivers:", error);
            this.showError("Failed to load drivers");
        }
    }

    private populateRaceSelect(races: Race[]): void {
        const raceSelect = document.getElementById(
            "race-select",
        ) as HTMLSelectElement;
        raceSelect.innerHTML = "";

        // Add placeholder option
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose a race...";
        placeholder.disabled = true;
        placeholder.selected = true;
        raceSelect.appendChild(placeholder);

        // Add race options
        races.forEach((race) => {
            const option = document.createElement("option");
            option.value = race.race_id;
            option.textContent = `${race.name} (${race.circuit})`;
            raceSelect.appendChild(option);
        });
    }

    private populateDriverSelect(drivers: string[]): void {
        const driverSelect = document.getElementById(
            "driver-select",
        ) as HTMLSelectElement;
        driverSelect.innerHTML = "";

        drivers.forEach((driverNumber) => {
            const option = document.createElement("option");
            option.value = driverNumber;
            option.textContent = `#${driverNumber} ${getDriverDisplayName(driverNumber)}`;
            driverSelect.appendChild(option);
        });

        // Auto-select first few drivers for better UX
        if (drivers.length > 0) {
            const selectCount = Math.min(3, drivers.length);
            for (let i = 0; i < selectCount; i++) {
                driverSelect.options[i].selected = true;
            }
            this.state.selectedDrivers = drivers.slice(0, selectCount);
        }
    }

    private populateLapSelect(lapsData: LapsResponse): void {
        const lapSelect = document.getElementById(
            "lap-select",
        ) as HTMLSelectElement;
        lapSelect.innerHTML = "";

        // Get all unique lap numbers from all drivers
        const allLaps = new Set<number>();
        Object.values(lapsData).forEach((driverLaps) => {
            driverLaps.forEach((lap) => {
                allLaps.add(lap.lap_number);
            });
        });

        // Sort lap numbers and populate dropdown
        const sortedLaps = Array.from(allLaps).sort((a, b) => a - b);
        sortedLaps.forEach((lapNumber) => {
            const option = document.createElement("option");
            option.value = lapNumber.toString();
            option.textContent = `Lap ${lapNumber}`;
            lapSelect.appendChild(option);
        });

        // Set current selection or default to first lap
        if (sortedLaps.includes(this.state.selectedLap)) {
            lapSelect.value = this.state.selectedLap.toString();
        } else if (sortedLaps.length > 0) {
            lapSelect.value = sortedLaps[0].toString();
            this.state.selectedLap = sortedLaps[0];
        }
    }

    private async loadDashboardData(): Promise<void> {
        if (!this.state.selectedRace) {
            this.showError("Please select a race");
            return;
        }
        if (this.state.selectedDrivers.length === 0) {
            this.showError("Please select at least one driver");
            return;
        }

        this.showLoading();
        this.clearError();

        try {
            // Load all data in parallel
            if (!this.state.selectedRace) {
                throw new Error("Please select a race first");
            }

            const [lapsData, telemetryData, summaryData] = await Promise.all([
                getLaps(
                    this.state.selectedRace,
                    this.state.selectedDrivers,
                    this.state.session,
                ),
                getTelemetry(
                    this.state.selectedRace,
                    this.state.selectedDrivers,
                    this.state.selectedLap,
                    this.state.session,
                ),
                getSummary(
                    this.state.selectedRace,
                    this.state.selectedDrivers,
                    this.state.session,
                ),
            ]);

            // Update lap selector with available laps
            this.populateLapSelect(lapsData);

            // Update charts
            this.updateLapTimesChart(lapsData);
            this.updateTelemetryChart(telemetryData);
            this.updateSummaryStats(summaryData);
            this.updateTireStrategyChart(lapsData);

            // Update legends
            this.updateDriverLegends();

            this.hideLoading();
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            this.showError(
                error instanceof ApiError
                    ? error.message
                    : "Failed to load dashboard data",
            );
        }
    }

    private updateLapTimesChart(lapsData: LapsResponse): void {
        const canvasId = "lap-times-chart";
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) return;

        // Destroy existing chart
        destroyChart(canvasId);

        // Create new chart
        const config = createLapTimesChart(lapsData);
        this.charts[canvasId] = new Chart(canvas, config);
    }

    private updateTelemetryChart(telemetryData: TelemetryResponse): void {
        const canvasId = "telemetry-chart";
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) return;

        // Update telemetry chart title to show current lap
        const telemetryTitle = document.querySelector(".chart-container h3");
        if (
            telemetryTitle &&
            telemetryTitle.textContent?.includes("Telemetry Data")
        ) {
            telemetryTitle.textContent = `Telemetry Data - Lap ${this.state.selectedLap}`;
        }

        // Destroy existing chart
        destroyChart(canvasId);

        // Create new chart (default to speed)
        const config = createTelemetryChart(telemetryData, "speed");
        this.charts[canvasId] = new Chart(canvas, config);
    }

    private updateSummaryStats(summaryData: SummaryResponse): void {
        const container = document.getElementById("summary-stats");
        if (!container) return;

        const statsHTML = createSummaryStatsHTML(summaryData);
        container.innerHTML = statsHTML;
    }

    private updateTireStrategyChart(lapsData: LapsResponse): void {
        const canvasId = "tire-chart";
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) return;

        // Destroy existing chart
        destroyChart(canvasId);

        // Create a simple bar chart showing tire compounds per driver
        const datasets: any[] = [];
        const labels: string[] = [];

        Object.entries(lapsData).forEach(([driverNumber, laps]) => {
            const driverLabel = `#${driverNumber}`;
            if (!labels.includes(driverLabel)) {
                labels.push(driverLabel);
            }

            // Count tire compounds
            const compoundCounts: { [key: string]: number } = {};
            laps.forEach((lap) => {
                const compound = lap.compound || "UNKNOWN";
                compoundCounts[compound] = (compoundCounts[compound] || 0) + 1;
            });

            // Create dataset for each compound
            Object.entries(compoundCounts).forEach(([compound, count]) => {
                let dataset = datasets.find((d) => d.label === compound);
                if (!dataset) {
                    dataset = {
                        label: compound,
                        data: [],
                        backgroundColor: this.getTireColor(compound),
                        borderColor: "#000000",
                        borderWidth: 2,
                    };
                    datasets.push(dataset);
                }
                dataset.data.push({ x: driverLabel, y: count });
            });
        });

        const config = {
            type: "bar" as const,
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: "#333",
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        titleColor: "#333",
                        bodyColor: "#333",
                        borderColor: "#e10600",
                        borderWidth: 1,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Driver",
                            color: "#333",
                        },
                        ticks: {
                            color: "#495057",
                        },
                        grid: {
                            color: "#e9ecef",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Number of Laps",
                            color: "#333",
                        },
                        ticks: {
                            color: "#495057",
                        },
                        grid: {
                            color: "#e9ecef",
                        },
                    },
                },
            },
        };

        this.charts[canvasId] = new Chart(canvas, config);
    }

    private getTireColor(compound: string): string {
        const colors: { [key: string]: string } = {
            SOFT: "#FF3333",
            MEDIUM: "#FFFF00",
            HARD: "#FFFFFF",
            INTERMEDIATE: "#00FF00",
            WET: "#0066FF",
            UNKNOWN: "#888888",
        };
        return colors[compound] || "#888888";
    }

    private updateDriverLegends(): void {
        const legendElements = [
            "lap-times-legend",
            "telemetry-legend",
            "tire-legend",
        ];

        legendElements.forEach((elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = createDriverLegend(
                    this.state.selectedDrivers,
                );
            }
        });
    }

    private showLoading(): void {
        this.state.loading = true;
        const loadBtn = document.getElementById(
            "load-data-btn",
        ) as HTMLButtonElement;
        if (loadBtn) {
            loadBtn.disabled = true;
            loadBtn.textContent = "Loading...";
        }
    }

    private hideLoading(): void {
        this.state.loading = false;
        const loadBtn = document.getElementById(
            "load-data-btn",
        ) as HTMLButtonElement;
        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.textContent = "Load Data";
        }
    }

    private showError(message: string): void {
        this.state.error = message;
        console.error("Dashboard Error:", message);

        // Show error in UI
        const errorDiv = document.createElement("div");
        errorDiv.className = "error";
        errorDiv.textContent = `Error: ${message}`;

        // Insert error at the top of dashboard
        const dashboard = document.querySelector(".dashboard");
        if (dashboard) {
            dashboard.insertBefore(errorDiv, dashboard.firstChild);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }

        this.hideLoading();
    }

    private clearError(): void {
        this.state.error = null;
        // Remove existing error messages
        document.querySelectorAll(".error").forEach((el) => el.remove());
    }

    // Public method to update telemetry metric
    public updateTelemetryMetric(
        metric: "speed" | "rpm" | "gear" | "throttle",
    ): void {
        if (this.state.selectedDrivers.length === 0) return;

        getTelemetry(
            this.state.selectedRace,
            this.state.selectedDrivers,
            this.state.selectedLap,
            this.state.session,
        )
            .then((telemetryData) => {
                const canvasId = "telemetry-chart";
                const canvas = document.getElementById(
                    canvasId,
                ) as HTMLCanvasElement;

                if (!canvas) return;

                destroyChart(canvasId);
                const config = createTelemetryChart(telemetryData, metric);
                this.charts[canvasId] = new Chart(canvas, config);
            })
            .catch((error) => {
                console.error("Failed to update telemetry chart:", error);
                this.showError("Failed to update telemetry chart");
            });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const dashboard = new F1Dashboard();

    // Make dashboard globally available for debugging
    (window as any).dashboard = dashboard;
});

// Add telemetry metric selector
document.addEventListener("DOMContentLoaded", () => {
    const telemetryContainer = document.querySelector(".chart-container h3");
    if (
        telemetryContainer &&
        (telemetryContainer.textContent === "Telemetry Data" ||
            telemetryContainer.textContent?.includes("Telemetry Data"))
    ) {
        const metricSelect = document.createElement("select");
        metricSelect.id = "telemetry-metric-select";
        metricSelect.innerHTML = `
      <option value="speed">Speed</option>
      <option value="rpm">RPM</option>
      <option value="gear">Gear</option>
      <option value="throttle">Throttle</option>
    `;
        metricSelect.style.marginLeft = "1rem";
        metricSelect.style.fontSize = "0.9rem";

        metricSelect.addEventListener("change", (e) => {
            const metric = (e.target as HTMLSelectElement).value as
                | "speed"
                | "rpm"
                | "gear"
                | "throttle";
            if ((window as any).dashboard) {
                (window as any).dashboard.updateTelemetryMetric(metric);
            }
        });

        telemetryContainer.appendChild(metricSelect);
    }
});
