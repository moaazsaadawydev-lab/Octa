package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// HTTPService handles outbound HTTP request execution, multipart/binary streaming, and file selection.
type HTTPService struct {
	ctx       context.Context
	transport *http.Transport
}

// NewHTTPService creates a new HTTPService with a shared, resource-friendly transport.
func NewHTTPService() *HTTPService {
	return &HTTPService{
		transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			DialContext: (&net.Dialer{
				Timeout:   8 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          25,
			MaxIdleConnsPerHost:   5,
			IdleConnTimeout:       60 * time.Second,
			TLSHandshakeTimeout:   8 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
	}
}

// SetContext sets the Wails runtime context.
func (s *HTTPService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// ExecuteHttpRequest executes an HTTP request from native Go, bypassing browser CORS & header restrictions.
func (s *HTTPService) ExecuteHttpRequest(payload HttpRequestPayload) (HttpResponsePayload, error) {
	result := HttpResponsePayload{
		Headers: make(map[string]string),
		Cookies: make([]string, 0),
	}

	rawURL := strings.TrimSpace(payload.URL)
	if rawURL == "" {
		result.Error = "URL cannot be empty"
		result.Status = 0
		result.StatusText = "Empty URL"
		return result, nil
	}

	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "http://" + rawURL
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		result.Error = fmt.Sprintf("Invalid URL: %v", err)
		result.Status = 0
		result.StatusText = "Invalid URL"
		return result, nil
	}

	if len(payload.QueryParams) > 0 {
		q := parsedURL.Query()
		for k, v := range payload.QueryParams {
			if strings.TrimSpace(k) != "" {
				q.Set(k, v)
			}
		}
		parsedURL.RawQuery = q.Encode()
	}

	method := strings.ToUpper(strings.TrimSpace(payload.Method))
	if method == "" {
		method = "GET"
	}

	reqBody, contentType, err := buildRequestBody(payload)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to prepare request body: %v", err)
		result.Status = 0
		result.StatusText = "Payload Error"
		return result, nil
	}

	httpReq, err := http.NewRequest(method, parsedURL.String(), reqBody)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to create request: %v", err)
		result.Status = 0
		result.StatusText = "Request Creation Error"
		return result, nil
	}

	for k, v := range payload.Headers {
		if strings.TrimSpace(k) != "" {
			// For form-data, skip any placeholder or static Content-Type header from request payload
			if payload.BodyType == "form-data" && strings.EqualFold(k, "Content-Type") {
				continue
			}
			httpReq.Header.Set(k, v)
		}
	}

	// Always set the dynamic Content-Type with writer boundary for form-data, or fallback if unset
	if payload.BodyType == "form-data" && contentType != "" {
		httpReq.Header.Set("Content-Type", contentType)
	} else if contentType != "" && httpReq.Header.Get("Content-Type") == "" {
		httpReq.Header.Set("Content-Type", contentType)
	}

	if httpReq.Header.Get("User-Agent") == "" {
		httpReq.Header.Set("User-Agent", "Octa-HttpClient/2.0")
	}

	timeoutSec := payload.TimeoutSec
	if timeoutSec <= 0 {
		timeoutSec = 30
	}

	client := &http.Client{
		Timeout:   time.Duration(timeoutSec) * time.Second,
		Transport: s.transport,
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	result.DurationMs = durationMs

	if err != nil {
		result.Error = fmt.Sprintf("Request failed: %v", err)
		result.Status = 0
		result.StatusText = "Network Error"
		return result, nil
	}
	defer resp.Body.Close()

	result.Status = resp.StatusCode
	result.StatusText = resp.Status

	for k, vals := range resp.Header {
		result.Headers[k] = strings.Join(vals, ", ")
	}

	for _, c := range resp.Cookies() {
		result.Cookies = append(result.Cookies, c.String())
	}

	respBodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to read response body: %v", err)
		return result, nil
	}

	result.SizeKb = float64(len(respBodyBytes)) / 1024.0

	var jsonParsed any
	if jsonErr := json.Unmarshal(respBodyBytes, &jsonParsed); jsonErr == nil {
		result.Data = jsonParsed
	} else {
		result.Data = string(respBodyBytes)
	}

	return result, nil
}
