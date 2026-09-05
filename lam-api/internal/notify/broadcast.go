// Package notify sends a best-effort Supabase Realtime Broadcast signal
// after a customer request is created, so the admin web can react faster
// than its 60s safety-net poll (see
// docs/plans/2026-09-04-admin-request-notifications.md section 3-4.3).
//
// Broadcast is a public, content-free channel: the signal never carries the
// request's data, only that something happened. The channel and event
// names here (RequestsTopic, NewRequestEvent) must match exactly what
// lam-admin-web's client subscribes to.
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// RequestsTopic is the public Broadcast channel admin clients subscribe
	// to for new-request signals.
	RequestsTopic = "admin-requests"
	// NewRequestEvent is the event name sent after a customer request
	// (general or song) is created. Special requests are not part of the
	// notification feature and never publish this event.
	NewRequestEvent = "new_request"
)

// NewRequestPayload is intentionally the entire message body: a bare
// signal with no request data, per the plan's public-channel design (4.2).
type NewRequestPayload struct {
	Type string `json:"type"`
}

// Broadcaster sends Supabase Realtime Broadcast messages over its REST API
// (POST /realtime/v1/api/broadcast/{topic}/events/{event}), documented at
// https://supabase.com/docs/guides/realtime/broadcast. It never needs a
// websocket connection.
type Broadcaster struct {
	supabaseURL string
	apiKey      string
	httpClient  *http.Client
}

// NewBroadcaster builds a Broadcaster. An empty supabaseURL or apiKey is
// valid and means "disabled" — Send becomes a no-op — so callers can
// construct this unconditionally from config.Config without a nil check,
// matching the local docker-compose environment (no Supabase project).
func NewBroadcaster(supabaseURL, apiKey string) *Broadcaster {
	return &Broadcaster{
		supabaseURL: strings.TrimRight(supabaseURL, "/"),
		apiKey:      apiKey,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
	}
}

// Send posts payload as the body of a broadcast to topic/event. It returns
// nil without making any request when the Broadcaster wasn't configured
// with both a Supabase URL and an API key. Callers that want the
// best-effort behavior described in the plan (a failed send must never
// fail the customer request creation it followed) are responsible for
// logging and discarding the returned error rather than propagating it.
func (b *Broadcaster) Send(ctx context.Context, topic, event string, payload any) error {
	if b.supabaseURL == "" || b.apiKey == "" {
		return nil
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("notify: marshal payload: %w", err)
	}

	endpoint := fmt.Sprintf(
		"%s/realtime/v1/api/broadcast/%s/events/%s",
		b.supabaseURL,
		url.PathEscape(topic),
		url.PathEscape(event),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("notify: build request: %w", err)
	}
	req.Header.Set("apikey", b.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("notify: send broadcast: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("notify: broadcast endpoint returned status %d", resp.StatusCode)
	}
	return nil
}
