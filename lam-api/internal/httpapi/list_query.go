package httpapi

import (
	"fmt"
	"net/url"
	"strconv"
)

const (
	defaultListPage     = 1
	defaultListPageSize = 20
	maxListPageSize     = 100
)

// customerRequestListQuery is the parsed, validated form of the optional
// query parameters accepted by GET /api/v1/admin/customer-requests. Every
// field carries a value even when the caller supplied nothing for it — the
// zero-parameter case is only distinguished by the separately-returned
// hasParams flag, which the caller uses to decide whether to keep replying
// with the legacy plain array or switch to the paginated envelope.
type customerRequestListQuery struct {
	Page     int
	PageSize int
	Status   string // "" = all statuses
	Kind     string // "all" | "general" | "song"
	Search   string
	Sort     string // "status" | "createdAt" | "tableNumber"
	Order    string // "asc" | "desc"
}

// specialRequestListQuery is the equivalent parsed query for
// GET /api/v1/admin/special-requests.
type specialRequestListQuery struct {
	Page     int
	PageSize int
	Gender   string // "" = both genders
	Search   string
	Sort     string // "createdAt" | "name"
	Order    string // "asc" | "desc"
}

var customerRequestListParamKeys = []string{"page", "pageSize", "status", "kind", "q", "sort", "order"}

var specialRequestListParamKeys = []string{"page", "pageSize", "gender", "q", "sort", "order"}

func hasAnyQueryParam(query url.Values, keys []string) bool {
	for _, key := range keys {
		if query.Has(key) {
			return true
		}
	}
	return false
}

func parsePage(query url.Values) (int, error) {
	raw := query.Get("page")
	if raw == "" {
		return defaultListPage, nil
	}
	page, err := strconv.Atoi(raw)
	if err != nil || page < 1 {
		return 0, fmt.Errorf("invalid page: %q", raw)
	}
	return page, nil
}

func parsePageSize(query url.Values) (int, error) {
	raw := query.Get("pageSize")
	if raw == "" {
		return defaultListPageSize, nil
	}
	pageSize, err := strconv.Atoi(raw)
	if err != nil || pageSize < 1 || pageSize > maxListPageSize {
		return 0, fmt.Errorf("invalid pageSize: %q", raw)
	}
	return pageSize, nil
}

func parseCustomerRequestListQuery(query url.Values) (customerRequestListQuery, bool, error) {
	q := customerRequestListQuery{
		Page:     defaultListPage,
		PageSize: defaultListPageSize,
		Kind:     "all",
		Sort:     "status",
		Order:    "asc",
	}

	page, err := parsePage(query)
	if err != nil {
		return q, false, err
	}
	q.Page = page

	pageSize, err := parsePageSize(query)
	if err != nil {
		return q, false, err
	}
	q.PageSize = pageSize

	if status := query.Get("status"); status != "" {
		switch status {
		case "pending", "checked", "completed":
			q.Status = status
		default:
			return q, false, fmt.Errorf("invalid status: %q", status)
		}
	}

	if kind := query.Get("kind"); kind != "" {
		switch kind {
		case "all", "general", "song":
			q.Kind = kind
		default:
			return q, false, fmt.Errorf("invalid kind: %q", kind)
		}
	}

	q.Search = query.Get("q")

	if sort := query.Get("sort"); sort != "" {
		switch sort {
		case "status", "createdAt", "tableNumber":
			q.Sort = sort
		default:
			return q, false, fmt.Errorf("invalid sort: %q", sort)
		}
	}

	// The default order depends on which sort ends up in effect (explicit or
	// default): "status" reads naturally ascending (pending first), every
	// other sort reads naturally descending (newest/latest first). This must
	// be resolved before applying an explicit "order" override below.
	if q.Sort == "status" {
		q.Order = "asc"
	} else {
		q.Order = "desc"
	}

	if order := query.Get("order"); order != "" {
		switch order {
		case "asc", "desc":
			q.Order = order
		default:
			return q, false, fmt.Errorf("invalid order: %q", order)
		}
	}

	return q, hasAnyQueryParam(query, customerRequestListParamKeys), nil
}

func parseSpecialRequestListQuery(query url.Values) (specialRequestListQuery, bool, error) {
	q := specialRequestListQuery{
		Page:     defaultListPage,
		PageSize: defaultListPageSize,
		Sort:     "createdAt",
		Order:    "desc",
	}

	page, err := parsePage(query)
	if err != nil {
		return q, false, err
	}
	q.Page = page

	pageSize, err := parsePageSize(query)
	if err != nil {
		return q, false, err
	}
	q.PageSize = pageSize

	if gender := query.Get("gender"); gender != "" {
		switch gender {
		case "male", "female":
			q.Gender = gender
		default:
			return q, false, fmt.Errorf("invalid gender: %q", gender)
		}
	}

	q.Search = query.Get("q")

	if sort := query.Get("sort"); sort != "" {
		switch sort {
		case "createdAt", "name":
			q.Sort = sort
		default:
			return q, false, fmt.Errorf("invalid sort: %q", sort)
		}
	}

	if order := query.Get("order"); order != "" {
		switch order {
		case "asc", "desc":
			q.Order = order
		default:
			return q, false, fmt.Errorf("invalid order: %q", order)
		}
	}

	return q, hasAnyQueryParam(query, specialRequestListParamKeys), nil
}
