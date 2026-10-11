package main

// RedisConnectionConfig defines Redis connection parameters.
type RedisConnectionConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	DB       int    `json:"db"`
	SSL      bool   `json:"ssl"`
}

// RedisServerInfo contains telemetry about the connected Redis instance.
type RedisServerInfo struct {
	RedisVersion     string            `json:"redisVersion"`
	ConnectedClients int               `json:"connectedClients"`
	UsedMemoryHuman  string            `json:"usedMemoryHuman"`
	TotalKeys        int64             `json:"totalKeys"`
	UptimeInDays     int64             `json:"uptimeInDays"`
	RawInfo          map[string]string `json:"rawInfo"`
}

// RedisConnectResult is returned from ConnectRedis.
type RedisConnectResult struct {
	Success    bool            `json:"success"`
	ServerInfo RedisServerInfo `json:"serverInfo"`
	Error      string          `json:"error,omitempty"`
}

// RedisKeyInfo represents key metadata during keyspace scans.
type RedisKeyInfo struct {
	Key         string `json:"key"`
	Type        string `json:"type"` // "string", "hash", "list", "set", "zset"
	TTL         int64  `json:"ttl"`  // -1 persistent, -2 expired/none, >0 seconds
	MemoryUsage int64  `json:"memoryUsage"`
}

// ZSetMember represents a member in a Redis Sorted Set.
type ZSetMember struct {
	Member string  `json:"member"`
	Score  float64 `json:"score"`
}

// RedisKeyDetail holds value representations across all Redis data structures.
type RedisKeyDetail struct {
	Key         string            `json:"key"`
	Type        string            `json:"type"`
	TTL         int64             `json:"ttl"`
	MemoryUsage int64             `json:"memoryUsage"`
	StringValue string            `json:"stringValue,omitempty"`
	HashValue   map[string]string `json:"hashValue,omitempty"`
	ListValue   []string          `json:"listValue,omitempty"`
	SetValue    []string          `json:"setValue,omitempty"`
	ZSetValue   []ZSetMember      `json:"zsetValue,omitempty"`
}

// RedisScanResult holds pagination results from SCAN.
type RedisScanResult struct {
	Keys       []RedisKeyInfo `json:"keys"`
	NextCursor uint64         `json:"nextCursor"`
}

// RedisCommandResult holds the output from a raw CLI command execution in Redis Workbench.
type RedisCommandResult struct {
	RawOutput  any     `json:"rawOutput"`
	Formatted  string  `json:"formatted"`
	ResultType string  `json:"resultType"` // "string", "integer", "slice", "map", "status", "error", "nil"
	DurationMs float64 `json:"durationMs"`
	Command    string  `json:"command"`
	Error      string  `json:"error,omitempty"`
}

// FormFieldPayload represents a key-value or file part in multipart requests.
type FormFieldPayload struct {
	Key         string   `json:"key"`
	Value       string   `json:"value"`
	Type        string   `json:"type"` // "text" | "file"
	FileName    string   `json:"fileName,omitempty"`
	FilePath    string   `json:"filePath,omitempty"`
	Base64Data  string   `json:"base64Data,omitempty"`
	ContentType string   `json:"contentType,omitempty"`
	FileNames   []string `json:"fileNames,omitempty"`
	FilePaths   []string `json:"filePaths,omitempty"`
	FileBase64  []string `json:"fileBase64,omitempty"`
}

// BinaryFilePayload holds binary file upload details for raw/octet-stream requests.
type BinaryFilePayload struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Size        int64  `json:"size"`
	ContentType string `json:"contentType"`
	Base64Data  string `json:"base64Data,omitempty"`
}

// HttpRequestPayload represents the incoming HTTP request configuration from the frontend.
type HttpRequestPayload struct {
	Method      string             `json:"method"`
	URL         string             `json:"url"`
	Headers     map[string]string  `json:"headers"`
	QueryParams map[string]string  `json:"queryParams,omitempty"`
	BodyType    string             `json:"bodyType"` // "none" | "json" | "form-data" | "x-www-form-urlencoded" | "binary"
	BodyContent string             `json:"bodyContent"`
	FormData    []FormFieldPayload `json:"formData,omitempty"`
	UrlEncoded  map[string]string  `json:"urlEncoded,omitempty"`
	BinaryFile  *BinaryFilePayload `json:"binaryFile,omitempty"`
	TimeoutSec  int                `json:"timeoutSec,omitempty"`
}

// HttpResponsePayload represents the structured HTTP response returned to the frontend.
type HttpResponsePayload struct {
	Status     int               `json:"status"`
	StatusText string            `json:"statusText"`
	DurationMs float64           `json:"durationMs"`
	SizeKb     float64           `json:"sizeKb"`
	Data       any               `json:"data"`
	Headers    map[string]string `json:"headers"`
	Cookies    []string          `json:"cookies,omitempty"`
	Error      string            `json:"error,omitempty"`
}

// SelectedFileMeta represents metadata for files selected via native dialog.
type SelectedFileMeta struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Size        int64  `json:"size"`
	Base64Data  string `json:"base64Data"`
	ContentType string `json:"contentType"`
}

// ProjectHttpClient holds HTTP client data for the project.
type ProjectHttpClient struct {
	Collections         []any  `json:"collections"`
	Environments        []any  `json:"environments"`
	GlobalVariables     []any  `json:"globalVariables"`
	ActiveEnvironmentID string `json:"activeEnvironmentId"`
}

// ProjectGitConfig holds Git repository configuration and active state.
type ProjectGitConfig struct {
	RepoPath      string `json:"repoPath"`
	AutoWatch     bool   `json:"autoWatch"`
	DefaultBranch string `json:"defaultBranch,omitempty"`
}

// ProjectWorkspace is the root schema for a .octa project file.
type ProjectWorkspace struct {
	SchemaVersion int                     `json:"schemaVersion"`
	ID            string                  `json:"id"`
	Name          string                  `json:"name"`
	CreatedAt     string                  `json:"createdAt"`
	UpdatedAt     string                  `json:"updatedAt"`
	Databases     []ConnectionConfig      `json:"databases"`
	SqlQueries    []any                   `json:"sqlQueries"`
	Redis         []RedisConnectionConfig `json:"redis"`
	HttpClient    ProjectHttpClient       `json:"httpClient"`
	Git           ProjectGitConfig        `json:"git"`
}

// ProjectFileResult is returned from project file operations.
type ProjectFileResult struct {
	FilePath  string            `json:"filePath"`
	Project   *ProjectWorkspace `json:"project,omitempty"`
	Error     string            `json:"error,omitempty"`
	Cancelled bool              `json:"cancelled"`
}
