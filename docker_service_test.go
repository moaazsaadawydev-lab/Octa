package main

import (
	"context"
	"testing"
)

func TestDockerServiceInitializationAndAvailability(t *testing.T) {
	service := NewDockerService()
	service.SetContext(context.Background())

	available, version := service.CheckDockerAvailability()
	if !available {
		t.Logf("Docker daemon not available in test environment: %s", version)
		return
	}
	if version == "" {
		t.Errorf("Expected non-empty Docker version string")
	}
}

func TestDockerContainersListing(t *testing.T) {
	service := NewDockerService()
	service.SetContext(context.Background())

	available, _ := service.CheckDockerAvailability()
	if !available {
		t.Skip("Docker daemon not running, skipping container list test")
	}

	groups, err := service.ListContainers(false)
	if err != nil {
		t.Fatalf("ListContainers error: %v", err)
	}

	for _, g := range groups {
		if g.Project == "" {
			t.Errorf("Expected non-empty group Project name")
		}
		if g.TotalContainers < len(g.Containers) {
			t.Errorf("TotalContainers mismatch in group %s", g.Project)
		}
	}
}
