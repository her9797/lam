package config

import "os"

type Config struct {
	Addr          string
	DatabaseURL   string
	AllowedOrigin string
}

func Load() Config {
	addr := os.Getenv("APP_ADDR")
	if addr == "" {
		addr = ":9090"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://lam:lam@127.0.0.1:5432/lam?sslmode=disable"
	}

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	return Config{
		Addr:          addr,
		DatabaseURL:   databaseURL,
		AllowedOrigin: allowedOrigin,
	}
}
