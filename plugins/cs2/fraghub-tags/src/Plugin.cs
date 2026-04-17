using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace FraghubTags;

public class PluginConfig : BasePluginConfig
{
    public string ApiUrl { get; set; } = "http://127.0.0.1:3001";
}

[MinimumApiVersion(80)]
public class FraghubTagsPlugin : BasePlugin, IPluginConfig<PluginConfig>
{
    public override string ModuleName => "FragHub Tags (CS2)";
    public override string ModuleVersion => "1.0.1";
    public override string ModuleAuthor => "FragHub";
    public override string ModuleDescription => "Display player level tags [1-10] or [ADMIN] in-game";

    public PluginConfig Config { get; set; } = new();

    public void OnConfigParsed(PluginConfig config)
    {
        Config = config;
    }

    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(3)
    };

    private readonly Dictionary<ulong, CacheEntry> _cache = new();

    private class CacheEntry
    {
        public int Level { get; set; }
        public string Role { get; set; } = "player";
        public DateTime CachedAt { get; set; }
    }

    private const int CacheTtlMinutes = 5;

    public override void Load(bool hotReload)
    {
        base.Load(hotReload);

        if (string.IsNullOrWhiteSpace(Config.ApiUrl))
        {
            Console.WriteLine("[FragHub Tags] Error: ApiUrl not configured. Plugin disabled.");
            return;
        }

        RegisterEventHandler<EventPlayerConnectFull>(OnPlayerConnectFull);
        RegisterEventHandler<EventPlayerDisconnect>(OnPlayerDisconnect);

        Console.WriteLine($"[FragHub Tags] Loaded. API: {Config.ApiUrl}");
    }

    private HookResult OnPlayerConnectFull(EventPlayerConnectFull @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
            return HookResult.Continue;

        _ = FetchAndApplyTag(player.SteamID);
        return HookResult.Continue;
    }

    private HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player != null && player.IsValid)
            _cache.Remove(player.SteamID);

        return HookResult.Continue;
    }

    private async Task FetchAndApplyTag(ulong steamId)
    {
        try
        {
            int level;
            string role;

            if (_cache.TryGetValue(steamId, out var entry) &&
                DateTime.UtcNow - entry.CachedAt < TimeSpan.FromMinutes(CacheTtlMinutes))
            {
                level = entry.Level;
                role = entry.Role;
            }
            else
            {
                var response = await FetchPlayerLevel(steamId);
                if (response == null) return;

                _cache[steamId] = new CacheEntry
                {
                    Level = response.Level,
                    Role = response.Role,
                    CachedAt = DateTime.UtcNow
                };
                level = response.Level;
                role = response.Role;
            }

            var tag = GenerateTag(level, role);

            Server.NextFrame(() =>
            {
                foreach (var player in Utilities.GetPlayers())
                {
                    if (player is { IsValid: true, IsBot: false } && player.SteamID == steamId)
                    {
                        player.Clan = tag;
                        Utilities.SetStateChanged(player, "CCSPlayerController", "m_szClan");
                        break;
                    }
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FragHub Tags] Error applying tag for {steamId}: {ex.Message}");
        }
    }

    private async Task<PlayerLevelResponse?> FetchPlayerLevel(ulong steamId)
    {
        try
        {
            var url = $"{Config.ApiUrl.TrimEnd('/')}/api/player/{steamId}";
            var response = await HttpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<PlayerLevelResponse>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return null;
        }
    }

    private static string GenerateTag(int level, string role)
    {
        if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
            return "[ADMIN]";

        return $"[{Math.Clamp(level, 1, 10)}]";
    }

    private class PlayerLevelResponse
    {
        public int Level { get; set; }
        public string Role { get; set; } = "player";
    }
}
