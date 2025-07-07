package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"go-racing-analytics/backend/db"
	"go-racing-analytics/backend/handlers"
)

func main() {
	// Set Gin to release mode for production, or use gin.Default() for logging/recovery in dev
	r := gin.Default()

	// CORS middleware: allow all origins for development
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Initialize DuckDB connection
	db.InitDuckDB()

	// Register API handlers
	handler := handlers.NewHandler(db.GetDB)
	handlers.RegisterRoutesGin(r, handler)

	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Printf("Go Racing Analytics API server running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
