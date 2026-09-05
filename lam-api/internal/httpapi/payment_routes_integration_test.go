package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestRouter_PaymentFlowUsesStoredAmountAndSyncsPOS(t *testing.T) {
	resetServer(t)
	if _, err := testPool.Exec(t.Context(), `
		INSERT INTO menu_categories (id, label, sort_order) VALUES ('highball', '하이볼', 1);
		INSERT INTO menu_items (id, category_id, name, description, price, sort_order, toss_catalog_item_id)
		VALUES ('house-highball', 'highball', '하우스 하이볼', '테스트 메뉴', '10,000원', 1, 'pos-item-1');
	`); err != nil {
		t.Fatalf("seed menu: %v", err)
	}

	var paymentCalls atomic.Int32
	paymentServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paymentCalls.Add(1)
		if r.URL.Path != "/v1/payments/confirm" {
			t.Errorf("payment path = %q", r.URL.Path)
		}
		var request struct {
			OrderID string `json:"orderId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Errorf("decode payment request: %v", err)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"paymentKey":     "pay_test",
			"orderId":        request.OrderID,
			"status":         "DONE",
			"method":         "카드",
			"totalAmount":    10000,
			"suppliedAmount": 9091,
			"vat":            909,
			"taxFreeAmount":  0,
			"approvedAt":     "2026-09-05T12:00:00+09:00",
		})
	}))
	defer paymentServer.Close()

	var posCalls atomic.Int32
	posServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		posCalls.Add(1)
		if got := r.Header.Get("x-access-key"); got != "access" {
			t.Errorf("x-access-key = %q", got)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"resultType": "SUCCESS",
			"success":    map[string]string{"id": "pos-order-1"},
		})
	}))
	defer posServer.Close()

	cfg := testCfg
	cfg.TossPaymentsSecretKey = "secret"
	cfg.TossPaymentsAPIBaseURL = paymentServer.URL
	cfg.TossPlaceAccessKey = "access"
	cfg.TossPlaceSecretKey = "place-secret"
	cfg.TossPlaceMerchantID = "merchant"
	cfg.TossPlaceAPIBaseURL = posServer.URL
	handler := NewMux(testRepo, cfg)
	headers := map[string]string{"Authorization": "Bearer " + cfg.PaymentAPIToken}

	createBody, _ := json.Marshal(map[string]string{"menuItemId": "house-highball", "tableNumber": "7"})
	unauthorized := doRequest(t, handler, http.MethodPost, "/api/v1/payments/orders", createBody, nil)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized create status = %d, want %d", unauthorized.Code, http.StatusUnauthorized)
	}

	created := doRequest(t, handler, http.MethodPost, "/api/v1/payments/orders", createBody, headers)
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", created.Code, created.Body.String())
	}
	var order struct {
		OrderID string `json:"orderId"`
		Amount  int64  `json:"amount"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &order); err != nil {
		t.Fatalf("decode created order: %v", err)
	}
	if order.Amount != 10000 {
		t.Fatalf("amount = %d, want 10000", order.Amount)
	}

	wrongBody, _ := json.Marshal(map[string]any{"paymentKey": "pay_test", "orderId": order.OrderID, "amount": 1})
	wrong := doRequest(t, handler, http.MethodPost, "/api/v1/payments/confirm", wrongBody, headers)
	if wrong.Code != http.StatusBadRequest || paymentCalls.Load() != 0 {
		t.Fatalf("wrong amount status = %d, provider calls = %d", wrong.Code, paymentCalls.Load())
	}

	confirmBody, _ := json.Marshal(map[string]any{"paymentKey": "pay_test", "orderId": order.OrderID, "amount": 10000})
	confirmed := doRequest(t, handler, http.MethodPost, "/api/v1/payments/confirm", confirmBody, headers)
	if confirmed.Code != http.StatusOK {
		t.Fatalf("confirm status = %d, body = %s", confirmed.Code, confirmed.Body.String())
	}
	var result struct {
		Status        string `json:"status"`
		POSSyncStatus string `json:"posSyncStatus"`
		POSOrderID    string `json:"posOrderId"`
	}
	if err := json.Unmarshal(confirmed.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode confirmed order: %v", err)
	}
	if result.Status != "DONE" || result.POSSyncStatus != "SUCCEEDED" || result.POSOrderID != "pos-order-1" {
		t.Fatalf("confirmed order = %+v", result)
	}
	if paymentCalls.Load() != 1 || posCalls.Load() != 1 {
		t.Fatalf("provider calls payment=%d pos=%d, want 1 each", paymentCalls.Load(), posCalls.Load())
	}
}
