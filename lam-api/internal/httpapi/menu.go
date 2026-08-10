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

type createCustomerRequestRequest struct {
	Category  string `json:"category"`
	Text      string `json:"text"`
	Gender    string `json:"gender"`
	Name      string `json:"name"`
	Age       string `json:"age"`
	Residence string `json:"residence"`
	Instagram string `json:"instagram"`
	IdealType string `json:"idealType"`
}

type updateVisibilityRequest struct {
	IsVisible bool `json:"isVisible"`
}

type updateCustomerRequestStatusRequest struct {
	Status string `json:"status"`
}
