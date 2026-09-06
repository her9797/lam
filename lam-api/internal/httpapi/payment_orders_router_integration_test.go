package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func seedPaymentOrderViaSQL(t *testing.T, id string, tableNumber string, status string, posSyncStatus string, amount int64, createdAt time.Time) {
	t.Helper()
	_, err := testPool.Exec(context.Background(), `
		INSERT INTO payment_orders (
			id, menu_item_name, category_name, table_number, amount, status, pos_sync_status, created_at
		) VALUES ($1, 'Beer', 'Drinks', $2, $3, $4, $5, $6)
	`, id, tableNumber, amount, status, posSyncStatus, createdAt)
	if err != nil {
		t.Fatalf("seed payment_orders %q: %v", id, err)
	}
}

func TestRouter_AdminPaymentOrders_RequiresAdminAuth(t *testing.T) {
	handler := resetServer(t)

	rec := doRequest(t, handler, http.MethodGet, "/api/v1/admin/payment-orders", nil, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusUnauthorized, rec.Body.String())
	}
}

func TestRouter_AdminPaymentOrders_RejectsNonGet(t *testing.T) {
	handler := resetServer(t)

	rec := doRequest(t, handler, http.MethodPost, "/api/v1/admin/payment-orders", nil, adminHeaders())
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	}
}

func TestRouter_AdminPaymentOrders_ReturnsEnvelope(t *testing.T) {
	handler := resetServer(t)
	base := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
	seedPaymentOrderViaSQL(t, "order-1", "T-01", "DONE", "SUCCEEDED", 8000, base)
	seedPaymentOrderViaSQL(t, "order-2", "T-02", "READY", "PENDING", 5000, base.Add(time.Hour))

	rec := doRequest(t, handler, http.MethodGet, "/api/v1/admin/payment-orders", nil, adminHeaders())
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var envelope struct {
		Items []struct {
			OrderID     string `json:"orderId"`
			TableNumber string `json:"tableNumber"`
			Amount      int64  `json:"amount"`
			Status      string `json:"status"`
		} `json:"items"`
		Page     int `json:"page"`
		PageSize int `json:"pageSize"`
		Total    int `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode envelope: %v (body = %s)", err, rec.Body.String())
	}
	if envelope.Total != 2 || len(envelope.Items) != 2 || envelope.Page != 1 || envelope.PageSize != 20 {
		t.Fatalf("envelope = %+v, want total=2 items=2 page=1 pageSize=20", envelope)
	}
}

func TestRouter_AdminPaymentOrders_FiltersByStatus(t *testing.T) {
	handler := resetServer(t)
	base := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
	seedPaymentOrderViaSQL(t, "order-1", "T-01", "DONE", "SUCCEEDED", 8000, base)
	seedPaymentOrderViaSQL(t, "order-2", "T-02", "READY", "PENDING", 5000, base.Add(time.Hour))

	rec := doRequest(t, handler, http.MethodGet, "/api/v1/admin/payment-orders?status=DONE", nil, adminHeaders())
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var envelope struct {
		Items []struct {
			OrderID string `json:"orderId"`
		} `json:"items"`
		Total int `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode envelope: %v (body = %s)", err, rec.Body.String())
	}
	if envelope.Total != 1 || len(envelope.Items) != 1 || envelope.Items[0].OrderID != "order-1" {
		t.Fatalf("envelope = %+v, want a single order-1 match", envelope)
	}
}

func TestRouter_AdminPaymentOrders_InvalidParamIsBadRequest(t *testing.T) {
	handler := resetServer(t)

	rec := doRequest(t, handler, http.MethodGet, "/api/v1/admin/payment-orders?sort=tableNumber", nil, adminHeaders())
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d, body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}
