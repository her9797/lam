package lamdata

type StoreInfo struct {
	Name     string `json:"name"`
	Subtitle string `json:"subtitle"`
	Address  string `json:"address"`
}

type MenuCategory struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type MenuItem struct {
	ID          string `json:"id"`
	CategoryID  string `json:"categoryId"`
	Badge       string `json:"badge,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       string `json:"price"`
}

type NoticeItem struct {
	ID   string `json:"id"`
	Text string `json:"text"`
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
