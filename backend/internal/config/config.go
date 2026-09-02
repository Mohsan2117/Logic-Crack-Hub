package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseDSN         string
	JWTSecret           string
	BrevoAPIKey         string
	BrevoSenderName     string
	BrevoSenderEmail    string
	SupabaseURL         string
	SupabaseServiceKey  string
	SupabaseAssetBucket string
	StripeSecretKey     string
	StripeWebhookSecret string
	GeminiAPIKey        string
	PublicAppURL        string
	CORSAllowedOrigins  []string
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		Port:                value("PORT", "8080"),
		DatabaseDSN:         databaseURL(),
		JWTSecret:           value("JWT_SECRET", "change-this-dev-secret"),
		BrevoAPIKey:         value("BREVO_API_KEY", ""),
		BrevoSenderName:     value("BREVO_SENDER_NAME", "Logic Crack Hub"),
		BrevoSenderEmail:    value("BREVO_SENDER_EMAIL", ""),
		SupabaseURL:         value("SUPABASE_URL", ""),
		SupabaseServiceKey:  value("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseAssetBucket: value("SUPABASE_ASSET_BUCKET", "assets"),
		StripeSecretKey:     value("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: value("STRIPE_WEBHOOK_SECRET", ""),
		GeminiAPIKey:        value("GEMINI_API_KEY", ""),
		PublicAppURL:        strings.TrimRight(value("PUBLIC_APP_URL", "http://localhost:3000"), "/"),
		CORSAllowedOrigins:  split(value("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
	}
}

func databaseURL() string {
	raw := value("DATABASE_URL", "")
	if raw == "" {
		raw = value("DATABASE_DSN", "postgresql://postgres:password@127.0.0.1:5432/logic_crack_hub?sslmode=disable")
	}
	if strings.Contains(raw, "pooler.supabase.com") && !strings.Contains(raw, "default_query_exec_mode") {
		if strings.Contains(raw, "?") {
			raw += "&default_query_exec_mode=simple_protocol"
		} else {
			raw += "?default_query_exec_mode=simple_protocol"
		}
	}
	return raw
}

func value(key, fallback string) string {
	if found := strings.TrimSpace(os.Getenv(key)); found != "" {
		return found
	}
	return fallback
}

func split(raw string) []string {
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if cleaned := strings.TrimSpace(part); cleaned != "" {
			values = append(values, cleaned)
		}
	}
	return values
}
