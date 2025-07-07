// Chart utility functions for Chart.js setup and data formatting

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarElement,
    ScatterController,
    LineController,
    BarController,
} from "chart.js";

import type {
    ChartConfiguration,
    ChartData,
    ChartOptions,
    TooltipItem,
    ScriptableContext,
} from "chart.js";

import type {
    Lap,
    Telemetry,
    Summary,
    LapsResponse,
    TelemetryResponse,
    DriverChartData,
    TelemetryMetric,
    ChartDataset,
} from "../types";

import { DRIVER_COLORS, TIRE_COLORS } from "../types";
import { formatLapTime, getDriverDisplayName } from "./api";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ScatterController,
    LineController,
    BarController,
);

// Common chart options
const commonChartOptions: Partial<ChartOptions> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false, // We'll use custom legends
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
            ticks: {
                color: "#495057",
            },
            grid: {
                color: "#e9ecef",
            },
        },
        y: {
            ticks: {
                color: "#495057",
            },
            grid: {
                color: "#e9ecef",
            },
        },
    },
};

// Create lap times chart data
export function createLapTimesChartData(
    lapsData: LapsResponse,
): ChartData<"line"> {
    const datasets: DriverChartData[] = [];
    const teamColors = new Map<string, string[]>();

    // Group drivers by team color
    Object.entries(lapsData).forEach(([driverNumber]) => {
        const driverColor = DRIVER_COLORS[driverNumber] || "#888888";
        const driversWithColor = teamColors.get(driverColor) || [];
        driversWithColor.push(driverNumber);
        teamColors.set(driverColor, driversWithColor);
    });

    Object.entries(lapsData).forEach(([driverNumber, laps]) => {
        const driverColor = DRIVER_COLORS[driverNumber] || "#888888";
        const teamDrivers = teamColors.get(driverColor) || [];
        const isDashed =
            teamDrivers.length > 1 && teamDrivers[1] === driverNumber;

        const data = laps.map((lap) => ({
            x: lap.lap_number,
            y: lap.lap_time_seconds,
        }));

        console.log(`Driver ${driverNumber} lap data:`, data);

        datasets.push({
            label: `#${driverNumber} ${getDriverDisplayName(driverNumber)}`,
            data,
            borderColor: driverColor,
            backgroundColor: driverColor + "20",
            borderDash: isDashed ? [5, 5] : [],
        });
    });

    return {
        datasets: datasets.map((dataset) => ({
            ...dataset,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
        })),
    };
}

// Create lap times chart configuration
export function createLapTimesChart(
    lapsData: LapsResponse,
): ChartConfiguration<"line"> {
    console.log("Lap data for chart:", lapsData);
    return {
        type: "line",
        data: createLapTimesChartData(lapsData),
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins?.tooltip,
                    callbacks: {
                        label: (context: TooltipItem<"line">) => {
                            const driverNumber =
                                context.dataset.label
                                    ?.split(" ")[0]
                                    .replace("#", "") || "";
                            const lapTime = context.parsed.y;
                            return `${getDriverDisplayName(driverNumber)}: ${formatLapTime(lapTime)}`;
                        },
                    },
                },
            },
            scales: {
                ...commonChartOptions.scales,
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "Lap Number",
                        color: "#333",
                    },
                    ticks: {
                        stepSize: 1,
                        color: "#495057",
                    },
                    grid: {
                        color: "#e9ecef",
                    },
                },
                y: {
                    ...commonChartOptions.scales?.y,
                    title: {
                        display: true,
                        text: "Lap Time (seconds)",
                        color: "#333",
                    },
                    ticks: {
                        ...commonChartOptions.scales?.y?.ticks,
                        callback: (value: any) => formatLapTime(value),
                    },
                },
            },
        },
    };
}

// Create telemetry chart data
export function createTelemetryChartData(
    telemetryData: TelemetryResponse,
    metric: TelemetryMetric,
): ChartData<"line"> {
    const datasets: DriverChartData[] = [];
    const teamColors = new Map<string, string[]>();

    // Group drivers by team color
    Object.entries(telemetryData).forEach(([driverNumber]) => {
        const driverColor = DRIVER_COLORS[driverNumber] || "#888888";
        const driversWithColor = teamColors.get(driverColor) || [];
        driversWithColor.push(driverNumber);
        teamColors.set(driverColor, driversWithColor);
    });

    Object.entries(telemetryData).forEach(([driverNumber, telemetry]) => {
        const driverColor = DRIVER_COLORS[driverNumber] || "#888888";
        const teamDrivers = teamColors.get(driverColor) || [];
        const isDashed =
            teamDrivers.length > 1 && teamDrivers[1] === driverNumber;

        const data = telemetry.map((point) => ({
            x: point.timestamp_seconds,
            y: point[metric],
        }));

        console.log(`Driver ${driverNumber} telemetry data:`, data);

        datasets.push({
            label: `#${driverNumber} ${getDriverDisplayName(driverNumber)}`,
            data,
            borderColor: driverColor,
            backgroundColor: driverColor + "20",
            borderDash: isDashed ? [5, 5] : [],
        });
    });

    return {
        datasets: datasets.map((dataset) => ({
            ...dataset,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 3,
        })),
    };
}

// Create telemetry chart configuration
export function createTelemetryChart(
    telemetryData: TelemetryResponse,
    metric: TelemetryMetric = "speed",
): ChartConfiguration<"line"> {
    const metricLabels = {
        speed: "Speed (km/h)",
        rpm: "RPM",
        gear: "Gear",
        throttle: "Throttle (%)",
    };

    console.log("Telemetry data for chart:", telemetryData);

    return {
        type: "line",
        data: createTelemetryChartData(telemetryData, metric),
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                tooltip: {
                    ...commonChartOptions.plugins?.tooltip,
                    callbacks: {
                        label: (context: TooltipItem<"line">) => {
                            const driverNumber =
                                context.dataset.label
                                    ?.split(" ")[0]
                                    .replace("#", "") || "";
                            const value = context.parsed.y;
                            let formattedValue = value.toFixed(1);

                            if (metric === "gear") {
                                formattedValue = Math.round(value).toString();
                            }

                            return `${getDriverDisplayName(driverNumber)}: ${formattedValue}`;
                        },
                    },
                },
            },
            scales: {
                ...commonChartOptions.scales,
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "Time (seconds)",
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
                    ...commonChartOptions.scales?.y,
                    title: {
                        display: true,
                        text: metricLabels[metric],
                        color: "#333",
                    },
                },
            },
        },
    };
}

// Create tire strategy chart data
export function createTireStrategyChartData(
    lapsData: LapsResponse,
): ChartData<"bar"> {
    const datasets: any[] = [];
    const compounds = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];

    Object.entries(lapsData).forEach(([driverNumber, laps]) => {
        compounds.forEach((compound) => {
            const compoundLaps = laps.filter(
                (lap) => lap.compound === compound,
            );

            if (compoundLaps.length > 0) {
                const data = compoundLaps.map((lap) => ({
                    x: `#${driverNumber}`,
                    y: lap.lap_number,
                    compound: compound,
                    lapTime: lap.lap_time_seconds,
                }));

                datasets.push({
                    label: compound,
                    data,
                    backgroundColor: TIRE_COLORS[compound] || "#888888",
                    borderColor: TIRE_COLORS[compound] || "#888888",
                    borderWidth: 1,
                });
            }
        });
    });

    return { datasets };
}

// Create driver legend HTML
export function createDriverLegend(driverNumbers: string[]): string {
    // Group drivers by team color
    const teamColors = new Map<string, string[]>();
    driverNumbers.forEach((driverNumber) => {
        const driverColor = DRIVER_COLORS[driverNumber] || "#888888";
        const driversWithColor = teamColors.get(driverColor) || [];
        driversWithColor.push(driverNumber);
        teamColors.set(driverColor, driversWithColor);
    });

    return driverNumbers
        .map((driverNumber) => {
            const color = DRIVER_COLORS[driverNumber] || "#888888";
            const name = getDriverDisplayName(driverNumber);
            const teamDrivers = teamColors.get(color) || [];
            const isDashed =
                teamDrivers.length > 1 && teamDrivers[1] === driverNumber;
            const lineStyle = isDashed ? "dashed" : "solid";

            return `
      <div class="driver-item">
        <div class="driver-color" style="border-color: ${color}; border-style: ${lineStyle}"></div>
        <span>#${driverNumber} ${name}</span>
      </div>
    `;
        })
        .join("");
}

// Create summary statistics HTML
export function createSummaryStatsHTML(
    summaryData: Record<string, Summary>,
): string {
    const stats = Object.entries(summaryData)
        .map(([driverNumber, summary]) => {
            const driverName = getDriverDisplayName(driverNumber);
            const color = DRIVER_COLORS[driverNumber] || "#888888";

            return `
      <div class="stat-card" style="border-left: 4px solid ${color}">
        <div class="stat-label">#${driverNumber} ${driverName}</div>
        <div class="stat-value">${formatLapTime(summary.fastest_lap_time)}</div>
        <div class="stat-label">Fastest Lap</div>
        <div class="stat-value">${formatLapTime(summary.average_lap_time)}</div>
        <div class="stat-label">Average Lap</div>
        <div class="stat-value">${summary.laps_completed}</div>
        <div class="stat-label">Laps Completed</div>
      </div>
    `;
        })
        .join("");

    return stats;
}

// Utility function to get chart by ID
export function getChartById(id: string): ChartJS | null {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return null;

    return ChartJS.getChart(canvas) || null;
}

// Utility function to destroy chart if exists
export function destroyChart(id: string): void {
    const chart = getChartById(id);
    if (chart) {
        chart.destroy();
    }
}

// Utility function to update chart data
export function updateChartData(chart: ChartJS, newData: ChartData): void {
    chart.data = newData;
    chart.update();
}

// Export Chart.js for direct use
export { ChartJS as Chart };
