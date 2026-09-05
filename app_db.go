package main

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
