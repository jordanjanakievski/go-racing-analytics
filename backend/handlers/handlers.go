go-racing-analytics/backend/handlers/handlers.go
package handlers

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// Handler struct holds dependencies for HTTP handlers
type Handler struct {
	DBProvider func() DB
}

// DB interface allows for easier testing/mocking
type DB interface {
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
}

// Rows and Row interfaces for DB abstraction
type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
	Err() error
}
type Row interface {
	Scan(dest ...interface{}) error
}

// NewHandler returns a Handler with the given DB provider
func NewHandler(dbProvider func() DB) *Handler {
	return &Handler{DBProvider: dbProvider}
}

// GET /api/drivers
// Returns all unique driver codes for the given session (required: ?session=Q or ?session=R)
func (h *Handler) GetDrivers(c *gin.Context) {
	session := ParseSessionParamGin(c)
	if session == "" {
		c.JSON(400, gin.H{"error": "Missing or empty session parameter"})
		return
	}

	db := h.DBProvider()
	rows, err := db.Query("SELECT DISTINCT driver FROM telemetry WHERE session = ?", session)
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

// GET /api/laps?drivers=VER,HAM&session=R
func (h *Handler) GetLaps(c *gin.Context) {
	// TODO: Parse drivers and session, fetch laps from DuckDB
	c.JSON(501, gin.H{"error": "Not implemented"})
}

// GET /api/telemetry?drivers=VER,HAM&lap_number=5&session=R
func (h *Handler) GetTelemetry(c *gin.Context) {
	// TODO: Parse drivers, lap_number, session, fetch telemetry from DuckDB
	c.JSON(501, gin.H{"error": "Not implemented"})
}

// GET /api/summary?drivers=VER,HAM&session=Q
func (h *Handler) GetSummary(c *gin.Context) {
	// TODO: Parse drivers and session, fetch summary stats from DuckDB
	c.JSON(501, gin.H{"error": "Not implemented"})
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

// RegisterRoutesGin attaches handlers to the Gin router
func RegisterRoutesGin(r *gin.Engine, handler *Handler) {
	api := r.Group("/api")
	{
		api.GET("/drivers", handler.GetDrivers)
		api.GET("/laps", handler.GetLaps)
		api.GET("/telemetry", handler.GetTelemetry)
		api.GET("/summary", handler.GetSummary)
	}
}
