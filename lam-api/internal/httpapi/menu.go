package httpapi

type createCategoryRequest struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	IsVisible bool   `json:"isVisible"`
}

type createMenuItemRequest struct {
	CategoryID  string `json:"categoryId"`
	Badge       string `json:"badge"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       string `json:"price"`
	IsVisible   bool   `json:"isVisible"`
}

type createNoticeRequest struct {
	Text      string `json:"text"`
	IsVisible bool   `json:"isVisible"`
}

type updateVisibilityRequest struct {
	IsVisible bool `json:"isVisible"`
}
