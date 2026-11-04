package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"path/filepath"

	"github.com/bluesky-social/social-app/bskyweb/brand"
	"github.com/flosch/pongo2/v6"
	"github.com/labstack/echo/v4"
)

// northsky: brand identity available to every template, so no template has to
// hardcode the brand name
func applyBrandGlobals(globals pongo2.Context) {
	globals["appName"] = brand.AppName
	globals["ogSiteName"] = brand.OgSiteName
	globals["twitterHandle"] = brand.TwitterHandle
	globals["baseUrl"] = brand.BaseURL
	globals["embedServiceUrl"] = brand.EmbedServiceURL
}

type RendererLoader struct {
	prefix string
	fs     fs.FS
}

func NewRendererLoader(prefix string, fsys fs.FS) pongo2.TemplateLoader {
	return &RendererLoader{
		prefix: prefix,
		fs:     fsys,
	}
}
func (l *RendererLoader) Abs(_, name string) string {
	// TODO: remove this workaround
	// Figure out why this method is being called
	// twice on template names resulting in a failure to resolve
	// the template name.
	if filepath.HasPrefix(name, l.prefix) {
		return name
	}
	return filepath.Join(l.prefix, name)
}

func (l *RendererLoader) Get(path string) (io.Reader, error) {
	b, err := fs.ReadFile(l.fs, path)
	if err != nil {
		return nil, fmt.Errorf("reading template %q failed: %w", path, err)
	}
	return bytes.NewReader(b), nil
}

type Renderer struct {
	TemplateSet *pongo2.TemplateSet
	Debug       bool
}

func NewRenderer(prefix string, fsys fs.FS, debug bool) *Renderer {
	set := pongo2.NewSet(prefix, NewRendererLoader(prefix, fsys))
	// northsky: keep brand values out of the templates themselves
	applyBrandGlobals(set.Globals)
	applyBrandGlobals(pongo2.Globals)
	return &Renderer{
		TemplateSet: set,
		Debug:       debug,
	}
}

// SetDonationConfig publishes the donation config to every template, so that the
// app can read it at run time. See src/features/support/README.md
func (r *Renderer) SetDonationConfig(literal string) {
	r.TemplateSet.Globals["donationConfig"] = literal
	pongo2.Globals["donationConfig"] = literal
}

func (r Renderer) Render(w io.Writer, name string, data any, c echo.Context) error {
	// A new document load must revalidate both the app bundle and its gate snapshot.
	c.Response().Header().Set(echo.HeaderCacheControl, "no-cache")
	var ctx pongo2.Context

	if data != nil {
		var ok bool
		ctx, ok = data.(pongo2.Context)
		if !ok {
			return errors.New("no pongo2.Context data was passed")
		}
	}

	var t *pongo2.Template
	var err error

	if r.Debug {
		t, err = pongo2.FromFile(name)
	} else {
		t, err = r.TemplateSet.FromCache(name)
	}

	if err != nil {
		return err
	}

	return t.ExecuteWriter(ctx, w)
}
