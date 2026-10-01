package main

import (
	"encoding/base64"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
)

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
