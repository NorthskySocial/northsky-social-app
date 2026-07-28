// Package brand exposes the Northsky brand identity to the Go web server so
// templates never hardcode the brand name.
//
// The canonical source of truth is `src/brand/brand.json`. bskyweb is a
// separate Go module, so `go:embed` cannot reach outside its own tree and the
// values have to be mirrored here; `brand_test.go` fails the build if they ever
// drift from that file.
package brand

const (
	// AppName is `appName` from src/brand/brand.json.
	AppName = "Northsky"
	// OgSiteName is `ogSiteName` from src/brand/brand.json.
	OgSiteName = "Northsky"
	// TwitterHandle is `twitterHandle` from src/brand/brand.json.
	TwitterHandle = "@northsky"
)
