package httpapi

type MenuItem struct {
	ID          string `json:"id"`
	CategoryID  string `json:"categoryId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       string `json:"price"`
}

func MockMenuItems() []MenuItem {
	return []MenuItem{
		{
			ID:          "house-highball",
			CategoryID:  "highball",
			Name:        "하우스 하이볼",
			Description: "레몬 향을 더한 드라이한 밸런스",
			Price:       "9,000원",
		},
		{
			ID:          "yuzu-highball",
			CategoryID:  "highball",
			Name:        "유자 하이볼",
			Description: "상큼한 향과 부드러운 탄산감",
			Price:       "10,000원",
		},
		{
			ID:          "cheese-platter",
			CategoryID:  "food",
			Name:        "치즈 플래터",
			Description: "와인과 잘 어울리는 치즈와 견과",
			Price:       "18,000원",
		},
	}
}
