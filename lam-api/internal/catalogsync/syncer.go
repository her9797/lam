package catalogsync

import (
	"context"
	"strings"

	"github.com/her9797/lam/lam-api/internal/store"
	"github.com/her9797/lam/lam-api/internal/tossplace"
)

type catalogClient interface {
	ListCatalogItems(context.Context) ([]tossplace.CatalogItem, error)
}

type catalogRepository interface {
	SyncTossCatalog(context.Context, []store.TossCatalogItem) (store.TossCatalogSyncResult, error)
}

type Syncer struct {
	client     catalogClient
	repository catalogRepository
}

func New(client catalogClient, repository catalogRepository) *Syncer {
	return &Syncer{client: client, repository: repository}
}

func (s *Syncer) Sync(ctx context.Context) (store.TossCatalogSyncResult, error) {
	items, err := s.client.ListCatalogItems(ctx)
	if err != nil {
		return store.TossCatalogSyncResult{}, err
	}

	mapped := make([]store.TossCatalogItem, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, store.TossCatalogItem{
			ID:          item.ID,
			Name:        item.Title,
			Description: item.Description,
			CategoryID:  customerCategoryID(item),
			Price:       item.Price.Value,
			IsVisible:   item.Enabled && item.State == "ON_SALE" && item.Price.Type == "FIXED" && item.Price.Value > 0,
			SortOrder:   item.Order,
		})
	}

	return s.repository.SyncTossCatalog(ctx, mapped)
}

func customerCategoryID(item tossplace.CatalogItem) string {
	category := strings.TrimSpace(item.Category.Title)
	switch {
	case strings.Contains(category, "위스키"):
		return "whisky"
	case strings.Contains(category, "논알콜"):
		return "non-alcohol"
	case strings.Contains(item.Title, "하이볼"):
		return "highball"
	default:
		return "cocktail"
	}
}
