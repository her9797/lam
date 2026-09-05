package tossplace

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClientCreatePaidOrder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api-public/openapi/v1/merchants/merchant-123/order/orders" {
			t.Fatalf("request = %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("x-access-key") != "access" || r.Header.Get("x-secret-key") != "secret" {
			t.Fatal("missing Toss Place authentication headers")
		}

		var body createOrderBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if body.Order.OrderKey != "order-123456" || len(body.Order.LineItems) != 1 {
			t.Fatalf("order = %+v", body.Order)
		}
		line := body.Order.LineItems[0]
		if line.TargetType != "AD_HOC" || line.Item == nil || line.Item.Title != "하우스 하이볼" || line.ItemPrice.PriceValue != 10000 {
			t.Fatalf("line item = %+v", line)
		}
		if len(body.Payments) != 1 || body.Payments[0].PGDetails.TransactionID != "payment-key" {
			t.Fatalf("payments = %+v", body.Payments)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"resultType":"SUCCESS","success":{"id":"pos-order-1"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "access", "secret", "merchant-123", server.Client())
	result, err := client.CreatePaidOrder(context.Background(), PaidOrder{
		OrderID:        "order-123456",
		OrderNumber:    "테이블 3",
		MenuItemID:     "house-highball",
		MenuItemName:   "하우스 하이볼",
		CategoryName:   "하이볼",
		TableNumber:    "3",
		Amount:         10000,
		VAT:            909,
		SuppliedAmount: 9091,
		TaxFreeAmount:  0,
		PaymentKey:     "payment-key",
		ApprovedAt:     time.Date(2026, 9, 5, 3, 34, 56, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("CreatePaidOrder() error = %v", err)
	}
	if result.OrderID != "pos-order-1" {
		t.Fatalf("OrderID = %q", result.OrderID)
	}
}

func TestClientCreatePaidOrderUsesCatalogItemWhenMapped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body createOrderBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		line := body.Order.LineItems[0]
		if line.TargetType != "ITEM" || line.TargetID != "pos-item-1" {
			t.Fatalf("line item = %+v, want mapped ITEM", line)
		}
		if line.Item != nil {
			t.Fatalf("ad-hoc item must be omitted for mapped catalog item: %+v", line.Item)
		}
		_, _ = w.Write([]byte(`{"resultType":"SUCCESS","success":{"id":"pos-order-1"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "access", "secret", "merchant-123", server.Client())
	_, err := client.CreatePaidOrder(context.Background(), PaidOrder{
		OrderID:           "order-123456",
		OrderNumber:       "테이블 3",
		MenuItemID:        "local-item-1",
		TossCatalogItemID: "pos-item-1",
		MenuItemName:      "하우스 하이볼",
		CategoryName:      "하이볼",
		Amount:            10000,
		VAT:               909,
		SuppliedAmount:    9091,
		PaymentKey:        "payment-key",
		ApprovedAt:        time.Date(2026, 9, 5, 3, 34, 56, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("CreatePaidOrder() error = %v", err)
	}
}
