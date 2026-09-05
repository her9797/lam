package store

import "testing"

func TestParsePaymentAmount(t *testing.T) {
	tests := []struct {
		name    string
		price   string
		want    int64
		wantErr bool
	}{
		{name: "formatted won price", price: "10,000원", want: 10000},
		{name: "plain won price", price: "9000원", want: 9000},
		{name: "surrounding whitespace", price: " 12,500원 ", want: 12500},
		{name: "range price", price: "15,000원~", wantErr: true},
		{name: "missing currency", price: "10000", wantErr: true},
		{name: "zero", price: "0원", wantErr: true},
		{name: "invalid grouping", price: "10,00원", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parsePaymentAmount(tt.price)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("parsePaymentAmount(%q) error = nil, want error", tt.price)
				}
				return
			}

			if err != nil {
				t.Fatalf("parsePaymentAmount(%q) error = %v", tt.price, err)
			}
			if got != tt.want {
				t.Fatalf("parsePaymentAmount(%q) = %d, want %d", tt.price, got, tt.want)
			}
		})
	}
}
