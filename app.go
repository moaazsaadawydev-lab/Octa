package main

import (
	"context"
)

// App is the lightweight delegator / facade struct exposed to Wails.
type App struct {
	ctx            context.Context
	dbService      *DBService
	redisService   *RedisService
	httpService    *HTTPService
	projectService *ProjectService
}

// NewApp creates a new App application struct with domain services.
func NewApp() *App {
	return &App{
		dbService:      NewDBService(),
		redisService:   NewRedisService(),
		httpService:    NewHTTPService(),
		projectService: NewProjectService(),
	}
}

// startup is called when the app starts. The context is passed to all services.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.dbService.SetContext(ctx)
	a.redisService = NewRedisService()
	a.httpService.SetContext(ctx)
	a.projectService.SetContext(ctx)
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
	return a.projectService.CloseProjectConnections()
}
func (a *App) WipeLegacyStorage() (bool, error) {
	return a.projectService.WipeLegacyStorage()
}
