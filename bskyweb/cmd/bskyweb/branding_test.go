package main

import (
	"strings"
	"testing"

	"github.com/flosch/pongo2/v6"
)

func TestRenderHomeBranding(t *testing.T) {
	html := renderTemplate(t, "home.html", pongo2.Context{})
	for _, expected := range []string{
		`<h1 lang="en">Northsky</h1>`,
		`Enable JavaScript to use Northsky.`,
		`Learn more about Northsky at <a href="https://northsky.app">https://northsky.app</a>`,
		`<a href="https://atproto.com">atproto.com</a>`,
		`<meta property="og:title" content="Northsky" />`,
		`<link rel="canonical" href="https://northsky.app" />`,
	} {
		if !strings.Contains(html, expected) {
			t.Errorf("rendered home missing %q", expected)
		}
	}
	for _, unexpected := range []string{"use Bluesky", "about Bluesky", `<h1 lang="en">Bluesky</h1>`} {
		if strings.Contains(html, unexpected) {
			t.Errorf("rendered home contains upstream branding %q", unexpected)
		}
	}
}
