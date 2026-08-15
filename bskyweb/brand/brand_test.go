package brand

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// brandJSONPath is the canonical brand identity file, relative to this package.
const brandJSONPath = "../../src/brand/brand.json"

// TestMatchesBrandJSON guards against drift between the Go mirror and the
// canonical `src/brand/brand.json` consumed by the app and `app.config.js`.
//
// The file lives outside this module, so the Go test cache does not invalidate
// on changes to it; run with `-count=1` after editing brand.json.
func TestMatchesBrandJSON(t *testing.T) {
	raw, err := os.ReadFile(filepath.Clean(brandJSONPath))
	if err != nil {
		t.Fatalf("reading %s: %v", brandJSONPath, err)
	}

	var identity struct {
		AppName         string `json:"appName"`
		OgSiteName      string `json:"ogSiteName"`
		TwitterHandle   string `json:"twitterHandle"`
		BaseURL         string `json:"baseUrl"`
		EmbedServiceURL string `json:"embedServiceUrl"`
	}
	if err := json.Unmarshal(raw, &identity); err != nil {
		t.Fatalf("parsing %s: %v", brandJSONPath, err)
	}

	for _, tc := range []struct {
		field string
		got   string
		want  string
	}{
		{"appName", AppName, identity.AppName},
		{"ogSiteName", OgSiteName, identity.OgSiteName},
		{"twitterHandle", TwitterHandle, identity.TwitterHandle},
		{"baseUrl", BaseURL, identity.BaseURL},
		{"embedServiceUrl", EmbedServiceURL, identity.EmbedServiceURL},
	} {
		if tc.want == "" {
			t.Errorf("%s is missing from %s", tc.field, brandJSONPath)
			continue
		}
		if tc.got != tc.want {
			t.Errorf("%s drifted: Go has %q, %s has %q", tc.field, tc.got, brandJSONPath, tc.want)
		}
	}
}

func TestHost(t *testing.T) {
	if got, want := Host(), "northsky.app"; got != want {
		t.Errorf("Host() = %q, want %q", got, want)
	}
}

func TestAllowsHost(t *testing.T) {
	for _, tc := range []struct {
		host string
		want bool
	}{
		{"northsky.app", true},
		{"staging.northsky.app", true},
		{"bsky.app", false},
		{"northsky.app.evil.example", false},
		{"", false},
	} {
		if got := AllowsHost(tc.host); got != tc.want {
			t.Errorf("AllowsHost(%q) = %v, want %v", tc.host, got, tc.want)
		}
	}
}
