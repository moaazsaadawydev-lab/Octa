package main

import (
	"context"

	"octa/internal/docker"
	"octa/internal/settings"
)

// App is the lightweight delegator / facade struct exposed to Wails.
type App struct {
	ctx                 context.Context
	dbService           *DBService
	redisService        *RedisService
	httpService         *HTTPService
	projectService      *ProjectService
	terminalService     *TerminalService
	dockerService       *DockerService
	dockerEngineService *docker.EngineService
	gitService          *GitService
	settingsService     *settings.SettingsService
	aiService           *AIService
}

// NewApp creates a new App application struct with domain services.
func NewApp() *App {
	return &App{
		dbService:           NewDBService(),
		redisService:        NewRedisService(),
		httpService:         NewHTTPService(),
		projectService:      NewProjectService(),
		terminalService:     NewTerminalService(),
		dockerService:       NewDockerService(),
		dockerEngineService: docker.NewEngineService(),
		gitService:          NewGitService(),
		settingsService:     settings.NewSettingsService(),
		aiService:           NewAIService(),
	}
}

// startup is called when the app starts. The context is passed to all services.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.dbService.SetContext(ctx)
	a.redisService = NewRedisService()
	a.httpService.SetContext(ctx)
	a.projectService.SetContext(ctx)
	a.terminalService.SetContext(ctx)
	a.dockerService.SetContext(ctx)
	a.dockerEngineService.SetContext(ctx)
	a.gitService.SetContext(ctx)
	a.settingsService.SetContext(ctx)
	a.aiService.SetContext(ctx)
}

// shutdown is called when the app closes to cleanly release all system resources.
func (a *App) shutdown(ctx context.Context) {
	if a.terminalService != nil {
		a.terminalService.CloseAllTerminalSessions()
	}
	if a.dbService != nil {
		a.dbService.ClosePools()
	}
	if a.redisService != nil {
		a.redisService.CloseClients()
	}
	if a.dockerService != nil {
		a.dockerService.StopAllLogStreams()
	}
	if a.gitService != nil {
		a.gitService.StopAutoWatch()
	}
}
