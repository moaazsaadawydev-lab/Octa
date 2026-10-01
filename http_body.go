package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// buildRequestBody formats and prepares request payload bodies according to body type.
func buildRequestBody(payload HttpRequestPayload) (io.Reader, string, error) {
	switch payload.BodyType {
	case "json":
		return strings.NewReader(payload.BodyContent), "application/json", nil

	case "x-www-form-urlencoded":
		data := url.Values{}
		for k, v := range payload.UrlEncoded {
			if strings.TrimSpace(k) != "" {
				data.Set(k, v)
			}
		}
		return strings.NewReader(data.Encode()), "application/x-www-form-urlencoded", nil

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
						} else if item.Value != "" {
							fileName = filepath.Base(item.Value)
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

					if len(fileBytes) == 0 && item.Value != "" {
						if _, err := os.Stat(item.Value); err == nil {
							fileBytes, readErr = os.ReadFile(item.Value)
							if fileName == "blob" || fileName == "" {
								fileName = filepath.Base(item.Value)
							}
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
		return &b, w.FormDataContentType(), nil

	default:
		if payload.BodyContent != "" {
			return strings.NewReader(payload.BodyContent), "", nil
		}
		return nil, "", nil
	}
}
