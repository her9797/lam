package lamdata

type StoreInfo struct {
	Name     string `json:"name"`
	Subtitle string `json:"subtitle"`
	Address  string `json:"address"`
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
	ID         string `json:"id"`
	Text       string `json:"text"`
	Status     string `json:"status"`
	CreatedAt  string `json:"createdAt"`
	HandledAt  string `json:"handledAt,omitempty"`
}

type SpecialRequest struct {
	ID        string `json:"id"`
	Gender    string `json:"gender"`
	Name      string `json:"name"`
	Age       string `json:"age"`
	Residence string `json:"residence"`
	Instagram string `json:"instagram"`
	IdealType string `json:"idealType"`
	Text      string `json:"text"`
	CreatedAt string `json:"createdAt"`
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
