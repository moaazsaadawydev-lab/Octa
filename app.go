package main

import (
	"context"

	"octa/internal/settings"
)

// App is the lightweight delegator / facade struct exposed to Wails.
type App struct {
	ctx             context.Context
	dbService       *DBService
	redisService    *RedisService
	httpService     *HTTPService
	projectService  *ProjectService
	terminalService *TerminalService
	dockerService   *DockerService
	gitService      *GitService
	settingsService *settings.SettingsService
}

// NewApp creates a new App application struct with domain services.
func NewApp() *App {
	return &App{
		dbService:       NewDBService(),
		redisService:    NewRedisService(),
		httpService:     NewHTTPService(),
		projectService:  NewProjectService(),
		terminalService: NewTerminalService(),
		dockerService:   NewDockerService(),
		gitService:      NewGitService(),
		settingsService: settings.NewSettingsService(),
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
	a.gitService.SetContext(ctx)
	a.settingsService.SetContext(ctx)
}

// ============================================================================
// DATABASE DOMAIN (Delegated to DBService)
// ============================================================================

func (a *App) TestConnection(config ConnectionConfig) (bool, string) {
	return a.dbService.TestConnection(config)
}
func (a *App) SaveConnection(config ConnectionConfig) (bool, string) {
	return a.dbService.SaveConnection(config)
}
func (a *App) GetSavedConnections() ([]ConnectionConfig, error) {
	return a.dbService.GetSavedConnections()
}
func (a *App) DeleteConnection(id string) (bool, error) {
	return a.dbService.DeleteConnection(id)
}
func (a *App) GetDatabases(config ConnectionConfig) ([]string, error) {
	return a.dbService.GetDatabases(config)
}
func (a *App) GetTables(config ConnectionConfig, dbName string) ([]string, error) {
	return a.dbService.GetTables(config, dbName)
}
func (a *App) GetTableSchema(config ConnectionConfig, dbName string, tableName string) ([]TableColumn, error) {
	return a.dbService.GetTableSchema(config, dbName, tableName)
}
func (a *App) GetTableData(config ConnectionConfig, dbName string, tableName string, options DataQueryOptions) (TableDataResult, error) {
	return a.dbService.GetTableData(config, dbName, tableName, options)
}
func (a *App) AddColumn(config ConnectionConfig, dbName, tableName, colName, colType string, isNullable bool) (bool, error) {
	return a.dbService.AddColumn(config, dbName, tableName, colName, colType, isNullable)
}
func (a *App) DropColumn(config ConnectionConfig, dbName, tableName, colName string) (bool, error) {
	return a.dbService.DropColumn(config, dbName, tableName, colName)
}
func (a *App) RenameColumn(config ConnectionConfig, dbName, tableName, oldName, newName string) (bool, error) {
	return a.dbService.RenameColumn(config, dbName, tableName, oldName, newName)
}
func (a *App) GetEnumValues(config ConnectionConfig, dbName, typeName string) ([]string, error) {
	return a.dbService.GetEnumValues(config, dbName, typeName)
}
func (a *App) UpdateTableRows(config ConnectionConfig, dbName, tableName, pkColumn string, updates []RowUpdate) (bool, error) {
	return a.dbService.UpdateTableRows(config, dbName, tableName, pkColumn, updates)
}
func (a *App) DeleteTableRows(config ConnectionConfig, dbName, tableName, pkColumn string, pkValues []string) (bool, error) {
	return a.dbService.DeleteTableRows(config, dbName, tableName, pkColumn, pkValues)
}
func (a *App) TruncateTable(config ConnectionConfig, dbName, tableName string) (bool, error) {
	return a.dbService.TruncateTable(config, dbName, tableName)
}
func (a *App) ExecuteRawQuery(config ConnectionConfig, dbName string, sqlQuery string) ([]QueryResult, error) {
	return a.dbService.ExecuteRawQuery(config, dbName, sqlQuery)
}
func (a *App) GetDatabaseSchemaDetails(config ConnectionConfig, dbName string) (DatabaseSchema, error) {
	return a.dbService.GetDatabaseSchemaDetails(config, dbName)
}
func (a *App) ExportTableSQL(config ConnectionConfig, dbName, tableName string, includeData bool) (string, error) {
	return a.dbService.ExportTableSQL(config, dbName, tableName, includeData)
}
func (a *App) ExportDatabaseSQL(config ConnectionConfig, dbName string, includeData bool) (string, error) {
	return a.dbService.ExportDatabaseSQL(config, dbName, includeData)
}
func (a *App) ImportSQLScript(config ConnectionConfig, dbName string, scriptContent string) (ImportResult, error) {
	return a.dbService.ImportSQLScript(config, dbName, scriptContent)
}
func (a *App) SaveSQLDumpDialog(defaultFileName string, content string) (string, error) {
	return a.dbService.SaveSQLDumpDialog(defaultFileName, content)
}
func (a *App) ExplainQuery(config ConnectionConfig, dbName, sqlQuery string, analyze bool) (ExplainPlanResult, error) {
	return a.dbService.ExplainQuery(config, dbName, sqlQuery, analyze)
}
func (a *App) GetQueryLogs() ([]QueryLog, error) {
	return a.dbService.GetQueryLogs()
}
func (a *App) ClearQueryLogs() (bool, error) {
	return a.dbService.ClearQueryLogs()
}
func (a *App) SaveSqlQueriesData(jsonData string) error {
	return a.dbService.SaveSqlQueriesData(jsonData)
}
func (a *App) LoadSqlQueriesData() (string, error) {
	return a.dbService.LoadSqlQueriesData()
}

// ============================================================================
// REDIS DOMAIN (Delegated to RedisService)
// ============================================================================

func (a *App) ConnectRedis(config RedisConnectionConfig) (RedisConnectResult, error) {
	return a.redisService.ConnectRedis(config)
}
func (a *App) ScanRedisKeys(config RedisConnectionConfig, pattern string, cursor uint64, count int64) (RedisScanResult, error) {
	return a.redisService.ScanRedisKeys(config, pattern, cursor, count)
}
func (a *App) GetRedisKeyDetails(config RedisConnectionConfig, key string) (RedisKeyDetail, error) {
	return a.redisService.GetRedisKeyDetails(config, key)
}
func (a *App) CreateRedisKey(config RedisConnectionConfig, key string, keyType string, payload any, ttlSeconds int64) (bool, error) {
	return a.redisService.CreateRedisKey(config, key, keyType, payload, ttlSeconds)
}
func (a *App) UpdateRedisKey(config RedisConnectionConfig, key string, keyType string, payload any, ttlSeconds int64) (bool, error) {
	return a.redisService.UpdateRedisKey(config, key, keyType, payload, ttlSeconds)
}
func (a *App) DeleteRedisKey(config RedisConnectionConfig, key string) (bool, error) {
	return a.redisService.DeleteRedisKey(config, key)
}
func (a *App) DeleteRedisKeysBatch(config RedisConnectionConfig, keys []string) (int64, error) {
	return a.redisService.DeleteRedisKeysBatch(config, keys)
}
func (a *App) SetRedisTTL(config RedisConnectionConfig, key string, ttlSeconds int64) (bool, error) {
	return a.redisService.SetRedisTTL(config, key, ttlSeconds)
}
func (a *App) FlushRedisDB(config RedisConnectionConfig) (bool, error) {
	return a.redisService.FlushRedisDB(config)
}
func (a *App) ExecuteRedisCommand(config RedisConnectionConfig, commandLine string) (RedisCommandResult, error) {
	return a.redisService.ExecuteRedisCommand(config, commandLine)
}
func (a *App) SaveRedisConnections(jsonData string) error {
	return a.redisService.SaveRedisConnections(jsonData)
}
func (a *App) LoadRedisConnections() (string, error) {
	return a.redisService.LoadRedisConnections()
}

// ============================================================================
// HTTP DOMAIN (Delegated to HTTPService)
// ============================================================================

func (a *App) ExecuteHttpRequest(payload HttpRequestPayload) (HttpResponsePayload, error) {
	return a.httpService.ExecuteHttpRequest(payload)
}
func (a *App) SelectFilesDialog() ([]SelectedFileMeta, error) {
	return a.httpService.SelectFilesDialog()
}
func (a *App) SaveHttpClientData(jsonData string) error {
	return a.httpService.SaveHttpClientData(jsonData)
}
func (a *App) LoadHttpClientData() (string, error) {
	return a.httpService.LoadHttpClientData()
}
func (a *App) SaveEnvironmentsData(jsonData string) error {
	return a.httpService.SaveEnvironmentsData(jsonData)
}
func (a *App) LoadEnvironmentsData() (string, error) {
	return a.httpService.LoadEnvironmentsData()
}

// ============================================================================
// PROJECT DOMAIN (Delegated to ProjectService)
// ============================================================================

func (a *App) CreateProjectFileDialog(defaultName string) (ProjectFileResult, error) {
	return a.projectService.CreateProjectFileDialog(defaultName)
}
func (a *App) OpenProjectFileDialog() (ProjectFileResult, error) {
	return a.projectService.OpenProjectFileDialog()
}
func (a *App) ReadProjectFile(filePath string) (ProjectFileResult, error) {
	return a.projectService.ReadProjectFile(filePath)
}
func (a *App) SaveProjectFile(filePath string, jsonData string) (bool, error) {
	return a.projectService.SaveProjectFile(filePath, jsonData)
}
func (a *App) CloseProjectConnections() (bool, error) {
	a.dbService.ClosePools()
	a.terminalService.CloseAllTerminalSessions()
	a.dockerService.StopAllLogStreams()
	return a.projectService.CloseProjectConnections()
}
func (a *App) WipeLegacyStorage() (bool, error) {
	return a.projectService.WipeLegacyStorage()
}

// ============================================================================
// TERMINAL DOMAIN (Delegated to TerminalService)
// ============================================================================

func (a *App) GetAvailableShells() []ShellInfo {
	return a.terminalService.GetAvailableShells()
}
func (a *App) StartTerminalSession(sessionID string, workDir string, cols int, rows int, shellPath string) error {
	return a.terminalService.StartTerminalSession(sessionID, workDir, cols, rows, shellPath)
}
func (a *App) CreateTerminalSession(sessionID string, workDir string, cols int, rows int, shellPath string) error {
	return a.terminalService.StartTerminalSession(sessionID, workDir, cols, rows, shellPath)
}
func (a *App) WriteTerminalSession(sessionID string, data string) error {
	return a.terminalService.WriteTerminalSession(sessionID, data)
}
func (a *App) ResizeTerminalSession(sessionID string, cols int, rows int) error {
	return a.terminalService.ResizeTerminalSession(sessionID, cols, rows)
}
func (a *App) CloseTerminalSession(sessionID string) error {
	return a.terminalService.CloseTerminalSession(sessionID)
}

// ============================================================================
// DOCKER DOMAIN (Delegated to DockerService)
// ============================================================================

func (a *App) CheckDockerAvailability() (bool, string) {
	return a.dockerService.CheckDockerAvailability()
}
func (a *App) CheckConnection() (bool, string) {
	return a.dockerService.CheckDockerAvailability()
}
func (a *App) ListContainers(onlyRunning bool) ([]DockerProjectGroup, error) {
	return a.dockerService.ListContainers(onlyRunning)
}
func (a *App) StartContainer(containerID string) (bool, error) {
	return a.dockerService.StartContainer(containerID)
}
func (a *App) StopContainer(containerID string) (bool, error) {
	return a.dockerService.StopContainer(containerID)
}
func (a *App) RestartContainer(containerID string) (bool, error) {
	return a.dockerService.RestartContainer(containerID)
}
func (a *App) RemoveContainer(containerID string, force bool) (bool, error) {
	return a.dockerService.RemoveContainer(containerID, force)
}
func (a *App) StartLogStream(containerID string) error {
	return a.dockerService.StartLogStream(containerID)
}
func (a *App) StopLogStream(containerID string) error {
	return a.dockerService.StopLogStream(containerID)
}
func (a *App) StartContainerExec(sessionID string, containerID string, cols int, rows int) error {
	return a.dockerService.StartContainerExec(sessionID, containerID, cols, rows)
}
func (a *App) WriteContainerExec(sessionID string, data string) error {
	return a.dockerService.WriteContainerExec(sessionID, data)
}
func (a *App) ResizeContainerExec(sessionID string, cols int, rows int) error {
	return a.dockerService.ResizeContainerExec(sessionID, cols, rows)
}
func (a *App) CloseContainerExec(sessionID string) error {
	return a.dockerService.CloseContainerExec(sessionID)
}

// ============================================================================
// SOURCE CONTROL / GIT DOMAIN (Delegated to GitService)
// ============================================================================

func (a *App) OpenRepositoryDialog() (string, error) {
	return a.gitService.OpenRepositoryDialog()
}
func (a *App) InitRepository(repoPath string) error {
	return a.gitService.InitRepository(repoPath)
}
func (a *App) GetRepoStatus(repoPath string) (*GitStatusResult, error) {
	return a.gitService.GetRepoStatus(repoPath)
}
func (a *App) GetFileDiff(repoPath string, filePath string, staged bool) (string, error) {
	return a.gitService.GetFileDiff(repoPath, filePath, staged)
}
func (a *App) StageFile(repoPath string, filePath string) error {
	return a.gitService.StageFile(repoPath, filePath)
}
func (a *App) UnstageFile(repoPath string, filePath string) error {
	return a.gitService.UnstageFile(repoPath, filePath)
}
func (a *App) StageAll(repoPath string) error {
	return a.gitService.StageAll(repoPath)
}
func (a *App) UnstageAll(repoPath string) error {
	return a.gitService.UnstageAll(repoPath)
}
func (a *App) CommitChanges(repoPath string, message string) error {
	return a.gitService.CommitChanges(repoPath, message)
}
func (a *App) PushChanges(repoPath string) error {
	return a.gitService.PushChanges(repoPath)
}
func (a *App) PullChanges(repoPath string) error {
	return a.gitService.PullChanges(repoPath)
}
func (a *App) FetchChanges(repoPath string) error {
	return a.gitService.FetchChanges(repoPath)
}
func (a *App) StartAutoWatch(repoPath string) error {
	return a.gitService.StartAutoWatch(repoPath)
}
func (a *App) StopAutoWatch() {
	a.gitService.StopAutoWatch()
}
func (a *App) IsGitRepository(repoPath string) bool {
	return a.gitService.IsGitRepository(repoPath)
}
func (a *App) InitializeRepositoryWithOptions(opts InitRepoOptions) error {
	return a.gitService.InitializeRepositoryWithOptions(opts)
}

// ============================================================================
// SETTINGS & CACHE DOMAIN (Delegated to SettingsService)
// ============================================================================

func (a *App) ClearAppCache() (bool, error) {
	return a.settingsService.ClearAppCache()
}

