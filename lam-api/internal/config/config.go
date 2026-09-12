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
	YouTubeAPIKey          string
	YouTubeAPIBaseURL      string
	// SupabaseURL and SupabaseBroadcastKey configure the best-effort
	// Realtime Broadcast signal sent after a customer request is created
	// (see internal/notify.Broadcaster). Both are empty by default so
	// local docker-compose (no Supabase project) keeps working unchanged
	// — internal/notify.Broadcaster treats an empty SupabaseBroadcastKey
	// as "sending is disabled", not an error.
	SupabaseURL          string
	SupabaseBroadcastKey string
	// QRSigningSecret and CustomerWebBaseURL configure the admin table QR
	// endpoint (see internal/httpapi/tables.go). Both are empty by default,
	// matching lam-web's own optional QR_SIGNING_SECRET handling — the
	// endpoint itself rejects requests with a 500 when either is unset
	// rather than silently signing with an empty secret.
	QRSigningSecret    string
	CustomerWebBaseURL string
	// TossPlaceWebhookSecret verifies inbound TossPlace order webhooks (see
	// internal/httpapi/tossplace_webhooks.go). It is a separate value from
	// TossPlaceSecretKey (used for outbound POS API calls) — empty by
	// default, like TossPlaceSecretKey, since local/dev environments may not
	// have webhooks configured.
	TossPlaceWebhookSecret string
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
	youTubeAPIBaseURL := os.Getenv("YOUTUBE_API_BASE_URL")
	if youTubeAPIBaseURL == "" {
		youTubeAPIBaseURL = "https://www.googleapis.com/youtube/v3"
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
		YouTubeAPIKey:          os.Getenv("YOUTUBE_API_KEY"),
		YouTubeAPIBaseURL:      youTubeAPIBaseURL,
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseBroadcastKey:   os.Getenv("SUPABASE_BROADCAST_KEY"),
		QRSigningSecret:        os.Getenv("QR_SIGNING_SECRET"),
		CustomerWebBaseURL:     os.Getenv("CUSTOMER_WEB_BASE_URL"),
		TossPlaceWebhookSecret: os.Getenv("TOSS_PLACE_WEBHOOK_SECRET"),
	}
}
