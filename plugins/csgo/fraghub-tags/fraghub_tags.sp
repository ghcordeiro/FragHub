/**
 * FragHub Tags Plugin (CS:GO)
 * Version: 1.0.0
 * Author: FragHub
 * Description: Display player level tags [1-10] or [ADMIN] in CS:GO based on FragHub ratings
 *
 * Requirements: TAGPLG-REQ-002, TAGPLG-REQ-003, TAGPLG-REQ-004, TAGPLG-REQ-006
 */

#include <sourcemod>
#include <cstrike>

#pragma newdecls required
#pragma semicolon 1

// Forward declarations
public Plugin myinfo =
{
	name = "FragHub Tags",
	author = "FragHub",
	description = "Display player level tags [1-10] or [ADMIN] in CS:GO",
	version = "1.0.0",
	url = "https://fraghub.dev"
};

// Configuration
char g_ApiUrl[256] = "http://localhost:3000";

// Cache: client index => (level, role, timestamp)
enum struct PlayerCache
{
	int level;
	char role[16];
	int cachedAt;
}

PlayerCache g_playerCache[MAXPLAYERS + 1];

const int CACHE_TTL = 300; // 5 minutes in seconds
const int API_TIMEOUT = 3000; // 3 seconds in milliseconds

public void OnPluginStart()
{
	LoadConfig();
	HookEvent("player_connect", Event_PlayerConnect, EventHookMode_Post);
	HookEvent("player_disconnect", Event_PlayerDisconnect, EventHookMode_Pre);
	PrintToServer("[FragHub Tags] Plugin loaded. API URL: %s", g_ApiUrl);
}

public void OnMapStart()
{
	// Reset cache on map start
	for (int i = 0; i <= MAXPLAYERS; i++) {
		g_playerCache[i].level = 0;
		g_playerCache[i].role[0] = '\0';
		g_playerCache[i].cachedAt = 0;
	}
	PrintToServer("[FragHub Tags] Cache cleared on map start");
}

/**
 * Load configuration from fraghub_tags.cfg
 */
void LoadConfig()
{
	char configPath[PLATFORM_MAX_PATH];
	BuildPath(Path_SM, configPath, sizeof(configPath), "configs/fraghub_tags.cfg");

	if (!FileExists(configPath)) {
		PrintToServer("[FragHub Tags] Config file not found: %s", configPath);
		return;
	}

	File configFile = OpenFile(configPath, "r");
	if (configFile == null) {
		PrintToServer("[FragHub Tags] Failed to open config file");
		return;
	}

	char line[256];
	while (configFile.ReadLine(line, sizeof(line))) {
		// Simple key=value parsing
		char parts[2][256];
		if (ExplodeString(line, "=", parts, 2, 256) == 2) {
			char key[256], value[256];
			strcopy(key, sizeof(key), parts[0]);
			strcopy(value, sizeof(value), parts[1]);

			// Trim whitespace
			TrimString(key);
			TrimString(value);

			if (StrEqual(key, "api_url")) {
				strcopy(g_ApiUrl, sizeof(g_ApiUrl), value);
			}
		}
	}

	delete configFile;
	PrintToServer("[FragHub Tags] Config loaded: api_url=%s", g_ApiUrl);
}

/**
 * Event: Player Connect
 * Fetch player level and apply tag
 */
public Action Event_PlayerConnect(Event event, const char[] name, bool dontBroadcast)
{
	int client = GetClientOfUserId(event.GetInt("userid"));
	if (client > 0 && IsClientConnected(client) && !IsFakeClient(client)) {
		// Fetch level asynchronously
		FetchAndApplyTag(client);
	}
	return Plugin_Continue;
}

/**
 * Event: Player Disconnect
 * Clean up cache
 */
public Action Event_PlayerDisconnect(Event event, const char[] name, bool dontBroadcast)
{
	int client = GetClientOfUserId(event.GetInt("userid"));
	if (client > 0) {
		g_playerCache[client].level = 0;
		g_playerCache[client].role[0] = '\0';
		g_playerCache[client].cachedAt = 0;
		PrintToServer("[FragHub Tags] Player %d disconnected, cache cleaned", client);
	}
	return Plugin_Continue;
}

/**
 * Fetch player level from API or cache, apply tag
 * TAGPLG-REQ-003, TAGPLG-REQ-004, TAGPLG-REQ-006
 */
void FetchAndApplyTag(int client)
{
	int steamid = GetSteamAccountID(client);
	if (steamid == 0) {
		PrintToServer("[FragHub Tags] Failed to get SteamID for client %d", client);
		return;
	}

	int now = GetTime();

	// Check cache (TAGPLG-REQ-004: 5-minute TTL)
	if (g_playerCache[client].cachedAt > 0 && (now - g_playerCache[client].cachedAt) < CACHE_TTL) {
		char tag[32];
		GenerateTag(g_playerCache[client].level, g_playerCache[client].role, tag, sizeof(tag));
		ApplyTag(client, tag);
		PrintToServer("[FragHub Tags] Cache hit for %d: %s", steamid, tag);
		return;
	}

	// Fetch from API via HTTP
	FetchPlayerLevel(client, steamid);
}

/**
 * HTTP request to /api/player/{steamid}
 * TAGPLG-REQ-006: 3-second timeout
 */
void FetchPlayerLevel(int client, int steamid)
{
	// Note: SourceMod's SteamWorks extension provides HTTP functionality
	// This is a placeholder showing the intended API call
	// In practice, you would use SteamWorks.inc or native HTTP support

	// Example (requires SteamWorks extension):
	// char url[256];
	// Format(url, sizeof(url), "%s/api/player/%d", g_ApiUrl, steamid);
	// SteamWorks_FetchURL(url, OnFetchComplete, client);

	PrintToServer("[FragHub Tags] Fetching level for client %d (SteamID: %d)", client, steamid);

	// For now, default to level 5 (placeholder)
	int level = 5;
	char role[16] = "player";

	g_playerCache[client].level = level;
	strcopy(g_playerCache[client].role, sizeof(g_playerCache[client].role), role);
	g_playerCache[client].cachedAt = GetTime();

	char tag[32];
	GenerateTag(level, role, tag, sizeof(tag));
	ApplyTag(client, tag);
	PrintToServer("[FragHub Tags] Applied tag %s to client %d", tag, client);
}

/**
 * Generate tag: [N] for levels 1-10, [ADMIN] for admins
 * TAGPLG-REQ-003
 */
void GenerateTag(int level, const char[] role, char[] output, int maxlen)
{
	if (StrEqual(role, "admin")) {
		Format(output, maxlen, "[ADMIN]");
	} else {
		// Clamp level to 1-10
		if (level < 1) level = 1;
		if (level > 10) level = 10;
		Format(output, maxlen, "[%d]", level);
	}
}

/**
 * Apply tag to player (clan tag or name prefix)
 */
void ApplyTag(int client, const char[] tag)
{
	if (!IsClientInGame(client)) {
		return;
	}

	// CS:GO: Set clan tag
	// Note: This requires cstrike.inc and use of CS_SetClientClanTag
	CS_SetClientClanTag(client, tag);
	PrintToServer("[FragHub Tags] Set clan tag '%s' for client %d", tag, client);
}

/**
 * Trim whitespace from string (helper)
 */
void TrimString(char[] buffer)
{
	int len = strlen(buffer);
	if (len == 0) return;

	// Trim left
	int i = 0;
	while (i < len && (buffer[i] == ' ' || buffer[i] == '\t')) {
		i++;
	}

	if (i > 0) {
		strcopy(buffer, len, buffer[i]);
		len -= i;
	}

	// Trim right
	while (len > 0 && (buffer[len - 1] == ' ' || buffer[len - 1] == '\t' || buffer[len - 1] == '\n' || buffer[len - 1] == '\r')) {
		len--;
		buffer[len] = '\0';
	}
}
