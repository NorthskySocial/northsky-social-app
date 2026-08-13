package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func testDonationsConfig(apiBase string) *donationsConfig {
	return &donationsConfig{
		secretKey:     "sk_test_kusanagi",
		currency:      "usd",
		presetsCents:  []int64{500, 1000},
		minCents:      100,
		maxCents:      100000,
		returnBaseURL: "https://northsky.app",
		apiBase:       apiBase,
	}
}

func TestDonationsEnabled(t *testing.T) {
	if (&donationsConfig{}).enabled() {
		t.Fatal("expected donations to be disabled without a secret key")
	}
	if !testDonationsConfig("").enabled() {
		t.Fatal("expected donations to be enabled with a secret key")
	}
}

func TestClientConfigLiteral(t *testing.T) {
	t.Run("merges the links with what only the server knows", func(t *testing.T) {
		t.Setenv("DONATION_LINKS", `{"oneTime":{"500":"https://donate.stripe.com/five"}}`)
		cfg := testDonationsConfig("")

		literal := cfg.clientConfigLiteral()

		var quoted string
		if err := json.Unmarshal([]byte(literal), &quoted); err != nil {
			t.Fatalf("the literal is not a JavaScript string: %v", err)
		}
		var config struct {
			Currency     string            `json:"currency"`
			Checkout     bool              `json:"checkout"`
			PresetsCents []int64           `json:"presetsCents"`
			MinCents     int64             `json:"minCents"`
			OneTime      map[string]string `json:"oneTime"`
		}
		if err := json.Unmarshal([]byte(quoted), &config); err != nil {
			t.Fatalf("could not read the config: %v", err)
		}
		if !config.Checkout {
			t.Error("expected checkout to be available with a secret key")
		}
		if config.Currency != "usd" || config.MinCents != 100 {
			t.Errorf("unexpected config: %+v", config)
		}
		if len(config.PresetsCents) != 2 {
			t.Errorf("expected the presets, got %v", config.PresetsCents)
		}
		if config.OneTime["500"] != "https://donate.stripe.com/five" {
			t.Errorf("expected the payment links to survive, got %v", config.OneTime)
		}
	})

	t.Run("reports checkout as unavailable without a secret key", func(t *testing.T) {
		t.Setenv("DONATION_LINKS", "")
		cfg := testDonationsConfig("")
		cfg.secretKey = ""

		literal := cfg.clientConfigLiteral()
		if !strings.Contains(literal, `checkout\":false`) {
			t.Errorf("expected checkout to be false, got %s", literal)
		}
	})

	t.Run("survives invalid links", func(t *testing.T) {
		t.Setenv("DONATION_LINKS", "{nope")
		if literal := testDonationsConfig("").clientConfigLiteral(); !strings.Contains(literal, `currency`) {
			t.Errorf("expected a usable config, got %s", literal)
		}
	})

	t.Run("never leaks the secret key", func(t *testing.T) {
		t.Setenv("DONATION_LINKS", "")
		if literal := testDonationsConfig("").clientConfigLiteral(); strings.Contains(literal, "sk_test") {
			t.Fatal("the secret key must not reach the page")
		}
	})
}

func TestJsStringLiteral(t *testing.T) {
	got := jsStringLiteral(`{"note":"</script><img src=x onerror=alert(1)>"}`)
	if strings.ContainsAny(got, "<>") {
		t.Fatalf("the literal still contains raw angle brackets: %s", got)
	}
	if !strings.Contains(got, `\u003c/script`) {
		t.Fatalf("expected the script tag to be escaped, got %s", got)
	}
}

func TestParsePresetsCents(t *testing.T) {
	got := parsePresetsCents("500, 1000 ,notanumber,,-5,2500")
	want := []int64{500, 1000, 2500}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

func TestDonationSessionForm(t *testing.T) {
	cfg := testDonationsConfig("")

	t.Run("one time payment", func(t *testing.T) {
		form, err := donationSessionForm(cfg, donationSessionRequest{
			AmountCents: 700,
			Interval:    intervalOneTime,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expect := map[string]string{
			"ui_mode":                                "embedded_page",
			"submit_type":                            "donate",
			"mode":                                   "payment",
			"return_url":                             "https://northsky.app/support?session_id={CHECKOUT_SESSION_ID}",
			"line_items[0][price_data][unit_amount]": "700",
			"line_items[0][price_data][currency]":    "usd",
			"line_items[0][quantity]":                "1",
		}
		for key, want := range expect {
			if got := form.Get(key); got != want {
				t.Errorf("%s: expected %q, got %q", key, want, got)
			}
		}
		if form.Has("line_items[0][price_data][recurring][interval]") {
			t.Error("a one-time donation must not carry a recurring interval")
		}
	})

	t.Run("monthly subscription at any amount", func(t *testing.T) {
		form, err := donationSessionForm(cfg, donationSessionRequest{
			AmountCents: 1337,
			Interval:    intervalMonthly,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got := form.Get("mode"); got != "subscription" {
			t.Errorf("expected subscription mode, got %q", got)
		}
		if got := form.Get("line_items[0][price_data][recurring][interval]"); got != "month" {
			t.Errorf("expected a monthly interval, got %q", got)
		}
		if got := form.Get("line_items[0][price_data][unit_amount]"); got != "1337" {
			t.Errorf("expected the requested amount, got %q", got)
		}
	})

	t.Run("rejects an amount below the minimum", func(t *testing.T) {
		if _, err := donationSessionForm(cfg, donationSessionRequest{AmountCents: 50, Interval: intervalOneTime}); err != errAmountRange {
			t.Fatalf("expected errAmountRange, got %v", err)
		}
	})

	t.Run("rejects an amount above the maximum", func(t *testing.T) {
		if _, err := donationSessionForm(cfg, donationSessionRequest{AmountCents: 100001, Interval: intervalOneTime}); err != errAmountRange {
			t.Fatalf("expected errAmountRange, got %v", err)
		}
	})

	t.Run("rejects an unknown interval", func(t *testing.T) {
		if _, err := donationSessionForm(cfg, donationSessionRequest{AmountCents: 500, Interval: "weekly"}); err != errUnknownInterval {
			t.Fatalf("expected errUnknownInterval, got %v", err)
		}
	})

	t.Run("omits the payment method configuration when unset", func(t *testing.T) {
		form, err := donationSessionForm(cfg, donationSessionRequest{
			AmountCents: 500,
			Interval:    intervalOneTime,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if form.Has("payment_method_configuration") {
			t.Error("expected Stripe to use the default configuration")
		}
	})

	t.Run("sends the payment method configuration when set", func(t *testing.T) {
		configured := testDonationsConfig("")
		configured.paymentMethodConfiguration = "pmc_batou"

		form, err := donationSessionForm(configured, donationSessionRequest{
			AmountCents: 500,
			Interval:    intervalOneTime,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got := form.Get("payment_method_configuration"); got != "pmc_batou" {
			t.Errorf("expected the configuration id, got %q", got)
		}
	})

	t.Run("keeps a well formed did", func(t *testing.T) {
		form, err := donationSessionForm(cfg, donationSessionRequest{
			AmountCents: 500,
			Interval:    intervalOneTime,
			Did:         "did:plc:motoko",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got := form.Get("metadata[did]"); got != "did:plc:motoko" {
			t.Errorf("expected the did in metadata, got %q", got)
		}
	})

	t.Run("drops a malformed did", func(t *testing.T) {
		form, err := donationSessionForm(cfg, donationSessionRequest{
			AmountCents: 500,
			Interval:    intervalOneTime,
			Did:         "batou",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if form.Has("metadata[did]") {
			t.Error("expected a malformed did to be dropped")
		}
	})
}

// newDonationsTestServer returns a Server whose Stripe calls go to the given
// handler instead of the network.
func newDonationsTestServer(t *testing.T, handler http.HandlerFunc) (*Server, *echo.Echo) {
	t.Helper()
	stripe := httptest.NewServer(handler)
	t.Cleanup(stripe.Close)
	return &Server{donations: testDonationsConfig(stripe.URL)}, echo.New()
}

func TestDonationSessionHandler(t *testing.T) {
	t.Run("returns the client secret", func(t *testing.T) {
		var received url.Values
		srv, e := newDonationsTestServer(t, func(w http.ResponseWriter, r *http.Request) {
			if err := r.ParseForm(); err != nil {
				t.Errorf("could not parse the form: %v", err)
			}
			received = r.PostForm
			if user, _, ok := r.BasicAuth(); !ok || user != "sk_test_kusanagi" {
				t.Errorf("expected the secret key as basic auth, got %q", user)
			}
			if got := r.Header.Get("Stripe-Version"); got != stripeAPIVersion {
				t.Errorf("expected a pinned API version, got %q", got)
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"client_secret":"cs_test_secret"}`))
		})

		req := httptest.NewRequest(http.MethodPost, "/api/donations/session", strings.NewReader(`{"amountCents":700,"interval":"one_time"}`))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		if err := srv.DonationSession(e.NewContext(req, rec)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var body donationSessionResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("could not read the response: %v", err)
		}
		if body.ClientSecret != "cs_test_secret" {
			t.Errorf("expected the client secret, got %q", body.ClientSecret)
		}
		if got := received.Get("ui_mode"); got != "embedded_page" {
			t.Errorf("expected an embedded session, got %q", got)
		}
	})

	t.Run("rejects an amount out of range before calling Stripe", func(t *testing.T) {
		srv, e := newDonationsTestServer(t, func(w http.ResponseWriter, r *http.Request) {
			t.Error("Stripe must not be called for an invalid amount")
		})

		req := httptest.NewRequest(http.MethodPost, "/api/donations/session", strings.NewReader(`{"amountCents":1,"interval":"one_time"}`))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		if err := srv.DonationSession(e.NewContext(req, rec)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("hides Stripe failures", func(t *testing.T) {
		srv, e := newDonationsTestServer(t, func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusPaymentRequired)
			w.Write([]byte(`{"error":{"message":"secret key revoked"}}`))
		})

		req := httptest.NewRequest(http.MethodPost, "/api/donations/session", strings.NewReader(`{"amountCents":500,"interval":"one_time"}`))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		if err := srv.DonationSession(e.NewContext(req, rec)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusBadGateway {
			t.Fatalf("expected 502, got %d", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "revoked") {
			t.Error("the response must not repeat the Stripe error")
		}
	})
}

func TestDonationStatusHandler(t *testing.T) {
	t.Run("returns the status only", func(t *testing.T) {
		srv, e := newDonationsTestServer(t, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/v1/checkout/sessions/cs_test_123" {
				t.Errorf("unexpected path %q", r.URL.Path)
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"status":"complete","customer_details":{"email":"motoko@example.com"}}`))
		})

		req := httptest.NewRequest(http.MethodGet, "/api/donations/status?session_id=cs_test_123", nil)
		rec := httptest.NewRecorder()

		if err := srv.DonationStatus(e.NewContext(req, rec)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "example.com") {
			t.Error("the response must not carry customer details")
		}

		var body donationStatusResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("could not read the response: %v", err)
		}
		if body.Status != "complete" {
			t.Errorf("expected complete, got %q", body.Status)
		}
	})

	t.Run("rejects a malformed session id", func(t *testing.T) {
		srv, e := newDonationsTestServer(t, func(w http.ResponseWriter, r *http.Request) {
			t.Error("Stripe must not be called for a malformed session id")
		})

		for _, id := range []string{"", "pi_123", "cs_123/../../secrets", "cs_123?x=1"} {
			req := httptest.NewRequest(http.MethodGet, "/api/donations/status?session_id="+url.QueryEscape(id), nil)
			rec := httptest.NewRecorder()

			if err := srv.DonationStatus(e.NewContext(req, rec)); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if rec.Code != http.StatusBadRequest {
				t.Errorf("id %q: expected 400, got %d", id, rec.Code)
			}
		}
	})
}
