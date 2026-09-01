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

	// 3. Test Multipart Form Data with Disk File and Static Placeholder Content-Type
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("test_avatar_%d.jpg", os.Getpid()))
	_ = os.WriteFile(tmpFile, []byte("fake-jpeg-binary-data-bytes"), 0644)
	defer os.Remove(tmpFile)

	respUpload, err := app.ExecuteHttpRequest(HttpRequestPayload{
		Method:   "POST",
		URL:      ts.URL + "/upload",
		BodyType: "form-data",
		Headers: map[string]string{
			"Content-Type": "multipart/form-data; boundary=<calculated when request is sent>",
		},
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
		Headers: map[string]string{
			"Content-Type": "multipart/form-data",
		},
		FormData: []FormFieldPayload{
			{Key: "cropX", Type: "text", Value: "200"},
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

func TestDiagnosticMultipartTrace(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		println("\n--- [Target Server Received Request] ---")
		println("Method:", r.Method, "URL:", r.URL.String())
		println("Header Content-Type:", r.Header.Get("Content-Type"))

		err := r.ParseMultipartForm(32 << 20)
		if err != nil {
			println("[Target Server Error] ParseMultipartForm failed:", err.Error())
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf(`{"status": 500, "message": "ParseMultipartForm failed: %v"}`, err)))
			return
		}

		println("Multipart Form Values:")
		for k, v := range r.MultipartForm.Value {
			println(fmt.Sprintf("  - Key: %q -> Value: %q", k, v))
		}

		println("Multipart Form Files:")
		for k, f := range r.MultipartForm.File {
			for _, fileHeader := range f {
				println(fmt.Sprintf("  - Key: %q -> Filename: %q, Size: %d bytes", k, fileHeader.Filename, fileHeader.Size))
			}
		}

		cropX := r.FormValue("cropX")
		name := r.FormValue("name")
		if cropX == "" && len(r.MultipartForm.Value["cropX"]) == 0 {
			println("[Target Server Warning] 'cropX' is missing or undefined!")
			t.Errorf("'cropX' is missing or undefined on target server")
		} else {
			println(fmt.Sprintf("[Target Server Success] Verified 'cropX'=%q and 'name'=%q successfully received!", cropX, name))
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": 200, "message": "User registered successfully", "data": {"id": "usr-123", "name": "` + name + `", "cropX": "` + cropX + `"}}`))
	}))
	defer ts.Close()

	app := NewApp()

	tmpFile := filepath.Join(os.TempDir(), "test_avatar_trace.png")
	_ = os.WriteFile(tmpFile, []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...fake-png-binary-stream"), 0644)
	defer os.Remove(tmpFile)

	println("\n================================================================")
	println("EXECUTING MULTIPART FORM-DATA REQUEST DIAGNOSTIC TRACE")
	println("================================================================")

	payload := HttpRequestPayload{
		Method:   "POST",
		URL:      ts.URL + "/api/v1/users/auth/register",
		BodyType: "form-data",
		Headers: map[string]string{
			"Authorization": "Bearer fake_token_abc123",
			"Content-Type":  "multipart/form-data; boundary=<calculated when request is sent>",
		},
		FormData: []FormFieldPayload{
			{Key: "name", Type: "text", Value: "Moaz Saadawy"},
			{Key: "email", Type: "text", Value: "moaazseadawy@gmail.com"},
			{Key: "cropX", Type: "text", Value: "120"},
			{Key: "cropY", Type: "text", Value: "80"},
			{Key: "cropWidth", Type: "text", Value: "400"},
			{Key: "cropHeight", Type: "text", Value: "400"},
			{Key: "cropZoom", Type: "text", Value: "1.5"},
			{Key: "avatar", Type: "file", FileName: "avatar.png", FilePaths: []string{tmpFile}},
		},
	}

	resp, err := app.ExecuteHttpRequest(payload)
	println("\n--- [Client Execution Result] ---")
	println("Status:", resp.Status, resp.StatusText)
	println("Duration:", resp.DurationMs, "ms")
	println("Response Data:", fmt.Sprintf("%v", resp.Data))
	if err != nil {
		t.Fatalf("ExecuteHttpRequest failed: %v", err)
	}
	if resp.Status != 200 {
		t.Fatalf("Expected status 200, got %d", resp.Status)
	}
}
