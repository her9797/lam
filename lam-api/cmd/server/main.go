package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/her9797/lam/lam-api/internal/config"
	"github.com/her9797/lam/lam-api/internal/httpapi"
	"github.com/her9797/lam/lam-api/internal/store"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("unable to create postgres pool: %v", err)
	}
	defer pool.Close()

	repository := store.New(pool)
	if err := repository.EnsureSchema(ctx); err != nil {
		log.Fatalf("unable to ensure schema: %v", err)
	}

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.NewMux(repository, cfg),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("lam-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
