// northsky: donation checkout for the Support screen. Stripe removed the
// client-only checkout flow, so the browser cannot mint a Checkout Session. This
// file holds the two routes that do it, so that the app needs no separate
// payment service. Donations need no fulfillment beyond the receipt that Stripe
// sends, so there are no webhooks and no stored state.

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/bluesky-social/social-app/bskyweb/brand"
	"github.com/labstack/echo/v4"
)

const (
	stripeAPIBase     = "https://api.stripe.com"
	stripeAPIVersion  = "2026-03-25.dahlia"
	intervalOneTime   = "one_time"
	intervalMonthly   = "month"
	maxDidLength      = 512
	maxSessionIDChars = 255
)

var (
	errUnknownInterval = errors.New("unknown donation interval")
	errAmountRange     = errors.New("donation amount is out of range")
	sessionIDPattern   = regexp.MustCompile(`^cs_[A-Za-z0-9_]+$`)
)

// donationsConfig holds everything the donation routes need. The secret key is
// the only sensitive value in it and never leaves this process.
type donationsConfig struct {
	secretKey      string
	publishableKey string
	currency       string
	presetsCents   []int64
	minCents       int64
	maxCents       int64
	returnBaseURL  string
	// paymentMethodConfiguration selects which set of payment methods Stripe
	// offers. The set itself is managed in the dashboard. IDs differ between
	// test mode and live mode.
	paymentMethodConfiguration string
	// apiBase points at Stripe. Tests point it at a local server.
	apiBase string
}

// enabled reports whether the deployment configured a Stripe secret key. When it
// did not, the routes are not registered and the app falls back to payment
// links.
func (cfg *donationsConfig) enabled() bool {
	return cfg != nil && cfg.secretKey != ""
}

// isLocalhostOrigin reports whether an origin is a local development server.
// It is used in debug mode only.
func isLocalhostOrigin(origin string) bool {
	return strings.HasPrefix(origin, "http://localhost:") ||
		strings.HasPrefix(origin, "http://127.0.0.1:")
}

// clientConfigLiteral builds the donation config that the app reads, as a
// JavaScript string literal. The payment links come from DONATION_LINKS, and
// everything else from this process, which is the only place that knows whether
// a Stripe key is present. An empty result leaves the app on its build-time
// config.
func (cfg *donationsConfig) clientConfigLiteral() string {
	config := map[string]any{}

	if raw := os.Getenv("DONATION_LINKS"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &config); err != nil {
			slog.Warn("DONATION_LINKS is not valid JSON; payment links are unavailable")
			config = map[string]any{}
		}
	}

	config["currency"] = cfg.currency
	config["presetsCents"] = cfg.presetsCents
	config["minCents"] = cfg.minCents
	config["maxCents"] = cfg.maxCents
	config["checkout"] = cfg.enabled()
	if cfg.publishableKey != "" {
		config["publishableKey"] = cfg.publishableKey
	}

	encoded, err := json.Marshal(config)
	if err != nil {
		slog.Error("could not encode the donation config", "err", err)
		return ""
	}

	return jsStringLiteral(string(encoded))
}

// jsStringLiteral quotes a value for use inside a script element. It escapes the
// characters that can close the element or break a line in JavaScript.
func jsStringLiteral(value string) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return strings.NewReplacer(
		"<", `\u003c`,
		">", `\u003e`,
		"&", `\u0026`,
		"\u2028", `\u2028`,
		"\u2029", `\u2029`,
	).Replace(string(encoded))
}

type donationSessionRequest struct {
	AmountCents int64  `json:"amountCents"`
	Interval    string `json:"interval"`
	Did         string `json:"did,omitempty"`
}

type donationSessionResponse struct {
	ClientSecret string `json:"clientSecret"`
}

type donationStatusResponse struct {
	Status string `json:"status"`
}

type donationErrorResponse struct {
	Error string `json:"error"`
}

// parsePresetsCents reads a comma separated list of amounts. Invalid entries are
// dropped, because a bad preset must not stop the service from starting.
func parsePresetsCents(raw string) []int64 {
	presets := []int64{}
	for _, field := range strings.Split(raw, ",") {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		amount, err := strconv.ParseInt(field, 10, 64)
		if err != nil || amount <= 0 {
			slog.Warn("ignoring invalid donation preset", "value", field)
			continue
		}
		presets = append(presets, amount)
	}
	return presets
}

// donationSessionForm builds the Stripe request body. It is pure, so the shape
// of the request can be tested without a network call.
func donationSessionForm(cfg *donationsConfig, req donationSessionRequest) (url.Values, error) {
	if req.AmountCents < cfg.minCents || req.AmountCents > cfg.maxCents {
		return nil, errAmountRange
	}

	form := url.Values{}
	form.Set("ui_mode", "embedded_page")
	form.Set("submit_type", "donate")
	form.Set("return_url", cfg.returnBaseURL+"/support?session_id={CHECKOUT_SESSION_ID}")
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", cfg.currency)
	form.Set("line_items[0][price_data][product_data][name]", fmt.Sprintf("Donation to %s", brand.AppName))
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(req.AmountCents, 10))

	if cfg.paymentMethodConfiguration != "" {
		form.Set("payment_method_configuration", cfg.paymentMethodConfiguration)
	}

	switch req.Interval {
	case intervalOneTime:
		form.Set("mode", "payment")
	case intervalMonthly:
		form.Set("mode", "subscription")
		form.Set("line_items[0][price_data][recurring][interval]", "month")
	default:
		return nil, errUnknownInterval
	}

	// The DID is a hint for reporting only. A caller can send any value, so a
	// malformed one is dropped rather than treated as an error.
	if did := req.Did; strings.HasPrefix(did, "did:") && len(did) <= maxDidLength {
		form.Set("metadata[did]", did)
	}

	return form, nil
}

func (srv *Server) stripeRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, srv.donations.apiBase+path, body)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(srv.donations.secretKey, "")
	req.Header.Set("Stripe-Version", stripeAPIVersion)
	if body != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	return req, nil
}

// stripeJSON runs the request and decodes the response into out. Stripe's error
// text is logged but never returned to the caller.
func (srv *Server) stripeJSON(req *http.Request, out any) error {
	resp, err := srv.donationsClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		slog.Error("stripe request failed", "status", resp.StatusCode, "detail", string(detail))
		return fmt.Errorf("stripe returned status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(out)
}

// DonationSession creates a Checkout Session and returns its client secret. The
// amount is validated here because the browser cannot be trusted with a price.
func (srv *Server) DonationSession(c echo.Context) error {
	var body donationSessionRequest
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, donationErrorResponse{Error: "invalid request"})
	}

	form, err := donationSessionForm(srv.donations, body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, donationErrorResponse{Error: err.Error()})
	}

	req, err := srv.stripeRequest(c.Request().Context(), http.MethodPost, "/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		slog.Error("could not build the Stripe request", "err", err)
		return c.JSON(http.StatusInternalServerError, donationErrorResponse{Error: "could not start the payment"})
	}

	var session struct {
		ClientSecret string `json:"client_secret"`
	}
	if err := srv.stripeJSON(req, &session); err != nil {
		slog.Error("could not create the donation session", "err", err)
		return c.JSON(http.StatusBadGateway, donationErrorResponse{Error: "could not start the payment"})
	}

	return c.JSON(http.StatusOK, donationSessionResponse{ClientSecret: session.ClientSecret})
}

// DonationStatus reports whether a session completed. It returns the status only,
// so that no customer detail passes through this service.
func (srv *Server) DonationStatus(c echo.Context) error {
	id := c.QueryParam("session_id")
	if len(id) > maxSessionIDChars || !sessionIDPattern.MatchString(id) {
		return c.JSON(http.StatusBadRequest, donationErrorResponse{Error: "invalid session id"})
	}

	req, err := srv.stripeRequest(c.Request().Context(), http.MethodGet, "/v1/checkout/sessions/"+id, nil)
	if err != nil {
		slog.Error("could not build the Stripe request", "err", err)
		return c.JSON(http.StatusInternalServerError, donationErrorResponse{Error: "could not read the payment"})
	}

	var session struct {
		Status string `json:"status"`
	}
	if err := srv.stripeJSON(req, &session); err != nil {
		slog.Error("could not read the donation session", "err", err)
		return c.JSON(http.StatusBadGateway, donationErrorResponse{Error: "could not read the payment"})
	}

	return c.JSON(http.StatusOK, donationStatusResponse{Status: session.Status})
}
