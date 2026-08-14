// Package brand exposes the Northsky brand identity to the Go web server so
// templates never hardcode the brand name.
//
// The canonical source of truth is `src/brand/brand.json`. bskyweb is a
// separate Go module, so `go:embed` cannot reach outside its own tree and the
// values have to be mirrored here; `brand_test.go` fails the build if they ever
// drift from that file.
package brand

import "net/url"

const (
	// AppName is `appName` from src/brand/brand.json.
	AppName = "Northsky"
	// OgSiteName is `ogSiteName` from src/brand/brand.json.
	OgSiteName = "Northsky"
	// TwitterHandle is `twitterHandle` from src/brand/brand.json.
	TwitterHandle = "@northsky"
	// BaseURL is `baseUrl` from src/brand/brand.json.
	BaseURL = "https://northsky.app"
	// EmbedServiceURL is `embedServiceUrl` from src/brand/brand.json.
	EmbedServiceURL = "https://embed.northsky.app"
)

// StagingHost serves the staging deployment of the web app. It has no entry in
// brand.json because it is deployment infrastructure, not brand identity.
const StagingHost = "staging.northsky.app"

// Host returns the hostname of BaseURL.
func Host() string {
	u, err := url.Parse(BaseURL)
	if err != nil {
		return ""
	}
	return u.Hostname()
}

// AllowsHost reports whether the host serves the web app. The oEmbed URL parser
// uses it to accept post URLs from production and staging.
func AllowsHost(host string) bool {
	return host == Host() || host == StagingHost
}
