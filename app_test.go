package main

import (
	"context"
	"testing"
)

func TestAppFacadeInitialization(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatalf("NewApp() returned nil")
	}

	if app.dbService == nil || app.redisService == nil || app.httpService == nil || app.projectService == nil {
		t.Fatalf("Domain services were not initialized properly on App")
	}

	ctx := context.Background()
	app.startup(ctx)

	if app.ctx == nil {
		t.Errorf("App context was not set during startup")
	}
}
