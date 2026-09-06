package lamdata

type StoreInfo struct {
	Name            string `json:"name"`
	Subtitle        string `json:"subtitle"`
	Address         string `json:"address"`
	SongRequestCopy string `json:"songRequestCopy"`
	RequestCopy     string `json:"requestCopy"`
	EventCopy       string `json:"eventCopy"`
}

type MenuCategory struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	IsVisible bool   `json:"isVisible"`
}

type MenuItem struct {
	ID          string      `json:"id"`
	CategoryID  string      `json:"categoryId"`
	Badge       string      `json:"badge,omitempty"`
	BadgeColor  string      `json:"badgeColor,omitempty"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Price       string      `json:"price"`
	IsVisible   bool        `json:"isVisible"`
	Images      []MenuImage `json:"images,omitempty"`
}

type MenuImage struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	MimeType    string `json:"mimeType"`
	SizeBytes   int64  `json:"sizeBytes"`
	IsPrimary   bool   `json:"isPrimary"`
	DisplayArea string `json:"displayArea"`
	FocusX      int    `json:"focusX"`
	FocusY      int    `json:"focusY"`
	SortOrder   int    `json:"sortOrder"`
	ContentURL  string `json:"contentUrl"`
}

type NoticeItem struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	IsVisible bool   `json:"isVisible"`
}

type CustomerRequest struct {
	ID          string `json:"id"`
	TableNumber string `json:"tableNumber"`
	Text        string `json:"text"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	HandledAt   string `json:"handledAt,omitempty"`
}

type SpecialRequest struct {
	ID          string `json:"id"`
	TableNumber string `json:"tableNumber"`
	Gender      string `json:"gender"`
	Name        string `json:"name"`
	Age         string `json:"age"`
	Residence   string `json:"residence"`
	Instagram   string `json:"instagram"`
	IdealType   string `json:"idealType"`
	Text        string `json:"text"`
	CreatedAt   string `json:"createdAt"`
}

// PaymentOrder is the admin-facing read shape for a payment_orders row,
// deliberately separate from store.PaymentOrder (the customer payment-flow
// contract lam-web's services/payment-service.ts depends on) even though
// the fields largely overlap — per AGENTS.md, customer and admin contracts
// stay decoupled so the two can evolve independently.
type PaymentOrder struct {
	OrderID        string `json:"orderId"`
	MenuItemID     string `json:"menuItemId,omitempty"`
	MenuItemName   string `json:"menuItemName"`
	CategoryName   string `json:"categoryName"`
	TableNumber    string `json:"tableNumber"`
	Amount         int64  `json:"amount"`
	VAT            int64  `json:"vat"`
	SuppliedAmount int64  `json:"suppliedAmount"`
	TaxFreeAmount  int64  `json:"taxFreeAmount"`
	Status         string `json:"status"`
	PaymentMethod  string `json:"paymentMethod,omitempty"`
	PaymentKey     string `json:"paymentKey,omitempty"`
	ApprovedAt     string `json:"approvedAt,omitempty"`
	POSSyncStatus  string `json:"posSyncStatus"`
	POSOrderID     string `json:"posOrderId,omitempty"`
	POSSyncError   string `json:"posSyncError,omitempty"`
	CreatedAt      string `json:"createdAt"`
}

type PaymentOrderPage struct {
	Items    []PaymentOrder `json:"items"`
	Page     int            `json:"page"`
	PageSize int            `json:"pageSize"`
	Total    int            `json:"total"`
}

type CustomerRequestPage struct {
	Items    []CustomerRequest `json:"items"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
	Total    int               `json:"total"`
}

type SpecialRequestPage struct {
	Items    []SpecialRequest `json:"items"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
	Total    int              `json:"total"`
}

type BootstrapData struct {
	Store         StoreInfo      `json:"store"`
	Categories    []MenuCategory `json:"categories"`
	Items         []MenuItem     `json:"items"`
	RequestGuides []NoticeItem   `json:"requestGuides"`
	Notices       []NoticeItem   `json:"notices"`
}

type MenuData struct {
	Store      StoreInfo      `json:"store"`
	Categories []MenuCategory `json:"categories"`
	Items      []MenuItem     `json:"items"`
}
