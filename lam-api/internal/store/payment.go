package store

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/her9797/lam/lam-api/internal/lamdata"
)

var paymentAmountPattern = regexp.MustCompile(`^(?:[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)원$`)

type PaymentOrder struct {
	OrderID           string `json:"orderId"`
	MenuItemID        string `json:"menuItemId"`
	TossCatalogItemID string `json:"-"`
	MenuItemName      string `json:"menuItemName"`
	CategoryName      string `json:"categoryName"`
	TableNumber       string `json:"tableNumber"`
	RequestNote       string `json:"requestNote"`
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

const paymentOrderRequestNoteMaxLength = 200

func normalizePaymentOrderRequestNote(note string) (string, error) {
	note = strings.TrimSpace(note)
	if len([]rune(note)) > paymentOrderRequestNoteMaxLength {
		return "", ErrInvalidInput
	}
	return note, nil
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

func (r *Repository) CreatePaymentOrder(ctx context.Context, menuItemID string, tableNumber string, requestNote string) (PaymentOrder, error) {
	menuItemID = strings.TrimSpace(menuItemID)
	if menuItemID == "" {
		return PaymentOrder{}, ErrInvalidInput
	}
	requestNote, err := normalizePaymentOrderRequestNote(requestNote)
	if err != nil {
		return PaymentOrder{}, err
	}

	var itemName string
	var categoryName string
	var price string
	var tossCatalogItemID string
	err = r.pool.QueryRow(ctx, `
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
			id, menu_item_id, toss_catalog_item_id, menu_item_name, category_name, table_number, request_note, amount
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, orderID, menuItemID, tossCatalogItemID, itemName, categoryName, strings.TrimSpace(tableNumber), requestNote, amount)
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
			request_note,
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
		&order.RequestNote,
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

// PaymentOrderFilter is the parsed, validated filter/sort/page input for
// ListPaymentOrdersPage, mirroring CustomerRequestFilter/SpecialRequestFilter's
// shape and validation style.
type PaymentOrderFilter struct {
	Status        string // "" = all | "READY" | "DONE"
	PosSyncStatus string // "" = all | "PENDING" | "SUCCEEDED" | "FAILED" | "NOT_CONFIGURED"
	Search        string
	From          *time.Time // inclusive
	To            *time.Time // exclusive
	Sort          string     // "createdAt" | "amount"
	Order         string     // "asc" | "desc"
	Page          int
	PageSize      int
}

func paymentOrderOrderByClause(sort string, order string) (string, error) {
	direction := "DESC"
	if order == "asc" {
		direction = "ASC"
	} else if order != "desc" && order != "" {
		return "", fmt.Errorf("%w: order %q", ErrInvalidInput, order)
	}

	switch sort {
	case "createdAt", "":
		return "created_at " + direction + ", id " + direction, nil
	case "amount":
		return "amount " + direction + ", created_at DESC, id DESC", nil
	default:
		return "", fmt.Errorf("%w: sort %q", ErrInvalidInput, sort)
	}
}

const paymentOrderFilterWhere = `
	WHERE ($1 = '' OR status = $1)
	  AND ($2 = '' OR pos_sync_status = $2)
	  AND ($3::timestamptz IS NULL OR created_at >= $3)
	  AND ($4::timestamptz IS NULL OR created_at < $4)
	  AND ($5 = '' OR table_number ILIKE $5 ESCAPE '\' OR menu_item_name ILIKE $5 ESCAPE '\')
`

// ListPaymentOrdersPage applies filter/search/sort/pagination server-side for
// the admin order-history screen and reports the total matching row count
// alongside the current page, mirroring ListCustomerRequestsPage/
// ListSpecialRequestsPage. Unlike those, there is no legacy unpaginated
// array response to preserve here — this is a new endpoint, so it always
// returns the paginated shape.
func (r *Repository) ListPaymentOrdersPage(ctx context.Context, filter PaymentOrderFilter) ([]lamdata.PaymentOrder, int, error) {
	orderBy, err := paymentOrderOrderByClause(filter.Sort, filter.Order)
	if err != nil {
		return nil, 0, err
	}

	page := clampListPage(filter.Page)
	pageSize := clampListPageSize(filter.PageSize)
	searchPattern := searchPatternOrEmpty(filter.Search)

	var total int
	countSQL := "SELECT COUNT(*) FROM payment_orders" + paymentOrderFilterWhere
	if err := r.pool.QueryRow(ctx, countSQL, filter.Status, filter.PosSyncStatus, filter.From, filter.To, searchPattern).Scan(&total); err != nil {
		return nil, 0, err
	}

	listSQL := `
		SELECT
			id,
			COALESCE(menu_item_id, ''),
			menu_item_name,
			category_name,
			table_number,
			request_note,
			amount,
			vat,
			supplied_amount,
			tax_free_amount,
			status,
			COALESCE(payment_method, ''),
			COALESCE(payment_key, ''),
			approved_at,
			pos_sync_status,
			COALESCE(pos_order_id, ''),
			COALESCE(pos_sync_error, ''),
			created_at
		FROM payment_orders
	` + paymentOrderFilterWhere + `
		ORDER BY ` + orderBy + `
		LIMIT $6 OFFSET $7
	`
	offset := (page - 1) * pageSize
	rows, err := r.pool.Query(ctx, listSQL, filter.Status, filter.PosSyncStatus, filter.From, filter.To, searchPattern, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	orders := make([]lamdata.PaymentOrder, 0)
	for rows.Next() {
		var item lamdata.PaymentOrder
		var approvedAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(
			&item.OrderID,
			&item.MenuItemID,
			&item.MenuItemName,
			&item.CategoryName,
			&item.TableNumber,
			&item.RequestNote,
			&item.Amount,
			&item.VAT,
			&item.SuppliedAmount,
			&item.TaxFreeAmount,
			&item.Status,
			&item.PaymentMethod,
			&item.PaymentKey,
			&approvedAt,
			&item.POSSyncStatus,
			&item.POSOrderID,
			&item.POSSyncError,
			&createdAt,
		); err != nil {
			return nil, 0, err
		}
		if approvedAt != nil {
			item.ApprovedAt = formatTimestamp(*approvedAt)
		}
		item.CreatedAt = formatTimestamp(createdAt)
		orders = append(orders, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

// GetPaymentOrderForAdmin fetches a single order in the admin read shape
// (lamdata.PaymentOrder — see ListPaymentOrdersPage's doc comment for why
// this is a distinct type from the customer-facing PaymentOrder above).
// Returns ErrNotFound (via classifyError) when no row matches id.
func (r *Repository) GetPaymentOrderForAdmin(ctx context.Context, orderID string) (lamdata.PaymentOrder, error) {
	var item lamdata.PaymentOrder
	var approvedAt *time.Time
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT
			id,
			COALESCE(menu_item_id, ''),
			menu_item_name,
			category_name,
			table_number,
			request_note,
			amount,
			vat,
			supplied_amount,
			tax_free_amount,
			status,
			COALESCE(payment_method, ''),
			COALESCE(payment_key, ''),
			approved_at,
			pos_sync_status,
			COALESCE(pos_order_id, ''),
			COALESCE(pos_sync_error, ''),
			created_at
		FROM payment_orders
		WHERE id = $1
	`, strings.TrimSpace(orderID)).Scan(
		&item.OrderID,
		&item.MenuItemID,
		&item.MenuItemName,
		&item.CategoryName,
		&item.TableNumber,
		&item.RequestNote,
		&item.Amount,
		&item.VAT,
		&item.SuppliedAmount,
		&item.TaxFreeAmount,
		&item.Status,
		&item.PaymentMethod,
		&item.PaymentKey,
		&approvedAt,
		&item.POSSyncStatus,
		&item.POSOrderID,
		&item.POSSyncError,
		&createdAt,
	)
	if err != nil {
		return lamdata.PaymentOrder{}, classifyError(err)
	}

	if approvedAt != nil {
		item.ApprovedAt = formatTimestamp(*approvedAt)
	}
	item.CreatedAt = formatTimestamp(createdAt)
	return item, nil
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

// paymentOrderStatsFilterWhere restricts every stats query to DONE orders
// (READY orders never contributed revenue) approved within [from, to).
const paymentOrderStatsFilterWhere = `
	WHERE status = 'DONE' AND approved_at >= $1 AND approved_at < $2
`

// determineTrendUnit picks the trend chart's bucket granularity from the
// requested range's length, so the admin never has to pick a unit that
// would render either a single bar (too coarse) or hundreds of them (too
// fine) for the range they chose.
func determineTrendUnit(from time.Time, to time.Time) string {
	days := to.Sub(from).Hours() / 24
	switch {
	case days <= 31:
		return "day"
	case days <= 180:
		return "week"
	default:
		return "month"
	}
}

// GetPaymentOrderStats aggregates DONE orders approved within [from, to)
// for the admin sales-stats screen: a summary (total revenue, order count,
// average order value), a trend broken into day/week/month buckets (picked
// by determineTrendUnit), and revenue/count breakdowns by category, payment
// method, and table.
//
// Bucketing/grouping is done in Postgres via GROUP BY rather than in Go, so
// arbitrarily large ranges never have to pull every matching row into
// application memory just to sum them.
//
// The trend buckets are computed on `approved_at AT TIME ZONE 'Asia/Seoul'`
// — a KST wall-clock conversion scoped to this one query, not a
// server-wide timezone policy (contrast `formatTimestamp`, which always
// stores/serializes in UTC, and the order-history list filter, whose
// from/to bounds are pre-computed by the browser instead). A range here can
// split into an arbitrary, unbounded number of buckets, so — unlike the
// list filter's fixed from/to pair — there's no fixed set of boundaries the
// browser could precompute; the bucketing has to happen in SQL. Korea is
// this store's only market today, so the fixed 'Asia/Seoul' literal is
// fine.
//
// businessDayBasis switches the trend buckets between plain KST-calendar
// boundaries (midnight-to-midnight) and the venue's buffered business day
// (16:00-06:00, matching `lam-admin-web`'s `features/orders/business-day.ts`)
// — shifting the timestamp back 16 hours before truncating to the bucket
// unit, then shifting the truncated boundary forward again by the same 16
// hours, is the standard trick for truncating to an offset day/week/month
// rather than one starting at midnight.
func (r *Repository) GetPaymentOrderStats(ctx context.Context, from time.Time, to time.Time, businessDayBasis bool) (lamdata.PaymentOrderStats, error) {
	var stats lamdata.PaymentOrderStats

	var totalRevenue int64
	var orderCount int
	summarySQL := "SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payment_orders" + paymentOrderStatsFilterWhere
	if err := r.pool.QueryRow(ctx, summarySQL, from, to).Scan(&totalRevenue, &orderCount); err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	stats.Summary = lamdata.PaymentOrderStatsSummary{
		TotalRevenue: totalRevenue,
		OrderCount:   orderCount,
	}
	if orderCount > 0 {
		stats.Summary.AverageOrderValue = int64(math.Round(float64(totalRevenue) / float64(orderCount)))
	}

	unit := determineTrendUnit(from, to)
	trendSQL := `
		SELECT
			TO_CHAR(
				CASE WHEN $4 THEN
					date_trunc($3, (approved_at AT TIME ZONE 'Asia/Seoul') - INTERVAL '16 hours') + INTERVAL '16 hours'
				ELSE
					date_trunc($3, approved_at AT TIME ZONE 'Asia/Seoul')
				END,
				'YYYY-MM-DD'
			) AS bucket,
			COALESCE(SUM(amount), 0),
			COUNT(*)
		FROM payment_orders
	` + paymentOrderStatsFilterWhere + `
		GROUP BY bucket
		ORDER BY bucket ASC
	`
	trendRows, err := r.pool.Query(ctx, trendSQL, from, to, unit, businessDayBasis)
	if err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	buckets := make([]lamdata.PaymentOrderTrendBucket, 0)
	for trendRows.Next() {
		var bucket lamdata.PaymentOrderTrendBucket
		if err := trendRows.Scan(&bucket.Bucket, &bucket.Revenue, &bucket.OrderCount); err != nil {
			trendRows.Close()
			return lamdata.PaymentOrderStats{}, err
		}
		buckets = append(buckets, bucket)
	}
	trendRows.Close()
	if err := trendRows.Err(); err != nil {
		return lamdata.PaymentOrderStats{}, err
	}
	stats.Trend = lamdata.PaymentOrderTrend{Unit: unit, Buckets: buckets}

	categorySQL := `
		SELECT category_name, COALESCE(SUM(amount), 0), COUNT(*)
		FROM payment_orders
	` + paymentOrderStatsFilterWhere + `
		GROUP BY category_name
		ORDER BY SUM(amount) DESC
	`
	categoryRows, err := r.pool.Query(ctx, categorySQL, from, to)
	if err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	stats.ByCategory = make([]lamdata.PaymentOrderCategoryStat, 0)
	for categoryRows.Next() {
		var row lamdata.PaymentOrderCategoryStat
		if err := categoryRows.Scan(&row.CategoryName, &row.Revenue, &row.OrderCount); err != nil {
			categoryRows.Close()
			return lamdata.PaymentOrderStats{}, err
		}
		stats.ByCategory = append(stats.ByCategory, row)
	}
	categoryRows.Close()
	if err := categoryRows.Err(); err != nil {
		return lamdata.PaymentOrderStats{}, err
	}

	paymentMethodSQL := `
		SELECT COALESCE(payment_method, ''), COALESCE(SUM(amount), 0), COUNT(*)
		FROM payment_orders
	` + paymentOrderStatsFilterWhere + `
		GROUP BY payment_method
		ORDER BY SUM(amount) DESC
	`
	paymentMethodRows, err := r.pool.Query(ctx, paymentMethodSQL, from, to)
	if err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	stats.ByPaymentMethod = make([]lamdata.PaymentOrderPaymentMethodStat, 0)
	for paymentMethodRows.Next() {
		var row lamdata.PaymentOrderPaymentMethodStat
		if err := paymentMethodRows.Scan(&row.PaymentMethod, &row.Revenue, &row.OrderCount); err != nil {
			paymentMethodRows.Close()
			return lamdata.PaymentOrderStats{}, err
		}
		stats.ByPaymentMethod = append(stats.ByPaymentMethod, row)
	}
	paymentMethodRows.Close()
	if err := paymentMethodRows.Err(); err != nil {
		return lamdata.PaymentOrderStats{}, err
	}

	tableSQL := `
		SELECT table_number, COALESCE(SUM(amount), 0), COUNT(*)
		FROM payment_orders
	` + paymentOrderStatsFilterWhere + `
		GROUP BY table_number
		ORDER BY SUM(amount) DESC
	`
	tableRows, err := r.pool.Query(ctx, tableSQL, from, to)
	if err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	stats.ByTable = make([]lamdata.PaymentOrderTableStat, 0)
	for tableRows.Next() {
		var row lamdata.PaymentOrderTableStat
		if err := tableRows.Scan(&row.TableNumber, &row.Revenue, &row.OrderCount); err != nil {
			tableRows.Close()
			return lamdata.PaymentOrderStats{}, err
		}
		stats.ByTable = append(stats.ByTable, row)
	}
	tableRows.Close()
	if err := tableRows.Err(); err != nil {
		return lamdata.PaymentOrderStats{}, err
	}

	menuItemSQL := `
		SELECT menu_item_name, COALESCE(SUM(amount), 0), COUNT(*)
		FROM payment_orders
	` + paymentOrderStatsFilterWhere + `
		GROUP BY menu_item_name
		ORDER BY SUM(amount) DESC
	`
	menuItemRows, err := r.pool.Query(ctx, menuItemSQL, from, to)
	if err != nil {
		return lamdata.PaymentOrderStats{}, classifyError(err)
	}
	stats.ByMenuItem = make([]lamdata.PaymentOrderMenuItemStat, 0)
	for menuItemRows.Next() {
		var row lamdata.PaymentOrderMenuItemStat
		if err := menuItemRows.Scan(&row.MenuItemName, &row.Revenue, &row.OrderCount); err != nil {
			menuItemRows.Close()
			return lamdata.PaymentOrderStats{}, err
		}
		stats.ByMenuItem = append(stats.ByMenuItem, row)
	}
	menuItemRows.Close()
	if err := menuItemRows.Err(); err != nil {
		return lamdata.PaymentOrderStats{}, err
	}

	return stats, nil
}
