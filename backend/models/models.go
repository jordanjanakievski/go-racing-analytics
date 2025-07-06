go-racing-analytics/backend/models/models.go
package models

import "time"

// Driver represents a Formula 1 driver.
type Driver struct {
	Code string `json:"code"`
	Name string `json:"name,omitempty"`
}

// Lap represents a single lap for a driver.
type Lap struct {
	Driver      string  `json:"driver"`
	Session     string  `json:"session"`
	LapNumber   int     `json:"lap_number"`
	LapTime     float64 `json:"lap_time_seconds"`
	Compound    string  `json:"compound"`
}

// Telemetry represents a single telemetry data point for a lap.
type Telemetry struct {
	Driver    string    `json:"driver"`
	Session   string    `json:"session"`
	LapNumber int       `json:"lap_number"`
	Timestamp time.Time `json:"timestamp"`
	Speed     float64   `json:"speed"`
	RPM       float64   `json:"rpm"`
	Gear      int       `json:"gear"`
	Throttle  float64   `json:"throttle"`
}

// Summary represents aggregate stats for a driver in a session.
type Summary struct {
	Driver         string  `json:"driver"`
	Session        string  `json:"session"`
	AverageLapTime float64 `json:"average_lap_time"`
	FastestLapTime float64 `json:"fastest_lap_time"`
	LapsCompleted  int     `json:"laps_completed"`
}
