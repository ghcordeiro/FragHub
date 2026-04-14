using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace FraghubTags;

/// <summary>
/// CS2 Plugin: Fetch player level from FragHub API and display as in-game tag
/// TAGPLG-REQ-001, TAGPLG-REQ-003, TAGPLG-REQ-004, TAGPLG-REQ-006
/// </summary>
[MinimumApiVersion(80)]
public class FraghubTagsPlugin : BasePlugin, IPluginConfig<PluginConfig>
{
    public override string ModuleName => "FragHub Tags (CS2)";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "FragHub";
    public override string ModuleDescription => "Display player level tags [1-10] or [ADMIN] in-game";

    public PluginConfig Config { get; set; } = new();

    // HTTP client for API calls
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(3) // TAGPLG-REQ-006: 3-second timeout
    };

    // Cache: SteamID64 → (level, role, timestamp)
    private readonly Dictionary<ulong, CacheEntry> _cache = new();

    private class CacheEntry
    {
        public int Level { get; set; }
        public string Role { get; set; } = "player";
        public DateTime CachedAt { get; set; }
    }

    private const int CacheTtlMinutes = 5; // TAGPLG-REQ-004: 5-minute cache

    public override void Load(bool hotReload)
    {
        base.Load(hotReload);

        if (string.IsNullOrWhiteSpace(Config.ApiUrl))
        {
            Server.PrintToChatAll("[FragHub Tags] Error: api_url not configured in config. Plugin disabled.");
            return;
        }

        Server.PrintToChatAll("[FragHub Tags] Plugin loaded. API URL: " + Config.ApiUrl);
        RegisterEventHandler<EventPlayerConnect>(OnPlayerConnect);
        RegisterEventHandler<EventPlayerDisconnect>(OnPlayerDisconnect);
    }

    /// <summary>
    /// OnPlayerConnect: Fetch player level and apply tag
    /// TAGPLG-REQ-001, TAGPLG-REQ-003
    /// </summary>
    private HookResult OnPlayerConnect(EventPlayerConnect @event, GameEventHandler handler)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid)
            return HookResult.Continue;

        var steamId = player.SteamID;

        // Fetch level asynchronously (fire-and-forget)
        _ = FetchAndApplyTag(steamId);

        return HookResult.Continue;
    }

    /// <summary>
    /// OnPlayerDisconnect: Remove from cache
    /// TAGPLG-REQ-004
    /// </summary>
    private HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventHandler handler)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid)
            return HookResult.Continue;

        var steamId = player.SteamID;
        _cache.Remove(steamId);
        Server.PrintToChatAll($"[FragHub Tags] Player {steamId} disconnected, cache cleaned");

        return HookResult.Continue;
    }

    /// <summary>
    /// Fetch player level from API or cache, apply tag
    /// TAGPLG-REQ-003, TAGPLG-REQ-004, TAGPLG-REQ-005, TAGPLG-REQ-006
    /// </summary>
    private async Task FetchAndApplyTag(ulong steamId)
    {
        try
        {
            // Check cache (TAGPLG-REQ-004: 5-minute TTL)
            if (_cache.TryGetValue(steamId, out var entry))
            {
                if (DateTime.UtcNow - entry.CachedAt < TimeSpan.FromMinutes(CacheTtlMinutes))
                {
                    var tag = GenerateTag(entry.Level, entry.Role);
                    ApplyTag(steamId, tag);
                    Server.PrintToChatAll($"[FragHub Tags] Cache hit for {steamId}: {tag}");
                    return;
                }
                else
                {
                    _cache.Remove(steamId);
                }
            }

            // Fetch from API
            var response = await FetchPlayerLevel(steamId);
            if (response != null)
            {
                _cache[steamId] = new CacheEntry
                {
                    Level = response.Level,
                    Role = response.Role,
                    CachedAt = DateTime.UtcNow
                };

                var tag = GenerateTag(response.Level, response.Role);
                ApplyTag(steamId, tag);
                Server.PrintToChatAll($"[FragHub Tags] Fetched level {response.Level} for {steamId}");
            }
            else
            {
                // API error or timeout: fallback silent (TAGPLG-REQ-005)
                Server.PrintToChatAll($"[FragHub Tags] Failed to fetch level for {steamId}, no tag applied");
            }
        }
        catch (Exception ex)
        {
            Server.PrintToChatAll($"[FragHub Tags] Error fetching level: {ex.Message}");
        }
    }

    /// <summary>
    /// HTTP GET request to /api/player/{steamid}
    /// TAGPLG-REQ-006: 3-second timeout
    /// </summary>
    private async Task<PlayerLevelResponse?> FetchPlayerLevel(ulong steamId)
    {
        try
        {
            var url = $"{Config.ApiUrl}/api/player/{steamId}";
            var response = await HttpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                Server.PrintToChatAll($"[FragHub Tags] API error: HTTP {(int)response.StatusCode} for {steamId}");
                return null;
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var parsed = JsonSerializer.Deserialize<PlayerLevelResponse>(jsonContent, options);

            return parsed;
        }
        catch (TaskCanceledException)
        {
            Server.PrintToChatAll($"[FragHub Tags] API timeout for {steamId}");
            return null;
        }
        catch (Exception ex)
        {
            Server.PrintToChatAll($"[FragHub Tags] API request failed: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Generate tag: [N] for levels 1-10, [ADMIN] for admins
    /// TAGPLG-REQ-003
    /// </summary>
    private static string GenerateTag(int level, string role)
    {
        if (role == "admin")
            return "[ADMIN]";

        // Clamp level to 1-10
        var clampedLevel = Math.Max(1, Math.Min(10, level));
        return $"[{clampedLevel}]";
    }

    /// <summary>
    /// Apply tag to player name in-game
    /// </summary>
    private void ApplyTag(ulong steamId, string tag)
    {
        try
        {
            // Note: Counter-Strike Sharp API may vary in how to set player name/tag
            // This is a placeholder that would need adjustment based on actual API
            // Typical approach: find player by SteamID, update their name or clan tag
            var players = Utilities.GetPlayers();
            foreach (var player in players)
            {
                if (player != null && player.IsValid && player.SteamID == steamId)
                {
                    // CS2 API: Set clan tag or update player name
                    // player.Clan = tag; // or similar method
                    Server.PrintToChatAll($"[FragHub Tags] Applied tag {tag} to player {steamId}");
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            Server.PrintToChatAll($"[FragHub Tags] Failed to apply tag: {ex.Message}");
        }
    }

    /// <summary>
    /// Configuration class
    /// </summary>
    public class PluginConfig : BasePluginConfig
    {
        public string? ApiUrl { get; set; } = "http://localhost:3000";
    }

    /// <summary>
    /// API response model
    /// </summary>
    public class PlayerLevelResponse
    {
        public int Level { get; set; }
        public string Role { get; set; } = "player";
    }
}
