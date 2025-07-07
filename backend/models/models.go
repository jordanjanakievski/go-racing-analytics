package models

// Race represents a Formula 1 race event
type Race struct {
	ID      string `json:"race_id"`
	Name    string `json:"name"`
	Circuit string `json:"circuit"`
	Date    string `json:"date"`
}

// Driver represents a Formula 1 driver.
type Driver struct {
	Code string `json:"code"`
	Name string `json:"name,omitempty"`
}

// Lap represents a single lap for a driver.
type Lap struct {
	RaceID    string  `json:"race_id"`
	Driver    string  `json:"driver"`
	Session   string  `json:"session"`
	LapNumber int     `json:"lap_number"`
	LapTime   float64 `json:"lap_time_seconds"`
	Compound  string  `json:"compound"`
}

// Telemetry represents a single telemetry data point.
type Telemetry struct {
	RaceID           string  `json:"race_id"`
	Driver           string  `json:"driver"`
	Session          string  `json:"session"`
	LapNumber        int     `json:"lap_number"`
	TimestampSeconds float64 `json:"timestamp_seconds"`
	Speed            float64 `json:"speed"`
	RPM              float64 `json:"rpm"`
	Gear             int     `json:"gear"`
	Throttle         float64 `json:"throttle"`
}

// Summary represents aggregate stats for a driver in a session.
type Summary struct {
	RaceID         string  `json:"race_id"`
	Driver         string  `json:"driver"`
	Session        string  `json:"session"`
	AverageLapTime float64 `json:"average_lap_time"`
	FastestLapTime float64 `json:"fastest_lap_time"`
	LapsCompleted  int     `json:"laps_completed"`
}
