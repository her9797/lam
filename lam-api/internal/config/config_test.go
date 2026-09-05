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
	t.Setenv("PAYMENT_API_TOKEN", "")
	t.Setenv("TOSS_PAYMENTS_SECRET_KEY", "")
	t.Setenv("TOSS_PAYMENTS_API_BASE_URL", "")
	t.Setenv("TOSS_PLACE_ACCESS_KEY", "")
	t.Setenv("TOSS_PLACE_SECRET_KEY", "")
	t.Setenv("TOSS_PLACE_MERCHANT_ID", "")
	t.Setenv("TOSS_PLACE_API_BASE_URL", "")

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
	if cfg.PaymentAPIToken != "lam-payment-api-token" {
		t.Errorf("PaymentAPIToken = %q, want local default", cfg.PaymentAPIToken)
	}
	if cfg.TossPaymentsSecretKey != "" || cfg.TossPlaceAccessKey != "" || cfg.TossPlaceSecretKey != "" || cfg.TossPlaceMerchantID != "" {
		t.Error("payment provider credentials must be empty by default")
	}
	if cfg.TossPaymentsAPIBaseURL != "https://api.tosspayments.com" {
		t.Errorf("TossPaymentsAPIBaseURL = %q", cfg.TossPaymentsAPIBaseURL)
	}
	if cfg.TossPlaceAPIBaseURL != "https://open-api.tossplace.com" {
		t.Errorf("TossPlaceAPIBaseURL = %q", cfg.TossPlaceAPIBaseURL)
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
	t.Setenv("PAYMENT_API_TOKEN", "payment-token")
	t.Setenv("TOSS_PAYMENTS_SECRET_KEY", "live-sk")
	t.Setenv("TOSS_PAYMENTS_API_BASE_URL", "https://payments.example.com")
	t.Setenv("TOSS_PLACE_ACCESS_KEY", "place-access")
	t.Setenv("TOSS_PLACE_SECRET_KEY", "place-secret")
	t.Setenv("TOSS_PLACE_MERCHANT_ID", "merchant-123")
	t.Setenv("TOSS_PLACE_API_BASE_URL", "https://place.example.com")

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
	if cfg.PaymentAPIToken != "payment-token" || cfg.TossPaymentsSecretKey != "live-sk" {
		t.Error("payment environment overrides were not loaded")
	}
	if cfg.TossPaymentsAPIBaseURL != "https://payments.example.com" {
		t.Errorf("TossPaymentsAPIBaseURL = %q", cfg.TossPaymentsAPIBaseURL)
	}
	if cfg.TossPlaceAccessKey != "place-access" || cfg.TossPlaceSecretKey != "place-secret" || cfg.TossPlaceMerchantID != "merchant-123" {
		t.Error("Toss Place environment overrides were not loaded")
	}
	if cfg.TossPlaceAPIBaseURL != "https://place.example.com" {
		t.Errorf("TossPlaceAPIBaseURL = %q", cfg.TossPlaceAPIBaseURL)
	}
}
