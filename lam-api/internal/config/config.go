package config

import "os"

type Config struct {
	Addr                   string
	DatabaseURL            string
	AllowedOrigin          string
	AdminAPIToken          string
	PaymentAPIToken        string
	TossPaymentsSecretKey  string
	TossPaymentsAPIBaseURL string
	TossPlaceAccessKey     string
	TossPlaceSecretKey     string
	TossPlaceMerchantID    string
	TossPlaceAPIBaseURL    string
	// SupabaseURL and SupabaseBroadcastKey configure the best-effort
	// Realtime Broadcast signal sent after a customer request is created
	// (see internal/notify.Broadcaster). Both are empty by default so
	// local docker-compose (no Supabase project) keeps working unchanged
	// — internal/notify.Broadcaster treats an empty SupabaseBroadcastKey
	// as "sending is disabled", not an error.
	SupabaseURL          string
	SupabaseBroadcastKey string
}

func Load() Config {
	addr := os.Getenv("APP_ADDR")
	if addr == "" {
		port := os.Getenv("PORT")
		if port != "" {
			addr = ":" + port
		} else {
			addr = ":9090"
		}
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://lam:lam@127.0.0.1:5432/lam?sslmode=disable"
	}

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	adminAPIToken := os.Getenv("ADMIN_API_TOKEN")
	if adminAPIToken == "" {
		adminAPIToken = "lam-admin-api-token"
	}
	paymentAPIToken := os.Getenv("PAYMENT_API_TOKEN")
	if paymentAPIToken == "" {
		paymentAPIToken = "lam-payment-api-token"
	}
	tossPaymentsAPIBaseURL := os.Getenv("TOSS_PAYMENTS_API_BASE_URL")
	if tossPaymentsAPIBaseURL == "" {
		tossPaymentsAPIBaseURL = "https://api.tosspayments.com"
	}
	tossPlaceAPIBaseURL := os.Getenv("TOSS_PLACE_API_BASE_URL")
	if tossPlaceAPIBaseURL == "" {
		tossPlaceAPIBaseURL = "https://open-api.tossplace.com"
	}

	return Config{
		Addr:                   addr,
		DatabaseURL:            databaseURL,
		AllowedOrigin:          allowedOrigin,
		AdminAPIToken:          adminAPIToken,
		PaymentAPIToken:        paymentAPIToken,
		TossPaymentsSecretKey:  os.Getenv("TOSS_PAYMENTS_SECRET_KEY"),
		TossPaymentsAPIBaseURL: tossPaymentsAPIBaseURL,
		TossPlaceAccessKey:     os.Getenv("TOSS_PLACE_ACCESS_KEY"),
		TossPlaceSecretKey:     os.Getenv("TOSS_PLACE_SECRET_KEY"),
		TossPlaceMerchantID:    os.Getenv("TOSS_PLACE_MERCHANT_ID"),
		TossPlaceAPIBaseURL:    tossPlaceAPIBaseURL,
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseBroadcastKey:   os.Getenv("SUPABASE_BROADCAST_KEY"),
	}
}
