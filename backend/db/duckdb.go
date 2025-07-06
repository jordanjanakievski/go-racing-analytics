go-racing-analytics/backend/db/duckdb.go
package db

import (
	"database/sql"
	"fmt"
	"log"
	"path/filepath"
	"sync"

	_ "github.com/marcboeker/go-duckdb"
)

var (
	db   *sql.DB
	once sync.Once
)

// DBPath is the relative path to the DuckDB database file
const DBPath = "../duckdb/racing_data.db"

// InitDuckDB initializes the DuckDB connection (singleton)
func InitDuckDB() *sql.DB {
	once.Do(func() {
		absPath, err := filepath.Abs(DBPath)
		if err != nil {
			log.Fatalf("Failed to resolve DuckDB path: %v", err)
		}
		connStr := fmt.Sprintf("%s", absPath)
		db, err = sql.Open("duckdb", connStr)
		if err != nil {
			log.Fatalf("Failed to open DuckDB: %v", err)
		}
		if err := db.Ping(); err != nil {
			log.Fatalf("Failed to ping DuckDB: %v", err)
		}
		log.Printf("Connected to DuckDB at %s", absPath)
	})
	return db
}

// GetDB returns the initialized DuckDB connection
func GetDB() *sql.DB {
	if db == nil {
		return InitDuckDB()
	}
	return db
}
