package httpapi

type createCategoryRequest struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type createMenuItemRequest struct {
	CategoryID  string `json:"categoryId"`
	Badge       string `json:"badge"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       string `json:"price"`
}

type createNoticeRequest struct {
	Text string `json:"text"`
}
