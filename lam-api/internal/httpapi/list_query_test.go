package httpapi

import (
	"net/url"
	"testing"
)

func TestParseCustomerRequestListQuery_Defaults(t *testing.T) {
	q, hasParams, err := parseCustomerRequestListQuery(url.Values{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hasParams {
		t.Error("hasParams = true, want false when no recognized query key is present")
	}
	if q.Page != 1 || q.PageSize != 20 || q.Status != "" || q.Kind != "all" ||
		q.Search != "" || q.Sort != "status" || q.Order != "asc" {
		t.Errorf("defaults = %+v, want page=1 pageSize=20 status=\"\" kind=all sort=status order=asc", q)
	}
}

func TestParseCustomerRequestListQuery_HasParamsWhenAnyRecognizedKeyPresent(t *testing.T) {
	cases := []struct {
		name  string
		query url.Values
	}{
		{"page", url.Values{"page": {"2"}}},
		{"pageSize", url.Values{"pageSize": {"50"}}},
		{"status", url.Values{"status": {"pending"}}},
		{"kind", url.Values{"kind": {"song"}}},
		{"q", url.Values{"q": {"napkin"}}},
		{"sort", url.Values{"sort": {"createdAt"}}},
		{"order", url.Values{"order": {"desc"}}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, hasParams, err := parseCustomerRequestListQuery(tc.query)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !hasParams {
				t.Errorf("hasParams = false, want true when %q is present", tc.name)
			}
		})
	}
}

func TestParseCustomerRequestListQuery_ValidValues(t *testing.T) {
	query := url.Values{
		"page":     {"3"},
		"pageSize": {"50"},
		"status":   {"checked"},
		"kind":     {"song"},
		"q":        {"napkin"},
		"sort":     {"createdAt"},
		"order":    {"asc"},
	}

	q, hasParams, err := parseCustomerRequestListQuery(query)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !hasParams {
		t.Error("hasParams = false, want true")
	}
	if q.Page != 3 || q.PageSize != 50 || q.Status != "checked" || q.Kind != "song" ||
		q.Search != "napkin" || q.Sort != "createdAt" || q.Order != "asc" {
		t.Errorf("parsed = %+v, want the given values", q)
	}
}

func TestParseCustomerRequestListQuery_DefaultOrderDependsOnSort(t *testing.T) {
	t.Run("sort=status defaults to asc", func(t *testing.T) {
		q, _, err := parseCustomerRequestListQuery(url.Values{"sort": {"status"}})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if q.Order != "asc" {
			t.Errorf("order = %q, want asc", q.Order)
		}
	})

	t.Run("sort=createdAt defaults to desc", func(t *testing.T) {
		q, _, err := parseCustomerRequestListQuery(url.Values{"sort": {"createdAt"}})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if q.Order != "desc" {
			t.Errorf("order = %q, want desc", q.Order)
		}
	})
}

func TestParseCustomerRequestListQuery_InvalidValuesRejected(t *testing.T) {
	cases := []struct {
		name  string
		query url.Values
	}{
		{"page zero", url.Values{"page": {"0"}}},
		{"page not a number", url.Values{"page": {"abc"}}},
		{"pageSize zero", url.Values{"pageSize": {"0"}}},
		{"pageSize over max", url.Values{"pageSize": {"101"}}},
		{"unknown status", url.Values{"status": {"archived"}}},
		{"unknown kind", url.Values{"kind": {"birthday"}}},
		{"unknown sort", url.Values{"sort": {"id"}}},
		{"unknown order", url.Values{"order": {"random"}}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := parseCustomerRequestListQuery(tc.query); err == nil {
				t.Errorf("parseCustomerRequestListQuery(%v) returned nil error, want a validation error", tc.query)
			}
		})
	}
}

func TestParseSpecialRequestListQuery_Defaults(t *testing.T) {
	q, hasParams, err := parseSpecialRequestListQuery(url.Values{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hasParams {
		t.Error("hasParams = true, want false when no recognized query key is present")
	}
	if q.Page != 1 || q.PageSize != 20 || q.Gender != "" || q.Search != "" ||
		q.Sort != "createdAt" || q.Order != "desc" {
		t.Errorf("defaults = %+v, want page=1 pageSize=20 gender=\"\" sort=createdAt order=desc", q)
	}
}

func TestParseSpecialRequestListQuery_ValidValues(t *testing.T) {
	query := url.Values{
		"page":     {"2"},
		"pageSize": {"10"},
		"gender":   {"female"},
		"q":        {"seoul"},
		"sort":     {"name"},
		"order":    {"asc"},
	}

	q, hasParams, err := parseSpecialRequestListQuery(query)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !hasParams {
		t.Error("hasParams = false, want true")
	}
	if q.Page != 2 || q.PageSize != 10 || q.Gender != "female" || q.Search != "seoul" ||
		q.Sort != "name" || q.Order != "asc" {
		t.Errorf("parsed = %+v, want the given values", q)
	}
}

func TestParseSpecialRequestListQuery_InvalidValuesRejected(t *testing.T) {
	cases := []struct {
		name  string
		query url.Values
	}{
		{"unknown gender", url.Values{"gender": {"unspecified"}}},
		{"unknown sort", url.Values{"sort": {"age"}}},
		{"unknown order", url.Values{"order": {"random"}}},
		{"pageSize over max", url.Values{"pageSize": {"101"}}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := parseSpecialRequestListQuery(tc.query); err == nil {
				t.Errorf("parseSpecialRequestListQuery(%v) returned nil error, want a validation error", tc.query)
			}
		})
	}
}
