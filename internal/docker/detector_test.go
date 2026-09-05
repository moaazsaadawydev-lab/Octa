package docker

import (
	"testing"
)

func TestCleanWSLOutputUTF16(t *testing.T) {
	// Simulate UTF-16LE output from wsl.exe -l -q: "Ubuntu\r\ndocker-desktop\r\n"
	raw := []byte{
		'U', 0, 'b', 0, 'u', 0, 'n', 0, 't', 0, 'u', 0, '\r', 0, '\n', 0,
		'd', 0, 'o', 0, 'c', 0, 'k', 0, 'e', 0, 'r', 0, '-', 0, 'd', 0, 'e', 0, 's', 0, 'k', 0, 't', 0, 'o', 0, 'p', 0, '\r', 0, '\n', 0,
	}

	lines := CleanWSLOutput(raw)
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d: %v", len(lines), lines)
	}

	if lines[0] != "Ubuntu" {
		t.Errorf("expected lines[0] to be 'Ubuntu', got '%s'", lines[0])
	}
	if lines[1] != "docker-desktop" {
		t.Errorf("expected lines[1] to be 'docker-desktop', got '%s'", lines[1])
	}
}

func TestCleanWSLOutputASCII(t *testing.T) {
	raw := []byte("Ubuntu\r\ndocker-desktop\n")
	lines := CleanWSLOutput(raw)
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d: %v", len(lines), lines)
	}
	if lines[0] != "Ubuntu" || lines[1] != "docker-desktop" {
		t.Errorf("unexpected parsed lines: %v", lines)
	}
}

func TestDetectEngines(t *testing.T) {
	engines := DetectEngines()
	if len(engines) == 0 {
		t.Fatal("expected at least one engine to be returned")
	}
	t.Logf("Detected engines: %+v", engines)
}
