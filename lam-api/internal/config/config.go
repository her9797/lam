package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

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
}

func Load() Config {
	loadLocalEnv()

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
	}
}

var localEnvKeys = map[string]struct{}{
	"ADMIN_API_TOKEN":            {},
	"ALLOWED_ORIGIN":             {},
	"APP_ADDR":                   {},
	"DATABASE_URL":               {},
	"PAYMENT_API_TOKEN":          {},
	"PORT":                       {},
	"SUPABASE_BROADCAST_KEY":     {},
	"SUPABASE_URL":               {},
	"TOSS_PAYMENTS_API_BASE_URL": {},
	"TOSS_PAYMENTS_SECRET_KEY":   {},
	"TOSS_PLACE_ACCESS_KEY":      {},
	"TOSS_PLACE_API_BASE_URL":    {},
	"TOSS_PLACE_MERCHANT_ID":     {},
	"TOSS_PLACE_SECRET_KEY":      {},
	"YOUTUBE_API_BASE_URL":       {},
	"YOUTUBE_API_KEY":            {},
}

// loadLocalEnv lets `go run ./cmd/server` use the same ignored .env file as
// Docker Compose. Non-empty process environment always takes priority; Cloud
// Run therefore continues to use the values injected from Secret Manager.
func loadLocalEnv() {
	for _, path := range []string{".env.local", ".env", "../.env.local", "../.env"} {
		loadEnvFile(path)
	}
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		key = strings.TrimSpace(key)
		if !ok || os.Getenv(key) != "" {
			continue
		}
		if _, allowed := localEnvKeys[key]; !allowed {
			continue
		}

		value = strings.TrimSpace(value)
		if len(value) >= 2 && value[0] == '\'' && value[len(value)-1] == '\'' {
			value = value[1 : len(value)-1]
		}
		if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
			if unquoted, err := strconv.Unquote(value); err == nil {
				value = unquoted
			}
		}
		if value != "" {
			_ = os.Setenv(key, value)
		}
	}
}
