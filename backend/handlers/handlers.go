package handlers

import (
	"database/sql"
	"fmt"
	"strings"

	"go-racing-analytics/backend/models"

	"github.com/gin-gonic/gin"
)

// Handler struct holds dependencies for HTTP handlers
type Handler struct {
	DBProvider func() *sql.DB
}

// NewHandler returns a Handler with the given DB provider
func NewHandler(dbProvider func() *sql.DB) *Handler {
	return &Handler{DBProvider: dbProvider}
}

// GET /api/races
// Returns all available races
func (h *Handler) GetRaces(c *gin.Context) {
	db := h.DBProvider()
	rows, err := db.Query("SELECT race_id, name, circuit, date FROM races ORDER BY date DESC")
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to query races"})
		return
	}
	defer rows.Close()

	var races []models.Race
	for rows.Next() {
		var race models.Race
		if err := rows.Scan(&race.ID, &race.Name, &race.Circuit, &race.Date); err != nil {
			c.JSON(500, gin.H{"error": "Failed to scan race"})
			return
		}
		races = append(races, race)
	}
	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"error": "Error reading races"})
		return
	}

	c.JSON(200, races)
}

// GET /api/drivers
// Returns all unique driver codes for the given race and session
func (h *Handler) GetDrivers(c *gin.Context) {
	raceID := ParseRaceIDParamGin(c)
	if raceID == "" {
		c.JSON(400, gin.H{"error": "Missing or empty race_id parameter"})
		return
	}

	session := ParseSessionParamGin(c)
	if session == "" {
		c.JSON(400, gin.H{"error": "Missing or empty session parameter"})
		return
	}

	db := h.DBProvider()
	rows, err := db.Query("SELECT DISTINCT driver FROM telemetry WHERE race_id = ? AND session = ?", raceID, session)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to query drivers"})
		return
	}
	defer rows.Close()

	var drivers []string
	for rows.Next() {
		var driver string
		if err := rows.Scan(&driver); err != nil {
			c.JSON(500, gin.H{"error": "Failed to scan driver"})
			return
		}
		drivers = append(drivers, driver)
	}
	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"error": "Error reading drivers"})
		return
	}

	c.JSON(200, drivers)
}

// GET /api/laps?race_id=2023-austria&drivers=VER,HAM&session=R
func (h *Handler) GetLaps(c *gin.Context) {
	raceID := ParseRaceIDParamGin(c)
	if raceID == "" {
		c.JSON(400, gin.H{"error": "Missing or empty race_id parameter"})
		return
	}

	session := ParseSessionParamGin(c)
	if session == "" {
		c.JSON(400, gin.H{"error": "Missing or empty session parameter"})
		return
	}

	drivers := ParseDriversParamGin(c)
	if len(drivers) == 0 {
		c.JSON(400, gin.H{"error": "Missing or empty drivers parameter"})
		return
	}

	// Build the query with placeholders for drivers
	placeholders := make([]string, len(drivers))
	args := make([]interface{}, 0, len(drivers)+2)

	args = append(args, raceID)
	for i := range drivers {
		placeholders[i] = "?"
		args = append(args, drivers[i])
	}
	args = append(args, session)

	query := fmt.Sprintf(`
		SELECT lt.race_id, lt.driver, lt.session, lt.lap_number, lt.lap_time_seconds, COALESCE(t.compound, '') as compound
		FROM lap_times lt
		LEFT JOIN tires t ON lt.race_id = t.race_id AND lt.driver = t.driver AND lt.session = t.session AND lt.lap_number = t.lap_number
		WHERE lt.race_id = ? AND lt.driver IN (%s) AND lt.session = ?
		ORDER BY lt.driver, lt.lap_number
	`, strings.Join(placeholders, ","))

	db := h.DBProvider()
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to query laps"})
		return
	}
	defer rows.Close()

	// Group laps by driver
	result := make(map[string][]models.Lap)
	for rows.Next() {
		var lap models.Lap
		if err := rows.Scan(&lap.RaceID, &lap.Driver, &lap.Session, &lap.LapNumber, &lap.LapTime, &lap.Compound); err != nil {
			c.JSON(500, gin.H{"error": "Failed to scan lap data"})
			return
		}

		if result[lap.Driver] == nil {
			result[lap.Driver] = make([]models.Lap, 0)
		}
		result[lap.Driver] = append(result[lap.Driver], lap)
	}

	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"error": "Error reading lap data"})
		return
	}

	c.JSON(200, result)
}

// GET /api/telemetry?race_id=2023-austria&drivers=1,44&lap_number=5&session=R
func (h *Handler) GetTelemetry(c *gin.Context) {
	raceID := ParseRaceIDParamGin(c)
	if raceID == "" {
		c.JSON(400, gin.H{"error": "Missing or empty race_id parameter"})
		return
	}

	session := ParseSessionParamGin(c)
	if session == "" {
		c.JSON(400, gin.H{"error": "Missing or empty session parameter"})
		return
	}

	drivers := ParseDriversParamGin(c)
	if len(drivers) == 0 {
		c.JSON(400, gin.H{"error": "Missing or empty drivers parameter"})
		return
	}

	lapNumberStr := c.Query("lap_number")
	if lapNumberStr == "" {
		c.JSON(400, gin.H{"error": "Missing lap_number parameter"})
		return
	}

	// Convert lap_number to int
	var lapNumber int
	if _, err := fmt.Sscanf(lapNumberStr, "%d", &lapNumber); err != nil {
		c.JSON(400, gin.H{"error": "Invalid lap_number parameter"})
		return
	}

	// Build the query with placeholders for drivers
	placeholders := make([]string, len(drivers))
	args := make([]interface{}, 0, len(drivers)+3)

	args = append(args, raceID)
	for i := range drivers {
		placeholders[i] = "?"
		args = append(args, drivers[i])
	}
	args = append(args, session, lapNumber)

	query := fmt.Sprintf(`
		SELECT race_id, driver, session, lap_number, timestamp_seconds, speed, rpm, gear, throttle
		FROM telemetry
		WHERE race_id = ? AND driver IN (%s) AND session = ? AND lap_number = ?
		ORDER BY driver, timestamp_seconds
	`, strings.Join(placeholders, ","))

	db := h.DBProvider()
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to query telemetry data"})
		return
	}
	defer rows.Close()

	// Group telemetry by driver
	result := make(map[string][]models.Telemetry)
	for rows.Next() {
		var telemetry models.Telemetry
		if err := rows.Scan(&telemetry.RaceID, &telemetry.Driver, &telemetry.Session, &telemetry.LapNumber,
			&telemetry.TimestampSeconds, &telemetry.Speed, &telemetry.RPM,
			&telemetry.Gear, &telemetry.Throttle); err != nil {
			c.JSON(500, gin.H{"error": "Failed to scan telemetry data"})
			return
		}

		if result[telemetry.Driver] == nil {
			result[telemetry.Driver] = make([]models.Telemetry, 0)
		}
		result[telemetry.Driver] = append(result[telemetry.Driver], telemetry)
	}

	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"error": "Error reading telemetry data"})
		return
	}

	c.JSON(200, result)
}

// GET /api/summary?race_id=2023-austria&drivers=1,44&session=Q
func (h *Handler) GetSummary(c *gin.Context) {
	raceID := ParseRaceIDParamGin(c)
	if raceID == "" {
		c.JSON(400, gin.H{"error": "Missing or empty race_id parameter"})
		return
	}

	session := ParseSessionParamGin(c)
	if session == "" {
		c.JSON(400, gin.H{"error": "Missing or empty session parameter"})
		return
	}

	drivers := ParseDriversParamGin(c)
	if len(drivers) == 0 {
		c.JSON(400, gin.H{"error": "Missing or empty drivers parameter"})
		return
	}

	// Build the query with placeholders for drivers
	placeholders := make([]string, len(drivers))
	args := make([]interface{}, 0, len(drivers)+2)

	args = append(args, raceID)
	for i := range drivers {
		placeholders[i] = "?"
		args = append(args, drivers[i])
	}
	args = append(args, session)

	query := fmt.Sprintf(`
		SELECT
			race_id,
			driver,
			session,
			AVG(lap_time_seconds) as average_lap_time,
			MIN(lap_time_seconds) as fastest_lap_time,
			COUNT(*) as laps_completed
		FROM lap_times
		WHERE race_id = ? AND driver IN (%s) AND session = ? AND lap_time_seconds > 0
		GROUP BY race_id, driver, session
		ORDER BY driver
	`, strings.Join(placeholders, ","))

	db := h.DBProvider()
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to query summary data"})
		return
	}
	defer rows.Close()

	// Group summary by driver
	result := make(map[string]models.Summary)
	for rows.Next() {
		var summary models.Summary
		if err := rows.Scan(&summary.RaceID, &summary.Driver, &summary.Session, &summary.AverageLapTime,
			&summary.FastestLapTime, &summary.LapsCompleted); err != nil {
			c.JSON(500, gin.H{"error": "Failed to scan summary data"})
			return
		}

		result[summary.Driver] = summary
	}

	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"error": "Error reading summary data"})
		return
	}

	c.JSON(200, result)
}

// Utility: Parse comma-separated drivers from Gin context
func ParseDriversParamGin(c *gin.Context) []string {
	drivers := c.Query("drivers")
	if drivers == "" {
		return nil
	}
	parts := strings.Split(drivers, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

// Utility: Parse session param from Gin context
func ParseSessionParamGin(c *gin.Context) string {
	return strings.TrimSpace(c.Query("session"))
}

// Utility: Parse race_id param from Gin context
func ParseRaceIDParamGin(c *gin.Context) string {
	return strings.TrimSpace(c.Query("race_id"))
}

// RegisterRoutesGin attaches handlers to the Gin router
func RegisterRoutesGin(r *gin.Engine, handler *Handler) {
	api := r.Group("/api")
	{
		api.GET("/races", handler.GetRaces)
		api.GET("/drivers", handler.GetDrivers)
		api.GET("/laps", handler.GetLaps)
		api.GET("/telemetry", handler.GetTelemetry)
		api.GET("/summary", handler.GetSummary)
	}
}
