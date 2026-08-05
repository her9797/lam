package main

import (
	"log"
	"net/http"

	"github.com/example/bar-lam-api/internal/config"
	"github.com/example/bar-lam-api/internal/httpapi"
)

func main() {
	cfg := config.Load()
	server := &http.Server{
		Addr:    cfg.Addr,
		Handler: httpapi.NewMux(),
	}

	log.Printf("bar-lam-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
