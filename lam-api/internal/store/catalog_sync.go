package store

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

type TossCatalogItem struct {
	ID          string
	Name        string
	Description string
	CategoryID  string
	Price       int64
	IsVisible   bool
	SortOrder   int
}

type TossCatalogSyncResult struct {
	Created int
	Linked  int
	Updated int
}

func (r *Repository) SyncTossCatalog(ctx context.Context, items []TossCatalogItem) (TossCatalogSyncResult, error) {
	if len(items) == 0 {
		return TossCatalogSyncResult{}, ErrInvalidInput
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return TossCatalogSyncResult{}, err
	}
	defer tx.Rollback(ctx)

	categories := []struct {
		id    string
		label string
		order int
	}{
		{id: "highball", label: "하이볼", order: 1},
		{id: "whisky", label: "위스키", order: 2},
		{id: "cocktail", label: "칵테일", order: 3},
		{id: "non-alcohol", label: "논알콜", order: 4},
	}
	for _, category := range categories {
		if _, err := tx.Exec(ctx, `
			INSERT INTO menu_categories (id, label, is_visible, sort_order)
			VALUES ($1, $2, TRUE, $3)
			ON CONFLICT (id) DO UPDATE
			SET label = EXCLUDED.label, is_visible = TRUE, sort_order = EXCLUDED.sort_order
		`, category.id, category.label, category.order); err != nil {
			return TossCatalogSyncResult{}, classifyError(err)
		}
	}
	rows, err := tx.Query(ctx, `
		SELECT id, name
		FROM menu_items
		WHERE toss_catalog_item_id IS NULL
		ORDER BY sort_order, id
	`)
	if err != nil {
		return TossCatalogSyncResult{}, err
	}
	unlinkedByName := make(map[string]string)
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			rows.Close()
			return TossCatalogSyncResult{}, err
		}
		normalized := normalizeCatalogItemName(name)
		if _, exists := unlinkedByName[normalized]; !exists {
			unlinkedByName[normalized] = id
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return TossCatalogSyncResult{}, err
	}
	rows.Close()

	if _, err := tx.Exec(ctx, `UPDATE menu_items SET is_visible = FALSE`); err != nil {
		return TossCatalogSyncResult{}, err
	}

	result := TossCatalogSyncResult{}
	for _, item := range items {
		item.ID = strings.TrimSpace(item.ID)
		item.Name = strings.TrimSpace(item.Name)
		item.CategoryID = strings.TrimSpace(item.CategoryID)
		if item.ID == "" || item.Name == "" || item.CategoryID == "" || item.Price < 0 {
			return TossCatalogSyncResult{}, ErrInvalidInput
		}

		price := formatWon(item.Price)
		tag, err := tx.Exec(ctx, `
			UPDATE menu_items
			SET category_id = $2,
				name = $3,
				price = $4,
				is_visible = $5,
				sort_order = $6
			WHERE toss_catalog_item_id = $1
		`, item.ID, item.CategoryID, item.Name, price, item.IsVisible, item.SortOrder)
		if err != nil {
			return TossCatalogSyncResult{}, classifyError(err)
		}
		if tag.RowsAffected() > 0 {
			result.Updated++
			continue
		}

		normalized := normalizeCatalogItemName(item.Name)
		if localID, ok := unlinkedByName[normalized]; ok {
			if _, err := tx.Exec(ctx, `
				UPDATE menu_items
				SET toss_catalog_item_id = $2,
					category_id = $3,
					name = $4,
					price = $5,
					is_visible = $6,
					sort_order = $7
				WHERE id = $1
			`, localID, item.ID, item.CategoryID, item.Name, price, item.IsVisible, item.SortOrder); err != nil {
				return TossCatalogSyncResult{}, classifyError(err)
			}
			delete(unlinkedByName, normalized)
			result.Linked++
			continue
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO menu_items (
				id, category_id, name, description, price, is_visible, sort_order, toss_catalog_item_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (id) DO UPDATE
			SET category_id = EXCLUDED.category_id,
				name = EXCLUDED.name,
				price = EXCLUDED.price,
				is_visible = EXCLUDED.is_visible,
				sort_order = EXCLUDED.sort_order,
				toss_catalog_item_id = EXCLUDED.toss_catalog_item_id
		`, "toss-"+item.ID, item.CategoryID, item.Name, strings.TrimSpace(item.Description), price, item.IsVisible, item.SortOrder, item.ID); err != nil {
			return TossCatalogSyncResult{}, classifyError(err)
		}
		result.Created++
	}

	if err := tx.Commit(ctx); err != nil {
		return TossCatalogSyncResult{}, err
	}
	return result, nil
}

func normalizeCatalogItemName(value string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return unicode.ToLower(r)
	}, strings.TrimSpace(value))
}

func formatWon(amount int64) string {
	digits := strconv.FormatInt(amount, 10)
	for index := len(digits) - 3; index > 0; index -= 3 {
		digits = digits[:index] + "," + digits[index:]
	}
	return fmt.Sprintf("%s원", digits)
}
