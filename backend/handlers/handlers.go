go-racing-analytics/backend/handlers/handlers.go
package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go-racing-analytics/backend/db"
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
func (h *Handler) GetDrivers(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement logic to fetch drivers from DuckDB
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
}

// GET /api/laps?drivers=VER,HAM&session=R
func (h *Handler) GetLaps(w http.ResponseWriter, r *http.Request) {
	// TODO: Parse drivers and session, fetch laps from DuckDB
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
}

// GET /api/telemetry?drivers=VER,HAM&lap_number=5&session=R
func (h *Handler) GetTelemetry(w http.ResponseWriter, r *http.Request) {
	// TODO: Parse drivers, lap_number, session, fetch telemetry from DuckDB
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
}

// GET /api/summary?drivers=VER,HAM&session=Q
func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	// TODO: Parse drivers and session, fetch summary stats from DuckDB
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
}

// Utility: Parse comma-separated drivers from query param
func ParseDriversParam(r *http.Request) []string {
	drivers := r.URL.Query().Get("drivers")
	if drivers == "" {
		return nil
	}
	parts := strings.Split(drivers, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

// Utility: Parse session param
func ParseSessionParam(r *http.Request) string {
	return strings.TrimSpace(r.URL.Query().Get("session"))
}

// RegisterRoutes attaches handlers to the router
func RegisterRoutes(router *mux.Router, handler *Handler) {
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/drivers", handler.GetDrivers).Methods("GET")
	api.HandleFunc("/laps", handler.GetLaps).Methods("GET")
	api.HandleFunc("/telemetry", handler.GetTelemetry).Methods("GET")
	api.HandleFunc("/summary", handler.GetSummary).Methods("GET")
}
