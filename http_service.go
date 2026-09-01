package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// HTTPService handles outbound HTTP request execution, multipart/binary streaming, and file selection.
type HTTPService struct {
	ctx context.Context
}

// NewHTTPService creates a new HTTPService.
func NewHTTPService() *HTTPService {
	return &HTTPService{}
}

// SetContext sets the Wails runtime context.
func (s *HTTPService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// decodeBase64Data decodes base64 strings handling data URL prefixes, whitespace, and url-safe encodings.
func decodeBase64Data(raw string) ([]byte, error) {
	str := strings.TrimSpace(raw)
	if commaIdx := strings.Index(str, ","); commaIdx != -1 {
		str = str[commaIdx+1:]
	}
	str = strings.ReplaceAll(str, " ", "")
	str = strings.ReplaceAll(str, "\n", "")
	str = strings.ReplaceAll(str, "\r", "")
	str = strings.ReplaceAll(str, "\t", "")

	if data, err := base64.StdEncoding.DecodeString(str); err == nil {
		return data, nil
	}
	if data, err := base64.URLEncoding.DecodeString(str); err == nil {
		return data, nil
	}
	if data, err := base64.RawStdEncoding.DecodeString(str); err == nil {
		return data, nil
	}
	return base64.RawURLEncoding.DecodeString(str)
}

// detectMimeType returns the MIME Content-Type based on extension or binary header bytes.
func detectMimeType(filename string, sample []byte) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".pdf":
		return "application/pdf"
	case ".json":
		return "application/json"
	case ".xml":
		return "application/xml"
	case ".txt":
		return "text/plain; charset=utf-8"
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	case ".csv":
		return "text/csv"
	case ".zip":
		return "application/zip"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	}

	if ext != "" {
		m := mime.TypeByExtension(ext)
		if m != "" {
			return m
		}
	}

	if len(sample) > 0 {
		return http.DetectContentType(sample)
	}

	return "application/octet-stream"
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

	var reqBody io.Reader = nil
	contentType := ""

	switch payload.BodyType {
	case "json":
		contentType = "application/json"
		reqBody = strings.NewReader(payload.BodyContent)

	case "x-www-form-urlencoded":
		contentType = "application/x-www-form-urlencoded"
		data := url.Values{}
		for k, v := range payload.UrlEncoded {
			if strings.TrimSpace(k) != "" {
				data.Set(k, v)
			}
		}
		reqBody = strings.NewReader(data.Encode())

	case "form-data":
		var b bytes.Buffer
		w := multipart.NewWriter(&b)

		for _, item := range payload.FormData {
			if strings.TrimSpace(item.Key) == "" {
				continue
			}

			if item.Type == "file" {
				type singleFile struct {
					name   string
					path   string
					base64 string
				}
				var fileEntries []singleFile

				if len(item.FileNames) > 0 {
					for idx, fn := range item.FileNames {
						var fp, b64 string
						if idx < len(item.FilePaths) {
							fp = item.FilePaths[idx]
						}
						if idx < len(item.FileBase64) {
							b64 = item.FileBase64[idx]
						}
						fileEntries = append(fileEntries, singleFile{name: fn, path: fp, base64: b64})
					}
				} else {
					fileEntries = append(fileEntries, singleFile{
						name:   item.FileName,
						path:   item.FilePath,
						base64: item.Base64Data,
					})
				}

				for _, entry := range fileEntries {
					fileName := entry.name
					if fileName == "" {
						if entry.path != "" {
							fileName = filepath.Base(entry.path)
						} else {
							fileName = "blob"
						}
					}

					var fileBytes []byte
					var readErr error

					if entry.path != "" {
						if _, err := os.Stat(entry.path); err == nil {
							fileBytes, readErr = os.ReadFile(entry.path)
						}
					}

					if len(fileBytes) == 0 && entry.base64 != "" {
						decoded, err := decodeBase64Data(entry.base64)
						if err == nil && len(decoded) > 0 {
							fileBytes = decoded
							readErr = nil
						}
					}

					mimeType := item.ContentType
					if mimeType == "" {
						mimeType = detectMimeType(fileName, fileBytes)
					}

					h := make(textproto.MIMEHeader)
					h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, item.Key, fileName))
					h.Set("Content-Type", mimeType)

					part, err := w.CreatePart(h)
					if err != nil {
						continue
					}

					if len(fileBytes) > 0 && readErr == nil {
						_, _ = part.Write(fileBytes)
					}
				}
			} else {
				_ = w.WriteField(item.Key, item.Value)
			}
		}

		_ = w.Close()
		contentType = w.FormDataContentType()
		reqBody = &b

	default:
		if payload.BodyContent != "" {
			reqBody = strings.NewReader(payload.BodyContent)
		}
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
			httpReq.Header.Set(k, v)
		}
	}

	if contentType != "" && httpReq.Header.Get("Content-Type") == "" {
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
		Timeout: time.Duration(timeoutSec) * time.Second,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
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

// SelectFilesDialog opens native file picker allowing multiple file selection.
func (s *HTTPService) SelectFilesDialog() ([]SelectedFileMeta, error) {
	paths, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select File(s) for Multipart Upload",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open file dialog: %w", err)
	}

	var results []SelectedFileMeta
	for _, p := range paths {
		if p == "" {
			continue
		}
		info, err := os.Stat(p)
		if err != nil {
			continue
		}

		name := filepath.Base(p)
		size := info.Size()

		fileBytes, err := os.ReadFile(p)
		var b64 string
		if err == nil && len(fileBytes) > 0 {
			b64 = base64.StdEncoding.EncodeToString(fileBytes)
		}

		mimeType := detectMimeType(name, fileBytes)

		results = append(results, SelectedFileMeta{
			Name:        name,
			Path:        p,
			Size:        size,
			Base64Data:  b64,
			ContentType: mimeType,
		})
	}

	return results, nil
}

// SaveHttpClientData persists legacy HTTP collections data.
func (s *HTTPService) SaveHttpClientData(jsonData string) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(appDir, 0755)
	filePath := filepath.Join(appDir, "http_client_data.json")

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}
	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadHttpClientData loads legacy HTTP collections data.
func (s *HTTPService) LoadHttpClientData() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	filePath := filepath.Join(configDir, "octa", "http_client_data.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SaveEnvironmentsData persists legacy environments data.
func (s *HTTPService) SaveEnvironmentsData(jsonData string) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(appDir, 0755)
	filePath := filepath.Join(appDir, "http_environments.json")

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}
	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadEnvironmentsData loads legacy environments data.
func (s *HTTPService) LoadEnvironmentsData() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	filePath := filepath.Join(configDir, "octa", "http_environments.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
