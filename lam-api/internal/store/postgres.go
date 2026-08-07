package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/her9797/lam/lam-api/internal/lamdata"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidInput  = errors.New("invalid input")
	ErrAlreadyExists = errors.New("resource already exists")
	ErrNotFound      = errors.New("resource not found")
)

type CreateMenuItemInput struct {
	CategoryID  string
	Badge       string
	Name        string
	Description string
	Price       string
	IsVisible   bool
}

type CreateMenuImageInput struct {
	MenuItemID  string
	Filename    string
	MimeType    string
	Content     []byte
	IsPrimary   bool
	DisplayArea string
	FocusX      int
	FocusY      int
}

type MenuImageContent struct {
	Filename string
	MimeType string
	Content  []byte
}

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) EnsureSchema(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS store_profile (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  badge TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_item_images (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content BYTEA NOT NULL,
  size_bytes BIGINT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_area TEXT NOT NULL DEFAULT 'menu',
  focus_x INTEGER NOT NULL DEFAULT 50,
  focus_y INTEGER NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_guides (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE request_guides ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE menu_item_images ADD COLUMN IF NOT EXISTS display_area TEXT NOT NULL DEFAULT 'menu';
ALTER TABLE menu_item_images ADD COLUMN IF NOT EXISTS focus_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE menu_item_images ADD COLUMN IF NOT EXISTS focus_y INTEGER NOT NULL DEFAULT 50;
`)
	return err
}

func (r *Repository) SeedDefaults(ctx context.Context) error {
	var count int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM store_profile`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `INSERT INTO store_profile (id, name, subtitle, address) VALUES (1, $1, $2, $3)`,
		"lam", "혼술 바를 위한 QR 메뉴 초안", "서울 강남구"); err != nil {
		return err
	}

	categories := []lamdata.MenuCategory{
		{ID: "signature", Label: "대표", IsVisible: true},
		{ID: "food", Label: "안주", IsVisible: true},
		{ID: "highball", Label: "하이볼", IsVisible: true},
		{ID: "whisky", Label: "위스키", IsVisible: true},
		{ID: "wine", Label: "와인", IsVisible: true},
	}
	for index, category := range categories {
		if _, err := tx.Exec(ctx, `INSERT INTO menu_categories (id, label, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, category.ID, category.Label, category.IsVisible, index+1); err != nil {
			return err
		}
	}

	items := []lamdata.MenuItem{
		{ID: "steak", CategoryID: "signature", Badge: "signature", Name: "lam 시그니처 스테이크", Description: "짙은 풍미의 스테이크와 구운 채소", Price: "29,000원", IsVisible: true},
		{ID: "truffle-fries", CategoryID: "signature", Badge: "best", Name: "트러플 프라이", Description: "가볍게 시작하기 좋은 인기 메뉴", Price: "11,000원"},
		{ID: "beef-tartare", CategoryID: "signature", Badge: "chef", Name: "비프 타르타르", Description: "고소한 노른자와 허브 오일을 곁들인 시그니처 플레이트", Price: "19,000원"},
		{ID: "octopus-carpaccio", CategoryID: "signature", Name: "문어 카르파초", Description: "산뜻한 시트러스 드레싱과 후추의 밸런스", Price: "21,000원"},
		{ID: "cheese-platter", CategoryID: "food", Badge: "share", Name: "치즈 플래터", Description: "와인과 잘 어울리는 치즈와 견과", Price: "18,000원"},
		{ID: "smoked-sausage", CategoryID: "food", Name: "훈제 소시지 플레이트", Description: "바삭한 감자와 머스터드 소스", Price: "16,000원"},
		{ID: "butter-squid", CategoryID: "food", Badge: "popular", Name: "버터 먹태구이", Description: "부드럽게 찢어 먹기 좋은 시그니처 건어물 안주", Price: "17,000원"},
		{ID: "spicy-pasta", CategoryID: "food", Name: "매콤 로제 파스타", Description: "늦은 밤에도 부담 없이 즐기기 좋은 한 접시", Price: "18,500원"},
		{ID: "truffle-potato", CategoryID: "food", Name: "트러플 감자전", Description: "겉은 바삭하고 속은 촉촉한 감자전 스타일 안주", Price: "15,500원"},
		{ID: "burrata-salad", CategoryID: "food", Badge: "fresh", Name: "부라타 토마토 샐러드", Description: "상큼한 토마토와 바질 페스토 조합", Price: "16,000원"},
		{ID: "house-highball", CategoryID: "highball", Badge: "today", Name: "하우스 하이볼", Description: "레몬 향을 더한 드라이한 밸런스", Price: "9,000원"},
		{ID: "yuzu-highball", CategoryID: "highball", Name: "유자 하이볼", Description: "상큼한 향과 부드러운 탄산감", Price: "10,000원"},
		{ID: "earlgrey-highball", CategoryID: "highball", Name: "얼그레이 하이볼", Description: "은은한 티 향이 길게 남는 시그니처 하이볼", Price: "11,000원"},
		{ID: "ginger-highball", CategoryID: "highball", Badge: "dry", Name: "진저 하이볼", Description: "진저 스파이스가 선명한 드라이 타입", Price: "10,500원"},
		{ID: "green-grape-highball", CategoryID: "highball", Name: "청포도 하이볼", Description: "달지 않고 깔끔하게 떨어지는 프루티 스타일", Price: "10,500원"},
		{ID: "smoky-highball", CategoryID: "highball", Badge: "limited", Name: "스모키 하이볼", Description: "피트 향을 가볍게 살린 한정 레시피", Price: "12,000원"},
		{ID: "apple-highball", CategoryID: "highball", Name: "애플 하이볼", Description: "은은한 사과 향과 산뜻한 탄산감", Price: "10,500원"},
		{ID: "grapefruit-highball", CategoryID: "highball", Badge: "citrus", Name: "자몽 하이볼", Description: "쌉쌀한 자몽 향이 또렷한 시트러스 스타일", Price: "10,500원"},
		{ID: "melon-highball", CategoryID: "highball", Name: "멜론 하이볼", Description: "부드럽고 달콤한 향이 가볍게 도는 타입", Price: "11,000원"},
		{ID: "plum-highball", CategoryID: "highball", Badge: "house", Name: "매실 하이볼", Description: "새콤한 매실 향으로 마무리가 깔끔한 하우스 레시피", Price: "10,000원"},
		{ID: "basil-lemon-highball", CategoryID: "highball", Name: "바질 레몬 하이볼", Description: "허브 향과 레몬의 산뜻함이 살아 있는 스타일", Price: "11,500원"},
		{ID: "pear-highball", CategoryID: "highball", Name: "배 하이볼", Description: "부드럽고 은은한 배 향이 길게 남는 타입", Price: "10,500원"},
		{ID: "cola-highball", CategoryID: "highball", Badge: "classic", Name: "콜라 하이볼", Description: "가볍고 편하게 마시기 좋은 클래식 변주", Price: "9,500원"},
		{ID: "coffee-highball", CategoryID: "highball", Badge: "late-night", Name: "콜드브루 하이볼", Description: "씁쓸한 커피 향과 위스키의 균형감이 또렷한 한 잔", Price: "12,000원"},
		{ID: "tonic-highball", CategoryID: "highball", Name: "토닉 하이볼", Description: "청량하고 드라이한 느낌을 선호할 때 추천", Price: "10,000원"},
		{ID: "seasonal-highball", CategoryID: "highball", Badge: "seasonal", Name: "시즌 하이볼", Description: "제철 과일이나 허브를 활용한 한정 레시피", Price: "12,500원"},
		{ID: "glass-whisky", CategoryID: "whisky", Badge: "glass", Name: "싱글몰트 위스키 1잔", Description: "오늘의 추천 라인업 중 선택", Price: "15,000원~"},
		{ID: "bourbon-flight", CategoryID: "whisky", Badge: "flight", Name: "버번 테이스팅 플라이트", Description: "세 가지 버번을 가볍게 비교해보는 구성", Price: "27,000원"},
		{ID: "peat-whisky", CategoryID: "whisky", Name: "피트 위스키 글라스", Description: "짙은 스모키 향을 좋아하는 손님 추천", Price: "18,000원~"},
		{ID: "japanese-whisky", CategoryID: "whisky", Name: "재패니즈 위스키 글라스", Description: "부드럽고 균형감 있는 스타일 위주로 구성", Price: "17,000원~"},
		{ID: "old-fashioned", CategoryID: "whisky", Badge: "classic", Name: "올드 패션드", Description: "오렌지 필과 비터스가 살아 있는 클래식", Price: "16,000원"},
		{ID: "house-wine", CategoryID: "wine", Badge: "glass", Name: "하우스 와인", Description: "레드 또는 화이트 글라스 선택", Price: "8,000원"},
		{ID: "sparkling-wine", CategoryID: "wine", Badge: "sparkling", Name: "스파클링 와인", Description: "가볍게 시작하기 좋은 산뜻한 버블", Price: "11,000원"},
		{ID: "orange-wine", CategoryID: "wine", Name: "오렌지 와인", Description: "향이 풍부하고 개성 있는 한 잔", Price: "12,000원"},
		{ID: "red-bottle", CategoryID: "wine", Name: "레드 와인 보틀", Description: "직원 추천 리스트 중 선택 가능", Price: "39,000원~"},
		{ID: "white-bottle", CategoryID: "wine", Name: "화이트 와인 보틀", Description: "산뜻한 타입부터 묵직한 타입까지 준비", Price: "37,000원~"},
		{ID: "white-bottle-2", CategoryID: "wine", Name: "화이트 와인 보틀", Description: "산뜻한 타입부터 묵직한 타입까지 준비", Price: "37,000원~"},
		{ID: "white-bottle-3", CategoryID: "wine", Name: "화이트 와인 보틀", Description: "산뜻한 타입부터 묵직한 타입까지 준비", Price: "37,000원~", IsVisible: true},
	}
	for index, item := range items {
		if _, err := tx.Exec(ctx, `INSERT INTO menu_items (id, category_id, badge, name, description, price, is_visible, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			item.ID, item.CategoryID, nullable(item.Badge), item.Name, item.Description, item.Price, item.IsVisible, index+1); err != nil {
			return err
		}
	}

	requestGuides := []lamdata.NoticeItem{
		{ID: "allergy", Text: "알레르기 유발 재료가 있으면 주문 전 꼭 말씀해주세요.", IsVisible: true},
		{ID: "soldout", Text: "일부 주류와 안주는 당일 재고에 따라 조기 품절될 수 있습니다.", IsVisible: true},
		{ID: "seat-time", Text: "혼술 손님 위주 운영 특성상 좌석 이동이 필요할 수 있습니다.", IsVisible: true},
		{ID: "pairing", Text: "주류 추천이 필요하면 취향에 맞춰 페어링을 도와드립니다.", IsVisible: true},
	}
	for index, item := range requestGuides {
		if _, err := tx.Exec(ctx, `INSERT INTO request_guides (id, text, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, item.ID, item.Text, item.IsVisible, index+1); err != nil {
			return err
		}
	}

	notices := []lamdata.NoticeItem{
		{ID: "hours", Text: "평일 18:00 - 02:00 / 금토 18:00 - 03:00", IsVisible: true},
		{ID: "seat", Text: "혼술 손님이 편하게 머물 수 있도록 좌석 간격을 넉넉히 운영합니다.", IsVisible: true},
		{ID: "event-1", Text: "매주 화요일 하이볼 추천 메뉴 1,000원 할인", IsVisible: true},
		{ID: "event-2", Text: "비 오는 날에는 스모키 하이볼 한정 레시피가 추가됩니다.", IsVisible: true},
	}
	for index, item := range notices {
		if _, err := tx.Exec(ctx, `INSERT INTO notices (id, text, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, item.ID, item.Text, item.IsVisible, index+1); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetMenuData(ctx context.Context) (lamdata.MenuData, error) {
	bootstrap, err := r.GetBootstrapData(ctx)
	if err != nil {
		return lamdata.MenuData{}, err
	}

	return lamdata.MenuData{
		Store:      bootstrap.Store,
		Categories: bootstrap.Categories,
		Items:      bootstrap.Items,
	}, nil
}

func (r *Repository) GetBootstrapData(ctx context.Context) (lamdata.BootstrapData, error) {
	storeInfo := lamdata.StoreInfo{}
	if err := r.pool.QueryRow(ctx, `SELECT name, subtitle, address FROM store_profile WHERE id = 1`).Scan(
		&storeInfo.Name, &storeInfo.Subtitle, &storeInfo.Address,
	); err != nil {
		return lamdata.BootstrapData{}, err
	}

	categoriesRows, err := r.pool.Query(ctx, `SELECT id, label, is_visible FROM menu_categories ORDER BY sort_order, id`)
	if err != nil {
		return lamdata.BootstrapData{}, err
	}
	defer categoriesRows.Close()

	categories := make([]lamdata.MenuCategory, 0)
	for categoriesRows.Next() {
		var item lamdata.MenuCategory
		if err := categoriesRows.Scan(&item.ID, &item.Label, &item.IsVisible); err != nil {
			return lamdata.BootstrapData{}, err
		}
		categories = append(categories, item)
	}

	menuRows, err := r.pool.Query(ctx, `SELECT id, category_id, COALESCE(badge, ''), name, description, price, is_visible FROM menu_items ORDER BY sort_order, id`)
	if err != nil {
		return lamdata.BootstrapData{}, err
	}
	defer menuRows.Close()

	items := make([]lamdata.MenuItem, 0)
	for menuRows.Next() {
		var item lamdata.MenuItem
		if err := menuRows.Scan(&item.ID, &item.CategoryID, &item.Badge, &item.Name, &item.Description, &item.Price, &item.IsVisible); err != nil {
			return lamdata.BootstrapData{}, err
		}
		items = append(items, item)
	}

	imageRows, err := r.pool.Query(ctx, `SELECT id, menu_item_id, filename, mime_type, size_bytes, is_primary, display_area, focus_x, focus_y, sort_order FROM menu_item_images ORDER BY menu_item_id, is_primary DESC, sort_order, id`)
	if err != nil {
		return lamdata.BootstrapData{}, err
	}
	defer imageRows.Close()

	imagesByMenuItem := make(map[string][]lamdata.MenuImage)
	for imageRows.Next() {
		var image lamdata.MenuImage
		var menuItemID string
		if err := imageRows.Scan(&image.ID, &menuItemID, &image.Filename, &image.MimeType, &image.SizeBytes, &image.IsPrimary, &image.DisplayArea, &image.FocusX, &image.FocusY, &image.SortOrder); err != nil {
			return lamdata.BootstrapData{}, err
		}
		image.ContentURL = fmt.Sprintf("/api/v1/menu-images/%s/content", image.ID)
		imagesByMenuItem[menuItemID] = append(imagesByMenuItem[menuItemID], image)
	}

	for index := range items {
		items[index].Images = imagesByMenuItem[items[index].ID]
	}

	requestRows, err := r.pool.Query(ctx, `SELECT id, text, is_visible FROM request_guides ORDER BY sort_order, id`)
	if err != nil {
		return lamdata.BootstrapData{}, err
	}
	defer requestRows.Close()

	requestGuides := make([]lamdata.NoticeItem, 0)
	for requestRows.Next() {
		var item lamdata.NoticeItem
		if err := requestRows.Scan(&item.ID, &item.Text, &item.IsVisible); err != nil {
			return lamdata.BootstrapData{}, err
		}
		requestGuides = append(requestGuides, item)
	}

	noticeRows, err := r.pool.Query(ctx, `SELECT id, text, is_visible FROM notices ORDER BY sort_order, id`)
	if err != nil {
		return lamdata.BootstrapData{}, err
	}
	defer noticeRows.Close()

	notices := make([]lamdata.NoticeItem, 0)
	for noticeRows.Next() {
		var item lamdata.NoticeItem
		if err := noticeRows.Scan(&item.ID, &item.Text, &item.IsVisible); err != nil {
			return lamdata.BootstrapData{}, err
		}
		notices = append(notices, item)
	}

	return lamdata.BootstrapData{
		Store:         storeInfo,
		Categories:    categories,
		Items:         items,
		RequestGuides: requestGuides,
		Notices:       notices,
	}, nil
}

func (r *Repository) CreateCategory(ctx context.Context, id string, label string, isVisible bool) error {
	if id == "" || label == "" {
		return ErrInvalidInput
	}

	sortOrder, err := r.nextSortOrder(ctx, "menu_categories")
	if err != nil {
		return err
	}

	_, err = r.pool.Exec(ctx, `INSERT INTO menu_categories (id, label, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, id, label, isVisible, sortOrder)
	return classifyError(err)
}

func (r *Repository) CreateMenuItem(ctx context.Context, input CreateMenuItemInput) error {
	if input.CategoryID == "" || input.Name == "" || input.Description == "" || input.Price == "" {
		return ErrInvalidInput
	}

	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM menu_categories WHERE id = $1)`, input.CategoryID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}

	sortOrder, err := r.nextSortOrder(ctx, "menu_items")
	if err != nil {
		return err
	}

	id := fmt.Sprintf("menu-%d", time.Now().UnixMilli())
	_, err = r.pool.Exec(ctx, `INSERT INTO menu_items (id, category_id, badge, name, description, price, is_visible, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		id, input.CategoryID, nullable(input.Badge), input.Name, input.Description, input.Price, input.IsVisible, sortOrder)
	return classifyError(err)
}

func (r *Repository) CreateRequestGuide(ctx context.Context, text string, isVisible bool) error {
	if text == "" {
		return ErrInvalidInput
	}

	sortOrder, err := r.nextSortOrder(ctx, "request_guides")
	if err != nil {
		return err
	}

	id := fmt.Sprintf("request-%d", time.Now().UnixMilli())
	_, err = r.pool.Exec(ctx, `INSERT INTO request_guides (id, text, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, id, text, isVisible, sortOrder)
	return classifyError(err)
}

func (r *Repository) CreateNotice(ctx context.Context, text string, isVisible bool) error {
	if text == "" {
		return ErrInvalidInput
	}

	sortOrder, err := r.nextSortOrder(ctx, "notices")
	if err != nil {
		return err
	}

	id := fmt.Sprintf("notice-%d", time.Now().UnixMilli())
	_, err = r.pool.Exec(ctx, `INSERT INTO notices (id, text, is_visible, sort_order) VALUES ($1, $2, $3, $4)`, id, text, isVisible, sortOrder)
	return classifyError(err)
}

func (r *Repository) UpdateCategoryVisibility(ctx context.Context, id string, isVisible bool) error {
	tag, err := r.pool.Exec(ctx, `UPDATE menu_categories SET is_visible = $2 WHERE id = $1`, id, isVisible)
	if err != nil {
		return classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateMenuItemVisibility(ctx context.Context, id string, isVisible bool) error {
	tag, err := r.pool.Exec(ctx, `UPDATE menu_items SET is_visible = $2 WHERE id = $1`, id, isVisible)
	if err != nil {
		return classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateRequestGuideVisibility(ctx context.Context, id string, isVisible bool) error {
	tag, err := r.pool.Exec(ctx, `UPDATE request_guides SET is_visible = $2 WHERE id = $1`, id, isVisible)
	if err != nil {
		return classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateNoticeVisibility(ctx context.Context, id string, isVisible bool) error {
	tag, err := r.pool.Exec(ctx, `UPDATE notices SET is_visible = $2 WHERE id = $1`, id, isVisible)
	if err != nil {
		return classifyError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Image
func (r *Repository) CreateMenuImage(ctx context.Context, input CreateMenuImageInput) error {
	if input.MenuItemID == "" || input.Filename == "" || input.MimeType == "" || len(input.Content) == 0 {
		return ErrInvalidInput
	}
	if input.DisplayArea != "home" && input.DisplayArea != "menu" && input.DisplayArea != "both" {
		input.DisplayArea = "menu"
	}
	input.FocusX = clampImageFocus(input.FocusX)
	input.FocusY = clampImageFocus(input.FocusY)

	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM menu_items WHERE id = $1)`, input.MenuItemID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}

	sortOrder, err := r.nextMenuImageSortOrder(ctx, input.MenuItemID)
	if err != nil {
		return err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if input.IsPrimary {
		if _, err := tx.Exec(ctx, `UPDATE menu_item_images SET is_primary = FALSE WHERE menu_item_id = $1`, input.MenuItemID); err != nil {
			return err
		}
	}

	id := fmt.Sprintf("image-%d", time.Now().UnixMilli())
	_, err = tx.Exec(ctx, `
		INSERT INTO menu_item_images (id, menu_item_id, filename, mime_type, content, size_bytes, is_primary, display_area, focus_x, focus_y, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, id, input.MenuItemID, input.Filename, input.MimeType, input.Content, len(input.Content), input.IsPrimary, input.DisplayArea, input.FocusX, input.FocusY, sortOrder)
	if err != nil {
		return classifyError(err)
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetMenuImageContent(ctx context.Context, imageID string) (MenuImageContent, error) {
	if strings.TrimSpace(imageID) == "" {
		return MenuImageContent{}, ErrInvalidInput
	}

	var content MenuImageContent
	if err := r.pool.QueryRow(ctx, `SELECT filename, mime_type, content FROM menu_item_images WHERE id = $1`, imageID).Scan(
		&content.Filename,
		&content.MimeType,
		&content.Content,
	); err != nil {
		return MenuImageContent{}, classifyError(err)
	}

	return content, nil
}

// DELETE
func (r *Repository) DeleteCategory(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `DELETE FROM menu_categories WHERE id = $1`, id)
	if err != nil {
		return classifyError(err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) DeleteMenuItem(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `DELETE FROM menu_items WHERE id = $1`, id)
	if err != nil {
		return classifyError(err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) DeleteRequestGuide(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `DELETE FROM request_guides WHERE id = $1`, id)
	if err != nil {
		return classifyError(err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) DeleteNotice(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidInput
	}

	tag, err := r.pool.Exec(ctx, `DELETE FROM notices WHERE id = $1`, id)
	if err != nil {
		return classifyError(err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *Repository) nextSortOrder(ctx context.Context, table string) (int, error) {
	var query string
	switch table {
	case "menu_categories":
		query = `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_categories`
	case "menu_items":
		query = `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_items`
	case "request_guides":
		query = `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM request_guides`
	case "notices":
		query = `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM notices`
	default:
		return 0, ErrInvalidInput
	}

	var sortOrder int
	if err := r.pool.QueryRow(ctx, query).Scan(&sortOrder); err != nil {
		return 0, err
	}

	return sortOrder, nil
}

func (r *Repository) nextMenuImageSortOrder(ctx context.Context, menuItemID string) (int, error) {
	var sortOrder int
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_item_images WHERE menu_item_id = $1`, menuItemID).Scan(&sortOrder); err != nil {
		return 0, err
	}

	return sortOrder, nil
}

func nullable(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func clampImageFocus(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func classifyError(err error) error {
	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrAlreadyExists
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}

	return err
}
