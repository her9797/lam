package store

import (
	"context"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var paymentAmountPattern = regexp.MustCompile(`^(?:[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)원$`)

type PaymentOrder struct {
	OrderID           string `json:"orderId"`
	MenuItemID        string `json:"menuItemId"`
	TossCatalogItemID string `json:"-"`
	MenuItemName      string `json:"menuItemName"`
	CategoryName      string `json:"categoryName"`
	TableNumber       string `json:"tableNumber"`
	Amount            int64  `json:"amount"`
	Status            string `json:"status"`
	PaymentKey        string `json:"paymentKey,omitempty"`
	PaymentMethod     string `json:"paymentMethod,omitempty"`
	ApprovedAt        string `json:"approvedAt,omitempty"`
	VAT               int64  `json:"vat"`
	SuppliedAmount    int64  `json:"suppliedAmount"`
	TaxFreeAmount     int64  `json:"taxFreeAmount"`
	POSSyncStatus     string `json:"posSyncStatus"`
	POSOrderID        string `json:"posOrderId,omitempty"`
	POSSyncError      string `json:"posSyncError,omitempty"`
	CreatedAt         string `json:"createdAt"`
}

func parsePaymentAmount(price string) (int64, error) {
	normalized := strings.TrimSpace(price)
	if !paymentAmountPattern.MatchString(normalized) {
		return 0, ErrInvalidInput
	}

	amountText := strings.TrimSuffix(strings.ReplaceAll(normalized, ",", ""), "원")
	amount, err := strconv.ParseInt(amountText, 10, 64)
	if err != nil || amount <= 0 {
		return 0, ErrInvalidInput
	}

	return amount, nil
}

func (r *Repository) CreatePaymentOrder(ctx context.Context, menuItemID string, tableNumber string) (PaymentOrder, error) {
	menuItemID = strings.TrimSpace(menuItemID)
	if menuItemID == "" {
		return PaymentOrder{}, ErrInvalidInput
	}

	var itemName string
	var categoryName string
	var price string
	var tossCatalogItemID string
	err := r.pool.QueryRow(ctx, `
		SELECT mi.name, mc.label, mi.price, mi.toss_catalog_item_id
		FROM menu_items mi
		JOIN menu_categories mc ON mc.id = mi.category_id
		WHERE mi.id = $1
			AND mi.is_visible = TRUE
			AND mc.is_visible = TRUE
			AND mi.toss_catalog_item_id IS NOT NULL
	`, menuItemID).Scan(&itemName, &categoryName, &price, &tossCatalogItemID)
	if err != nil {
		return PaymentOrder{}, classifyError(err)
	}

	amount, err := parsePaymentAmount(price)
	if err != nil {
		return PaymentOrder{}, err
	}

	orderID := nextID("order")
	_, err = r.pool.Exec(ctx, `
		INSERT INTO payment_orders (
			id, menu_item_id, toss_catalog_item_id, menu_item_name, category_name, table_number, amount
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, orderID, menuItemID, tossCatalogItemID, itemName, categoryName, strings.TrimSpace(tableNumber), amount)
	if err != nil {
		return PaymentOrder{}, classifyError(err)
	}

	return r.GetPaymentOrder(ctx, orderID)
}

func (r *Repository) GetPaymentOrder(ctx context.Context, orderID string) (PaymentOrder, error) {
	var order PaymentOrder
	var approvedAt *time.Time
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT
			id,
			COALESCE(menu_item_id, ''),
			COALESCE(toss_catalog_item_id, ''),
			menu_item_name,
			category_name,
			table_number,
			amount,
			status,
			COALESCE(payment_key, ''),
			COALESCE(payment_method, ''),
			approved_at,
			vat,
			supplied_amount,
			tax_free_amount,
			pos_sync_status,
			COALESCE(pos_order_id, ''),
			COALESCE(pos_sync_error, ''),
			created_at
		FROM payment_orders
		WHERE id = $1
	`, strings.TrimSpace(orderID)).Scan(
		&order.OrderID,
		&order.MenuItemID,
		&order.TossCatalogItemID,
		&order.MenuItemName,
		&order.CategoryName,
		&order.TableNumber,
		&order.Amount,
		&order.Status,
		&order.PaymentKey,
		&order.PaymentMethod,
		&approvedAt,
		&order.VAT,
		&order.SuppliedAmount,
		&order.TaxFreeAmount,
		&order.POSSyncStatus,
		&order.POSOrderID,
		&order.POSSyncError,
		&createdAt,
	)
	if err != nil {
		return PaymentOrder{}, classifyError(err)
	}

	if approvedAt != nil {
		order.ApprovedAt = formatTimestamp(*approvedAt)
	}
	order.CreatedAt = formatTimestamp(createdAt)
	return order, nil
}

type CompletePaymentOrderInput struct {
	PaymentKey     string
	PaymentMethod  string
	ApprovedAt     time.Time
	VAT            int64
	SuppliedAmount int64
	TaxFreeAmount  int64
}

func (r *Repository) CompletePaymentOrder(ctx context.Context, orderID string, input CompletePaymentOrderInput) (PaymentOrder, error) {
	order, err := r.GetPaymentOrder(ctx, orderID)
	if err != nil {
		return PaymentOrder{}, err
	}

	if order.Status == "DONE" {
		if order.PaymentKey == input.PaymentKey {
			return order, nil
		}
		return PaymentOrder{}, ErrAlreadyExists
	}
	if order.Status != "READY" || strings.TrimSpace(input.PaymentKey) == "" {
		return PaymentOrder{}, ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `
		UPDATE payment_orders
		SET status = 'DONE',
			payment_key = $2,
			payment_method = $3,
			approved_at = $4,
			vat = $5,
			supplied_amount = $6,
			tax_free_amount = $7,
			updated_at = NOW()
		WHERE id = $1 AND status = 'READY'
	`, orderID, input.PaymentKey, input.PaymentMethod, input.ApprovedAt, input.VAT, input.SuppliedAmount, input.TaxFreeAmount)
	if err != nil {
		return PaymentOrder{}, classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return PaymentOrder{}, ErrAlreadyExists
	}

	return r.GetPaymentOrder(ctx, orderID)
}

func (r *Repository) UpdatePaymentOrderPOSSync(ctx context.Context, orderID string, status string, posOrderID string, syncError string) error {
	if status != "SUCCEEDED" && status != "FAILED" && status != "NOT_CONFIGURED" {
		return ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `
		UPDATE payment_orders
		SET pos_sync_status = $2,
			pos_order_id = NULLIF($3, ''),
			pos_sync_error = NULLIF($4, ''),
			updated_at = NOW()
		WHERE id = $1
	`, orderID, status, strings.TrimSpace(posOrderID), strings.TrimSpace(syncError))
	if err != nil {
		return classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
