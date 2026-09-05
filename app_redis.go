package main

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
