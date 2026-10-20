package main

// GetLocalhostProxy delegates localhost proxy creation or lookup to BrowserService.
func (a *App) GetLocalhostProxy(targetURL string) (string, error) {
	if a.browserService == nil {
		return targetURL, nil
	}
	return a.browserService.GetLocalhostProxy(targetURL)
}

// CheckLocalhostStatus checks whether a local port is listening and if it has iframe restrictions.
func (a *App) CheckLocalhostStatus(targetURL string) (*LocalhostStatus, error) {
	if a.browserService == nil {
		return &LocalhostStatus{IsOnline: false}, nil
	}
	return a.browserService.CheckLocalhostStatus(targetURL)
}
