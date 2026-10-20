package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"
)

// LocalhostStatus represents the health and embedding status of a local port.
type LocalhostStatus struct {
	IsOnline      bool   `json:"isOnline"`
	StatusCode    int    `json:"statusCode"`
	HasFrameBlock bool   `json:"hasFrameBlock"`
	ServerName    string `json:"serverName"`
}

type proxyEntry struct {
	targetBase string
	proxyBase  string
	listener   net.Listener
	server     *http.Server
}

// BrowserService manages ephemeral loopback reverse proxies to bypass
// X-Frame-Options: DENY and CSP frame-ancestors restrictions on localhost.
type BrowserService struct {
	mu      sync.RWMutex
	proxies map[string]*proxyEntry
}

// NewBrowserService instantiates a new BrowserService.
func NewBrowserService() *BrowserService {
	return &BrowserService{
		proxies: make(map[string]*proxyEntry),
	}
}

// GetLocalhostProxy creates or retrieves an ephemeral loopback reverse proxy
// that strips frame blocking headers for the specified target host.
func (s *BrowserService) GetLocalhostProxy(targetURL string) (string, error) {
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		targetURL = "http://" + targetURL
	}

	parsed, err := url.Parse(targetURL)
	if err != nil {
		return targetURL, err
	}

	hostname := strings.ToLower(parsed.Hostname())
	if hostname != "localhost" && hostname != "127.0.0.1" && hostname != "::1" && hostname != "[::1]" {
		return targetURL, nil
	}

	targetBaseKey := fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)

	s.mu.RLock()
	if entry, exists := s.proxies[targetBaseKey]; exists {
		s.mu.RUnlock()
		return entry.proxyBase, nil
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	if entry, exists := s.proxies[targetBaseKey]; exists {
		return entry.proxyBase, nil
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return targetURL, fmt.Errorf("failed to allocate proxy listener: %w", err)
	}

	port := listener.Addr().(*net.TCPAddr).Port
	proxyBase := fmt.Sprintf("http://127.0.0.1:%d", port)

	targetBaseURL, err := url.Parse(targetBaseKey)
	if err != nil {
		_ = listener.Close()
		return targetURL, err
	}

	proxy := httputil.NewSingleHostReverseProxy(targetBaseURL)
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	transport.Proxy = nil
	proxy.Transport = transport
	proxy.FlushInterval = -1

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = targetBaseURL.Host
		req.Header.Set("X-Forwarded-Host", req.Host)
		req.Header.Set("X-Forwarded-Proto", targetBaseURL.Scheme)
		req.Header.Set("X-Real-IP", "127.0.0.1")

		// Match Origin to target host for WebSockets & CORS validation
		if req.Header.Get("Origin") != "" {
			req.Header.Set("Origin", targetBaseKey)
		}
		// Match Referer to target origin
		if ref := req.Header.Get("Referer"); ref != "" {
			req.Header.Set("Referer", strings.Replace(ref, proxyBase, targetBaseKey, 1))
		}
		req.Header.Del("Accept-Encoding")
	}

	proxy.ModifyResponse = func(res *http.Response) error {
		if res.StatusCode == http.StatusSwitchingProtocols {
			return nil
		}
		res.Header.Del("X-Frame-Options")
		res.Header.Del("Content-Security-Policy")
		res.Header.Del("Content-Security-Policy-Report-Only")

		cookies := res.Header.Values("Set-Cookie")
		if len(cookies) > 0 {
			res.Header.Del("Set-Cookie")
			for _, cookie := range cookies {
				c := cookie
				c = strings.ReplaceAll(c, "SameSite=Lax", "SameSite=None")
				c = strings.ReplaceAll(c, "SameSite=Strict", "SameSite=None")
				c = strings.ReplaceAll(c, "samesite=lax", "SameSite=None")
				c = strings.ReplaceAll(c, "samesite=strict", "SameSite=None")
				if !strings.Contains(c, "SameSite=") {
					c += "; SameSite=None"
				}
				if !strings.Contains(c, "Secure") {
					c += "; Secure"
				}
				if !strings.Contains(c, "Partitioned") {
					c += "; Partitioned"
				}
				res.Header.Add("Set-Cookie", c)
			}
		}

		injectCookiePolyfill(res)
		return nil
	}

	server := &http.Server{Handler: proxy}
	go func() {
		_ = server.Serve(listener)
	}()

	s.proxies[targetBaseKey] = &proxyEntry{
		targetBase: targetBaseKey,
		proxyBase:  proxyBase,
		listener:   listener,
		server:     server,
	}

	return proxyBase, nil
}

// CheckLocalhostStatus checks if a localhost URL is reachable and whether
// it sends X-Frame-Options: DENY or CSP frame-ancestors restrictions.
func (s *BrowserService) CheckLocalhostStatus(targetURL string) (*LocalhostStatus, error) {
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		targetURL = "http://" + targetURL
	}

	client := &http.Client{
		Timeout: 1500 * time.Millisecond,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	resp, err := client.Get(targetURL)
	if err != nil {
		return &LocalhostStatus{IsOnline: false}, nil
	}
	defer resp.Body.Close()

	xfo := resp.Header.Get("X-Frame-Options")
	csp := resp.Header.Get("Content-Security-Policy")
	hasBlock := xfo != "" || strings.Contains(strings.ToLower(csp), "frame-ancestors")

	return &LocalhostStatus{
		IsOnline:      true,
		StatusCode:    resp.StatusCode,
		HasFrameBlock: hasBlock,
		ServerName:    resp.Header.Get("Server"),
	}, nil
}

// CloseAllProxies cleanly shuts down all active reverse proxies and listeners.
func (s *BrowserService) CloseAllProxies() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, entry := range s.proxies {
		if entry.server != nil {
			_ = entry.server.Close()
		}
		if entry.listener != nil {
			_ = entry.listener.Close()
		}
	}
	s.proxies = make(map[string]*proxyEntry)
}
