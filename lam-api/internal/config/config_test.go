package config

import "testing"

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("APP_ADDR", "")
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("ALLOWED_ORIGIN", "")
	t.Setenv("ADMIN_API_TOKEN", "")
	t.Setenv("SUPABASE_URL", "")
	t.Setenv("SUPABASE_BROADCAST_KEY", "")

	cfg := Load()

	if cfg.Addr != ":9090" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":9090")
	}
	if cfg.DatabaseURL != "postgres://lam:lam@127.0.0.1:5432/lam?sslmode=disable" {
		t.Errorf("DatabaseURL = %q, want default local postgres URL", cfg.DatabaseURL)
	}
	if cfg.AllowedOrigin != "*" {
		t.Errorf("AllowedOrigin = %q, want %q", cfg.AllowedOrigin, "*")
	}
	if cfg.AdminAPIToken != "lam-admin-api-token" {
		t.Errorf("AdminAPIToken = %q, want %q", cfg.AdminAPIToken, "lam-admin-api-token")
	}
	// Deliberately empty by default (not a fabricated placeholder like the
	// other fields above): local docker-compose has no Supabase project,
	// and an empty SupabaseBroadcastKey is exactly what
	// internal/notify.Broadcaster checks to skip sending — see
	// docs/plans/2026-09-04-admin-request-notifications.md section 5.1.
	if cfg.SupabaseURL != "" {
		t.Errorf("SupabaseURL = %q, want empty default", cfg.SupabaseURL)
	}
	if cfg.SupabaseBroadcastKey != "" {
		t.Errorf("SupabaseBroadcastKey = %q, want empty default", cfg.SupabaseBroadcastKey)
	}
}

func TestLoad_PortEnvBuildsAddr(t *testing.T) {
	t.Setenv("APP_ADDR", "")
	t.Setenv("PORT", "4000")

	cfg := Load()

	if cfg.Addr != ":4000" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":4000")
	}
}

func TestLoad_AppAddrTakesPrecedenceOverPort(t *testing.T) {
	t.Setenv("APP_ADDR", ":9999")
	t.Setenv("PORT", "4000")

	cfg := Load()

	if cfg.Addr != ":9999" {
		t.Errorf("Addr = %q, want %q (APP_ADDR should win over PORT)", cfg.Addr, ":9999")
	}
}

func TestLoad_ReadsOverridesFromEnv(t *testing.T) {
	t.Setenv("APP_ADDR", ":8081")
	t.Setenv("DATABASE_URL", "postgres://user:pass@example.com:5432/db")
	t.Setenv("ALLOWED_ORIGIN", "https://example.com")
	t.Setenv("ADMIN_API_TOKEN", "custom-token")
	t.Setenv("SUPABASE_URL", "https://project-ref.supabase.co")
	t.Setenv("SUPABASE_BROADCAST_KEY", "sb_secret_example")

	cfg := Load()

	if cfg.Addr != ":8081" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":8081")
	}
	if cfg.DatabaseURL != "postgres://user:pass@example.com:5432/db" {
		t.Errorf("DatabaseURL = %q, want overridden value", cfg.DatabaseURL)
	}
	if cfg.AllowedOrigin != "https://example.com" {
		t.Errorf("AllowedOrigin = %q, want overridden value", cfg.AllowedOrigin)
	}
	if cfg.AdminAPIToken != "custom-token" {
		t.Errorf("AdminAPIToken = %q, want overridden value", cfg.AdminAPIToken)
	}
	if cfg.SupabaseURL != "https://project-ref.supabase.co" {
		t.Errorf("SupabaseURL = %q, want overridden value", cfg.SupabaseURL)
	}
	if cfg.SupabaseBroadcastKey != "sb_secret_example" {
		t.Errorf("SupabaseBroadcastKey = %q, want overridden value", cfg.SupabaseBroadcastKey)
	}
}
