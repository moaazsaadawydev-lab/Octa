package main

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestBinaryUploadWithFilePath(t *testing.T) {
	// Create a temporary file representing an image or binary file for S3 upload
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "avatar.png")
	fileData := []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01")
	if err := os.WriteFile(filePath, fileData, 0644); err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	receivedBytes := []byte{}
	receivedContentType := ""
	receivedContentLength := int64(0)
	receivedMethod := ""

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedMethod = r.Method
		receivedContentType = r.Header.Get("Content-Type")
		receivedContentLength = r.ContentLength
		b, err := io.ReadAll(r.Body)
		if err == nil {
			receivedBytes = b
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"uploaded": true}`))
	}))
	defer ts.Close()

	app := NewApp()
	payload := HttpRequestPayload{
		Method:   "PUT",
		URL:      ts.URL + "/bucket/avatar.png",
		BodyType: "binary",
		BinaryFile: &BinaryFilePayload{
			Name: "avatar.png",
			Path: filePath,
			Size: int64(len(fileData)),
		},
	}

	resp, err := app.ExecuteHttpRequest(payload)
	if err != nil {
		t.Fatalf("ExecuteHttpRequest failed: %v", err)
	}
	if resp.Status != http.StatusOK {
		t.Errorf("Expected 200 OK, got: %d", resp.Status)
	}
	if receivedMethod != "PUT" {
		t.Errorf("Expected method PUT, got: %s", receivedMethod)
	}
	if receivedContentType != "image/png" {
		t.Errorf("Expected Content-Type image/png, got: %s", receivedContentType)
	}
	if receivedContentLength != int64(len(fileData)) {
		t.Errorf("Expected Content-Length %d, got: %d", len(fileData), receivedContentLength)
	}
	if !bytes.Equal(receivedBytes, fileData) {
		t.Errorf("Expected received bytes to match file data")
	}
}

func TestBinaryUploadWithBase64(t *testing.T) {
	testRaw := []byte("hello minio raw binary payload")
	b64 := "aGVsbG8gbWluaW8gcmF3IGJpbmFyeSBwYXlsb2Fk"

	var receivedBody []byte
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))
	defer ts.Close()

	app := NewApp()
	payload := HttpRequestPayload{
		Method:   "POST",
		URL:      ts.URL + "/raw",
		BodyType: "binary",
		BinaryFile: &BinaryFilePayload{
			Name:        "payload.bin",
			Base64Data:  b64,
			ContentType: "application/octet-stream",
			Size:        int64(len(testRaw)),
		},
	}

	resp, err := app.ExecuteHttpRequest(payload)
	if err != nil {
		t.Fatalf("ExecuteHttpRequest failed: %v", err)
	}
	if resp.Status != http.StatusOK {
		t.Errorf("Expected 200, got: %d", resp.Status)
	}
	if !bytes.Equal(receivedBody, testRaw) {
		t.Errorf("Received body mismatch: got %q, want %q", string(receivedBody), string(testRaw))
	}
}
