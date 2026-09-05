package main

import (
	"octa/internal/docker"
)

// ============================================================================
// DOCKER DOMAIN (Delegated to DockerService & EngineService)
// ============================================================================

func (a *App) GetDetectedDockerEngines() []docker.EngineProvider {
	return a.dockerEngineService.GetDetectedEngines()
}
func (a *App) SetDockerEngine(engineID string, distro string) bool {
	a.dockerService.SetDockerEngine(engineID, distro)
	a.dockerEngineService.SetActiveEngine(engineID, distro)
	return true
}
func (a *App) StartDockerEngine(engineID string, distro string) error {
	return a.dockerEngineService.StartDockerEngine(engineID, distro)
}
func (a *App) CheckDockerStatus(engineID string) (bool, error) {
	return a.dockerEngineService.CheckDockerStatus(engineID)
}
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
