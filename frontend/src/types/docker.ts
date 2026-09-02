export interface DockerPortMapping {
  privatePort: number;
  publicPort?: number;
  type: string;
  formatted: string;
}

export type DockerContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead';

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  command: string;
  createdAt: string;
  state: DockerContainerState | string;
  status: string;
  ports: DockerPortMapping[];
  portsRaw: string;
  project: string;
  service: string;
  size: string;
}

export interface DockerProjectGroup {
  project: string;
  totalContainers: number;
  runningContainers: number;
  containers: DockerContainer[];
}
