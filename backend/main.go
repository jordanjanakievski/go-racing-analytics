go-racing-analytics/backend/main.go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"go-racing-analytics/backend/db"
	"go-racing-analytics/backend/handlers"
)

func main() {
	// Set up router
	router := mux.NewRouter()

	// Initialize DuckDB connection
	db.InitDuckDB()

	// Register API handlers
	handler := handlers.NewHandler(db.GetDB)
	handlers.RegisterRoutes(router, handler)

	// CORS setup: allow all origins for development
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)(router)

	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Printf("Go Racing Analytics API server running on port %s", port)
	if err := http.ListenAndServe(":"+port, corsHandler); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
