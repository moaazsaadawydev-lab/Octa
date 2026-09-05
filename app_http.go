package main

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
