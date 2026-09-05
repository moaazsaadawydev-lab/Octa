package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
)

type rawDockerCLIContainer struct {
	ID        string `json:"ID"`
	Names     string `json:"Names"`
	Image     string `json:"Image"`
	Command   string `json:"Command"`
	CreatedAt string `json:"CreatedAt"`
	State     string `json:"State"`
	Status    string `json:"Status"`
	Ports     string `json:"Ports"`
	Labels    string `json:"Labels"`
	Size      string `json:"Size"`
}

func parseDockerCLILabels(labelsStr string) map[string]string {
	res := make(map[string]string)
	if labelsStr == "" {
		return res
	}
	parts := strings.Split(labelsStr, ",")
	for _, p := range parts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) == 2 {
			res[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return res
}

func parseDockerCLIPorts(portsRaw string) []DockerPortMapping {
	var result []DockerPortMapping
	if portsRaw == "" {
		return result
	}
	parts := strings.Split(portsRaw, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, DockerPortMapping{
				Formatted: part,
			})
		}
	}
	return result
}

// listContainersViaCLI executes docker ps with JSON formatting
func (s *DockerService) listContainersViaCLI(onlyRunning bool) ([]DockerProjectGroup, error) {
	args := []string{"ps", "--format", "{{json .}}"}
	if !onlyRunning {
		args = append(args, "-a")
	}

	cmd := s.dockerCommand(args...)
	out, err := cmd.Output()
	if err != nil {
		println("[DEBUG DockerService] CLI listContainers error:", err.Error())
		return nil, fmt.Errorf("failed to query containers via CLI: %w", err)
	}

	var containers []DockerContainer
	lines := bytes.Split(out, []byte("\n"))
	for _, line := range lines {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		var raw rawDockerCLIContainer
		if err := json.Unmarshal(line, &raw); err != nil {
			continue
		}

		labels := parseDockerCLILabels(raw.Labels)
		projectName := labels["com.docker.compose.project"]
		if projectName == "" {
			projectName = "Standalone Containers"
		}
		serviceName := labels["com.docker.compose.service"]
		if serviceName == "" {
			serviceName = raw.Names
		}

		c := DockerContainer{
			ID:        raw.ID,
			Name:      raw.Names,
			Image:     raw.Image,
			Command:   raw.Command,
			CreatedAt: raw.CreatedAt,
			State:     strings.ToLower(raw.State),
			Status:    raw.Status,
			Ports:     parseDockerCLIPorts(raw.Ports),
			PortsRaw:  raw.Ports,
			Project:   projectName,
			Service:   serviceName,
			Size:      raw.Size,
		}
		containers = append(containers, c)
	}

	return groupAndSortContainers(containers), nil
}

// groupAndSortContainers groups a list of containers by project and sorts them
func groupAndSortContainers(containers []DockerContainer) []DockerProjectGroup {
	groupsMap := make(map[string]*DockerProjectGroup)
	for _, c := range containers {
		group, exists := groupsMap[c.Project]
		if !exists {
			group = &DockerProjectGroup{
				Project:    c.Project,
				Containers: []DockerContainer{},
			}
			groupsMap[c.Project] = group
		}
		group.Containers = append(group.Containers, c)
		group.TotalContainers++
		if c.State == "running" {
			group.RunningContainers++
		}
	}

	var result []DockerProjectGroup
	for _, g := range groupsMap {
		result = append(result, *g)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Project == "Standalone Containers" {
			return false
		}
		if result[j].Project == "Standalone Containers" {
			return true
		}
		return result[i].Project < result[j].Project
	})

	return result
}

// ListContainers queries and groups containers by Compose project (SDK + CLI fallback)
func (s *DockerService) ListContainers(onlyRunning bool) ([]DockerProjectGroup, error) {
	println(fmt.Sprintf("[DEBUG DockerService] ListContainers invoked from Frontend (onlyRunning: %v)", onlyRunning))

	cli, err := s.initClient()
	if err != nil {
		println("[DEBUG DockerService] SDK client unavailable, using CLI fallback...")
		return s.listContainersViaCLI(onlyRunning)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	listOpts := container.ListOptions{
		All: !onlyRunning,
	}

	rawList, err := cli.ContainerList(ctx, listOpts)
	if err != nil {
		println("[DEBUG DockerService] SDK ContainerList failed:", err.Error(), "- using CLI fallback...")
		return s.listContainersViaCLI(onlyRunning)
	}

	var containers []DockerContainer
	for _, raw := range rawList {
		containerName := ""
		if len(raw.Names) > 0 {
			containerName = strings.TrimPrefix(raw.Names[0], "/")
		}

		projectName := raw.Labels["com.docker.compose.project"]
		if projectName == "" {
			projectName = "Standalone Containers"
		}
		serviceName := raw.Labels["com.docker.compose.service"]
		if serviceName == "" {
			serviceName = containerName
		}

		var ports []DockerPortMapping
		var portStrings []string
		for _, p := range raw.Ports {
			formatted := ""
			if p.PublicPort > 0 {
				if p.IP != "" && p.IP != "0.0.0.0" && p.IP != "::" {
					formatted = fmt.Sprintf("%s:%d->%d/%s", p.IP, p.PublicPort, p.PrivatePort, p.Type)
				} else {
					formatted = fmt.Sprintf("%d->%d/%s", p.PublicPort, p.PrivatePort, p.Type)
				}
			} else {
				formatted = fmt.Sprintf("%d/%s", p.PrivatePort, p.Type)
			}
			ports = append(ports, DockerPortMapping{
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
				Formatted:   formatted,
			})
			portStrings = append(portStrings, formatted)
		}

		sizeStr := ""
		if raw.SizeRw > 0 {
			sizeStr = fmt.Sprintf("%d B", raw.SizeRw)
		}

		c := DockerContainer{
			ID:        raw.ID,
			Name:      containerName,
			Image:     raw.Image,
			Command:   raw.Command,
			CreatedAt: time.Unix(raw.Created, 0).Format("2006-01-02 15:04:05"),
			State:     strings.ToLower(raw.State),
			Status:    raw.Status,
			Ports:     ports,
			PortsRaw:  strings.Join(portStrings, ", "),
			Project:   projectName,
			Service:   serviceName,
			Size:      sizeStr,
		}
		containers = append(containers, c)
	}

	result := groupAndSortContainers(containers)
	println(fmt.Sprintf("[DEBUG DockerService] Retrieved %d groups (%d containers) via SDK", len(result), len(containers)))
	return result, nil
}
