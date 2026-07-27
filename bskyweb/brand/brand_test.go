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
		AppName       string `json:"appName"`
		OgSiteName    string `json:"ogSiteName"`
		TwitterHandle string `json:"twitterHandle"`
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
