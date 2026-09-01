package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHttpClientDataPersistence(t *testing.T) {
	app := NewApp()

	testJSON := `[{"id":"req1","name":"Get Users","url":"http://localhost:8080/users","method":"GET"}]`

	err := app.SaveHttpClientData(testJSON)
	if err != nil {
		t.Fatalf("Failed to save HTTP client data: %v", err)
	}

	loaded, err := app.LoadHttpClientData()
	if err != nil {
		t.Fatalf("Failed to load HTTP client data: %v", err)
	}

	if strings.TrimSpace(loaded) != testJSON {
		t.Errorf("Loaded HTTP client data mismatch: got %s, want %s", loaded, testJSON)
	}
}

func TestEnvironmentsDataPersistence(t *testing.T) {
	app := NewApp()

	testJSON := `[{"id":"env1","name":"Localhost","variables":[{"id":"v1","key":"baseURL","value":"http://localhost:3000","enabled":true}]}]`

	err := app.SaveEnvironmentsData(testJSON)
	if err != nil {
		t.Fatalf("Failed to save environments data: %v", err)
	}

	loaded, err := app.LoadEnvironmentsData()
	if err != nil {
		t.Fatalf("Failed to load environments data: %v", err)
	}

	if strings.TrimSpace(loaded) != testJSON {
		t.Errorf("Loaded environments mismatch: got %s, want %s", loaded, testJSON)
	}
}

func TestExecuteHttpRequest(t *testing.T) {
	app := NewApp()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/upload" && r.Method == "POST" {
			err := r.ParseMultipartForm(10 << 20)
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(fmt.Sprintf(`{"error": "%v"}`, err)))
				return
			}
			file, header, fileErr := r.FormFile("avatar")
			if fileErr != nil {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(fmt.Sprintf(`{"error": "file missing: %v"}`, fileErr)))
				return
			}
			defer file.Close()

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(fmt.Sprintf(`{"received": true, "filename": "%s", "filesize": %d, "cropX": "%s"}`, header.Filename, header.Size, r.FormValue("cropX"))))
			return
		}

		if r.Method == "POST" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Custom-Header", "OctaServer")
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`{"message": "created", "status": 201}`))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "success", "count": 42}`))
	}))
	defer ts.Close()

	// 1. Test GET request
	resp, err := app.ExecuteHttpRequest(HttpRequestPayload{
		Method: "GET",
		URL:    ts.URL,
	})
	if err != nil {
		t.Fatalf("ExecuteHttpRequest GET failed: %v", err)
	}
	if resp.Status != 200 {
		t.Errorf("Expected status 200, got %d", resp.Status)
	}

	// 2. Test POST JSON request
	respPost, err := app.ExecuteHttpRequest(HttpRequestPayload{
		Method:      "POST",
		URL:         ts.URL + "/create",
		BodyType:    "json",
		BodyContent: `{"name": "test"}`,
	})
	if err != nil {
		t.Fatalf("ExecuteHttpRequest POST failed: %v", err)
	}
	if respPost.Status != 201 {
		t.Errorf("Expected status 201, got %d", respPost.Status)
	}

	// 3. Test Multipart Form Data with Disk File
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("test_avatar_%d.jpg", os.Getpid()))
	_ = os.WriteFile(tmpFile, []byte("fake-jpeg-binary-data-bytes"), 0644)
	defer os.Remove(tmpFile)

	respUpload, err := app.ExecuteHttpRequest(HttpRequestPayload{
		Method:   "POST",
		URL:      ts.URL + "/upload",
		BodyType: "form-data",
		FormData: []FormFieldPayload{
			{Key: "cropX", Type: "text", Value: "100"},
			{Key: "name", Type: "text", Value: "moaaz"},
			{Key: "avatar", Type: "file", FileName: "moaaz.jpg", FilePaths: []string{tmpFile}},
		},
	})
	if err != nil {
		t.Fatalf("ExecuteHttpRequest Multipart disk file failed: %v", err)
	}
	if respUpload.Status != 200 {
		t.Errorf("Expected status 200 for multipart disk upload, got %d: %v", respUpload.Status, respUpload.Error)
	}

	// 4. Test Multipart Form Data with Base64 Payload
	rawFileBytes := []byte("binary-image-data-from-browser-base64-filereader-stream")
	b64String := base64.StdEncoding.EncodeToString(rawFileBytes)

	respUploadBase64, err := app.ExecuteHttpRequest(HttpRequestPayload{
		Method:   "POST",
		URL:      ts.URL + "/upload",
		BodyType: "form-data",
		FormData: []FormFieldPayload{
			{Key: "cropX", Type: "200"},
			{Key: "name", Type: "text", Value: "base64-user"},
			{Key: "avatar", Type: "file", FileName: "moaaz.jpg", Base64Data: b64String, ContentType: "image/jpeg"},
		},
	})
	if err != nil {
		t.Fatalf("ExecuteHttpRequest Multipart base64 failed: %v", err)
	}
	if respUploadBase64.Status != 200 {
		t.Errorf("Expected status 200 for multipart base64 upload, got %d: %v", respUploadBase64.Status, respUploadBase64.Error)
	}

	// 5. Test Unreachable Host
	respErr, _ := app.ExecuteHttpRequest(HttpRequestPayload{
		Method:     "GET",
		URL:        "http://127.0.0.1:59998/unreachable",
		TimeoutSec: 1,
	})
	if respErr.Status != 0 || respErr.Error == "" {
		t.Errorf("Expected network error for unreachable port, got %+v", respErr)
	}
}
