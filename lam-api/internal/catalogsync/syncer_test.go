package catalogsync

import (
	"context"
	"testing"

	"github.com/her9797/lam/lam-api/internal/store"
	"github.com/her9797/lam/lam-api/internal/tossplace"
)

type fakeCatalogClient struct {
	items []tossplace.CatalogItem
}

func (f fakeCatalogClient) ListCatalogItems(context.Context) ([]tossplace.CatalogItem, error) {
	return f.items, nil
}

type fakeCatalogRepository struct {
	items []store.TossCatalogItem
}

func (f *fakeCatalogRepository) SyncTossCatalog(_ context.Context, items []store.TossCatalogItem) (store.TossCatalogSyncResult, error) {
	f.items = items
	return store.TossCatalogSyncResult{Created: len(items)}, nil
}

func TestSyncMapsPOSCategoriesToCustomerCategories(t *testing.T) {
	repository := &fakeCatalogRepository{}
	syncer := New(fakeCatalogClient{items: []tossplace.CatalogItem{
		{ID: "1", Title: "얼그레이하이볼", Category: tossplace.CatalogCategory{Title: "1%~7%"}, Price: tossplace.CatalogPrice{Type: "FIXED", Value: 10000}, State: "ON_SALE", Enabled: true},
		{ID: "2", Title: "제임슨", Category: tossplace.CatalogCategory{Title: "블렌디드 위스키"}, Price: tossplace.CatalogPrice{Type: "FIXED", Value: 9000}, State: "ON_SALE", Enabled: true},
		{ID: "3", Title: "셜리템플", Category: tossplace.CatalogCategory{Title: "논알콜"}, Price: tossplace.CatalogPrice{Type: "FIXED", Value: 0}, State: "ON_SALE", Enabled: true},
		{ID: "4", Title: "진토닉", Category: tossplace.CatalogCategory{Title: "8%~19%"}, Price: tossplace.CatalogPrice{Type: "FIXED", Value: 10000}, State: "SOLD_OUT", Enabled: true},
	}}, repository)

	if _, err := syncer.Sync(context.Background()); err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
	if got := repository.items[0].CategoryID; got != "highball" {
		t.Fatalf("highball category = %q", got)
	}
	if got := repository.items[1].CategoryID; got != "whisky" {
		t.Fatalf("whisky category = %q", got)
	}
	if got := repository.items[2].CategoryID; got != "non-alcohol" || repository.items[2].IsVisible {
		t.Fatalf("non-alcohol mapping = %+v", repository.items[2])
	}
	if got := repository.items[3].CategoryID; got != "cocktail" || repository.items[3].IsVisible {
		t.Fatalf("cocktail mapping = %+v", repository.items[3])
	}
}
