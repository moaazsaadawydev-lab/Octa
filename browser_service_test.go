package main

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
)

func TestBrowserServiceProxyAndHeaderStripping(t *testing.T) {
	// 1. Create a dummy test server that emits X-Frame-Options: DENY, CSP, and Lax Set-Cookie
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to create listener: %v", err)
	}
	defer listener.Close()

	port := listener.Addr().(*net.TCPAddr).Port
	targetURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Content-Security-Policy", "frame-ancestors 'none'")
		w.Header().Set("Server", "TestMockServer")
		w.Header().Add("Set-Cookie", "token=secret123; Path=/; SameSite=Lax")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<h1>Mock Embedded App</h1>"))
	})

	server := &http.Server{Handler: handler}
	go func() {
		_ = server.Serve(listener)
	}()
	defer server.Close()

	// 2. Test CheckLocalhostStatus
	svc := NewBrowserService()
	defer svc.CloseAllProxies()

	status, err := svc.CheckLocalhostStatus(targetURL)
	if err != nil {
		t.Fatalf("CheckLocalhostStatus returned error: %v", err)
	}
	if !status.IsOnline {
		t.Errorf("Expected IsOnline to be true")
	}
	if !status.HasFrameBlock {
		t.Errorf("Expected HasFrameBlock to be true due to X-Frame-Options")
	}

	// 3. Test GetLocalhostProxy
	proxyURL, err := svc.GetLocalhostProxy(targetURL)
	if err != nil {
		t.Fatalf("GetLocalhostProxy returned error: %v", err)
	}
	if !strings.HasPrefix(proxyURL, "http://127.0.0.1:") {
		t.Errorf("Expected proxyURL to start with http://127.0.0.1:, got %s", proxyURL)
	}

	// 4. Fetch through the proxy and verify headers are stripped and cookie rewritten
	resp, err := http.Get(proxyURL)
	if err != nil {
		t.Fatalf("Failed to fetch through proxy: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", resp.StatusCode)
	}
	if xfo := resp.Header.Get("X-Frame-Options"); xfo != "" {
		t.Errorf("Expected X-Frame-Options to be stripped, got: %s", xfo)
	}
	if csp := resp.Header.Get("Content-Security-Policy"); csp != "" {
		t.Errorf("Expected Content-Security-Policy to be stripped, got: %s", csp)
	}

	cookie := resp.Header.Get("Set-Cookie")
	if !strings.Contains(cookie, "SameSite=None") || !strings.Contains(cookie, "Partitioned") {
		t.Errorf("Expected cookie to be rewritten with SameSite=None and Partitioned, got: %s", cookie)
	}
}

func TestInjectCookiePolyfill(t *testing.T) {
	// 1. Non-HTML response should not be modified
	respJSON := &http.Response{
		Header: http.Header{"Content-Type": []string{"application/json"}},
		Body:   io.NopCloser(strings.NewReader(`{"status":"ok"}`)),
	}
	injectCookiePolyfill(respJSON)
	bodyJSON, _ := io.ReadAll(respJSON.Body)
	if string(bodyJSON) != `{"status":"ok"}` {
		t.Errorf("Expected json body to remain untouched, got: %s", string(bodyJSON))
	}

	// 2. HTML response with <head> should have polyfill injected
	respHTML := &http.Response{
		Header: http.Header{"Content-Type": []string{"text/html; charset=utf-8"}},
		Body:   io.NopCloser(strings.NewReader("<!DOCTYPE html><html><head><title>App</title></head><body></body></html>")),
	}
	injectCookiePolyfill(respHTML)
	bodyHTML, _ := io.ReadAll(respHTML.Body)
	if !strings.Contains(string(bodyHTML), "__octa_c_") {
		t.Errorf("Expected polyfill script to be injected into HTML, got: %s", string(bodyHTML))
	}
}

