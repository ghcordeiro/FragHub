using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Menu;
using CounterStrikeSharp.API.Modules.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace FraghubX1Draft;

public class X1DraftConfig : BasePluginConfig
{
    public string AdminFlag { get; set; } = "@css/admin";
    public string MatchCfg  { get; set; } = "matchzy";

    [JsonPropertyName("MapPool")]
    public List<string> MapPool { get; set; } = new()
    {
        "de_mirage", "de_inferno", "de_nuke",
        "de_ancient", "de_anubis", "de_dust2", "de_vertigo"
    };
}

public enum DraftPhase
{
    Idle,
    X1Duel,
    WinnerPick,
    LoserPick,
    Veto,
    MatchStarting,
}

[MinimumApiVersion(80)]
public class X1DraftPlugin : BasePlugin, IPluginConfig<X1DraftConfig>
{
    public override string ModuleName    => "FragHub X1 Draft (CS2)";
    public override string ModuleVersion => "1.1.0";
    public override string ModuleAuthor  => "FragHub";
    public override string ModuleDescription => "Snake draft via x1 duels + map veto — launches MatchZy after 5v5 closes";

    public X1DraftConfig Config { get; set; } = new();
    public void OnConfigParsed(X1DraftConfig config) => Config = config;

    // ─── Draft state ─────────────────────────────────────────────────────────
    private DraftPhase _phase = DraftPhase.Idle;
    private CCSPlayerController? _capCT;
    private CCSPlayerController? _capT;
    private CCSPlayerController? _winner;
    private CCSPlayerController? _loser;
    private readonly List<CCSPlayerController> _specPool = new();
    private readonly List<CCSPlayerController> _teamCT  = new();
    private readonly List<CCSPlayerController> _teamT   = new();
    private bool _roundStartPending;
    private bool _duelActive;

    // ─── Veto state ──────────────────────────────────────────────────────────
    private readonly List<string> _remainingMaps = new();
    private string _chosenMap = string.Empty;
    private int _vetoStep; // 0-5 → CT ban, T ban, CT ban, T ban, CT ban, T ban
    // veto order: CT=0, T=1, CT=2, T=3, CT=4, T=5
    private static readonly CsTeam[] VetoOrder = { CsTeam.CounterTerrorist, CsTeam.Terrorist,
                                                    CsTeam.CounterTerrorist, CsTeam.Terrorist,
                                                    CsTeam.CounterTerrorist, CsTeam.Terrorist };

    public override void Load(bool hotReload)
    {
        base.Load(hotReload);
        AddCommand("css_x1draft",  "Start x1 draft",  OnX1Draft);
        AddCommand("css_cancelx1", "Cancel x1 draft", OnCancelX1);
        RegisterEventHandler<EventRoundStart>(OnRoundStart);
        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        RegisterEventHandler<EventPlayerDisconnect>(OnPlayerDisconnect);
        Console.WriteLine("[X1Draft] Loaded.");
    }

    private bool IsAdmin(CCSPlayerController player) =>
        string.IsNullOrEmpty(Config.AdminFlag) ||
        AdminManager.PlayerHasPermissions(player, Config.AdminFlag);

    // ─── Commands ────────────────────────────────────────────────────────────

    private void OnX1Draft(CCSPlayerController? player, CommandInfo info)
    {
        if (player == null || !player.IsValid) return;
        if (!IsAdmin(player)) { player.PrintToChat("[X1Draft] Sem permissão."); return; }
        if (_phase != DraftPhase.Idle) { player.PrintToChat("[X1Draft] Draft em andamento. Use !cancelx1."); return; }

        var all = GetHumanPlayers();
        if (all.Count < 2) { player.PrintToChat("[X1Draft] Precisam de pelo menos 2 jogadores."); return; }

        StartDraft(all);
    }

    private void OnCancelX1(CCSPlayerController? player, CommandInfo info)
    {
        if (player == null || !player.IsValid) return;
        if (!IsAdmin(player)) { player.PrintToChat("[X1Draft] Sem permissão."); return; }
        if (_phase == DraftPhase.Idle) { player.PrintToChat("[X1Draft] Nenhum draft em andamento."); return; }

        CloseAllMenus();
        ResetState();
        Server.PrintToChatAll("[X1Draft] Draft cancelado pelo admin.");
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    private HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        if (_phase != DraftPhase.X1Duel || !_roundStartPending) return HookResult.Continue;
        _roundStartPending = false;
        _duelActive = false;

        Server.NextFrame(() =>
        {
            var capIds = new HashSet<ulong>();
            if (_capCT != null) capIds.Add(_capCT.SteamID);
            if (_capT  != null) capIds.Add(_capT.SteamID);

            foreach (var p in GetHumanPlayers())
                if (p.IsValid && !capIds.Contains(p.SteamID))
                    p.ChangeTeam(CsTeam.Spectator);

            if (_capCT?.IsValid == true) _capCT.ChangeTeam(CsTeam.CounterTerrorist);
            if (_capT?.IsValid  == true) _capT.ChangeTeam(CsTeam.Terrorist);

            Server.NextFrame(ArmCaptains);
        });

        return HookResult.Continue;
    }

    private HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        if (_phase != DraftPhase.X1Duel || !_duelActive) return HookResult.Continue;

        var dead = @event.Userid;
        if (dead == null || !dead.IsValid) return HookResult.Continue;

        CCSPlayerController? winner = null;
        CCSPlayerController? loser  = null;

        if      (_capCT != null && dead.SteamID == _capCT.SteamID) { winner = _capT;  loser = _capCT; }
        else if (_capT  != null && dead.SteamID == _capT.SteamID)  { winner = _capCT; loser = _capT;  }

        if (winner == null) return HookResult.Continue;

        _winner = winner;
        _loser  = loser;
        Server.PrintToChatAll($"[X1Draft] {winner.PlayerName} venceu o x1!");
        _phase = DraftPhase.WinnerPick;
        OpenPickMenu(winner, "vencedor");
        return HookResult.Continue;
    }

    private HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        var leaving = @event.Userid;
        if (leaving == null || !leaving.IsValid || _phase == DraftPhase.Idle) return HookResult.Continue;

        var sid = leaving.SteamID;
        _specPool.RemoveAll(p => p.SteamID == sid);

        if (_phase == DraftPhase.X1Duel)
        {
            if      (_capCT != null && _capCT.SteamID == sid) { Server.PrintToChatAll($"[X1Draft] Cap CT desconectou — {_capT?.PlayerName} vence W.O."); AwardWalkover(_capT, _capCT); }
            else if (_capT  != null && _capT.SteamID  == sid) { Server.PrintToChatAll($"[X1Draft] Cap T desconectou — {_capCT?.PlayerName} vence W.O.");  AwardWalkover(_capCT, _capT); }
        }

        return HookResult.Continue;
    }

    // ─── Pick Menu ───────────────────────────────────────────────────────────

    private void OpenPickMenu(CCSPlayerController captain, string role)
    {
        if (_specPool.Count == 0) { FinishDraft(); return; }

        foreach (var p in GetHumanPlayers())
            if (p.SteamID != captain.SteamID) MenuManager.CloseActiveMenu(p);

        var team  = GetCapTeam(captain);
        var menu  = new CenterHtmlMenu($"[{TeamName(team)}] {captain.PlayerName} — escolha um jogador:", this);
        var snap  = _specPool.ToList();

        foreach (var spec in snap)
        {
            var captured = spec;
            menu.AddMenuOption(captured.PlayerName, (_, _) => HandlePick(captain, captured));
        }

        MenuManager.OpenCenterHtmlMenu(this, captain, menu);
        Server.PrintToChatAll($"[X1Draft] {captain.PlayerName} ({role}) está escolhendo...");
    }

    private void HandlePick(CCSPlayerController captain, CCSPlayerController picked)
    {
        var isWinner = _phase == DraftPhase.WinnerPick && _winner != null && captain.SteamID == _winner.SteamID;
        var isLoser  = _phase == DraftPhase.LoserPick  && _loser  != null && captain.SteamID == _loser.SteamID;
        if (!isWinner && !isLoser) return;
        if (!_specPool.Any(p => p.SteamID == picked.SteamID)) return;

        MenuManager.CloseActiveMenu(captain);
        _specPool.RemoveAll(p => p.SteamID == picked.SteamID);

        var team = GetCapTeam(captain);
        RegisterPick(picked, team);
        Server.PrintToChatAll($"[X1Draft] {captain.PlayerName} escolheu {picked.PlayerName} para {TeamName(team)}.");

        if (isWinner)
        {
            if (_specPool.Count == 0) { FinishDraft(); return; }
            _phase = DraftPhase.LoserPick;
            if (_loser != null) OpenPickMenu(_loser, "perdedor");
        }
        else
        {
            if (_specPool.Count == 0) { FinishDraft(); return; }
            BeginX1Round();
        }
    }

    // ─── Veto ────────────────────────────────────────────────────────────────

    private void StartVeto()
    {
        _phase = DraftPhase.Veto;
        _vetoStep = 0;
        _remainingMaps.Clear();
        _remainingMaps.AddRange(Config.MapPool);

        Server.PrintToChatAll("[X1Draft] ==> Veto de mapa iniciado! (Bo1 — 6 bans)");
        PrintRemainingMaps();
        OpenVetoMenu();
    }

    private void OpenVetoMenu()
    {
        if (_remainingMaps.Count <= 1) { FinalizeVeto(); return; }

        var vetoTeam = VetoOrder[_vetoStep];
        var banner   = vetoTeam == CsTeam.CounterTerrorist ? _capCT : _capT;
        if (banner == null || !banner.IsValid) { AdvanceVeto(string.Empty); return; }

        foreach (var p in GetHumanPlayers())
            if (p.SteamID != banner.SteamID) MenuManager.CloseActiveMenu(p);

        var menu = new CenterHtmlMenu($"[{TeamName(vetoTeam)}] {banner.PlayerName} — bane um mapa:", this);
        var snap = _remainingMaps.ToList();

        foreach (var map in snap)
        {
            var captured = map;
            menu.AddMenuOption(MapDisplayName(captured), (_, _) => HandleBan(banner, captured));
        }

        MenuManager.OpenCenterHtmlMenu(this, banner, menu);
        Server.PrintToChatAll($"[X1Draft] {banner.PlayerName} ({TeamName(vetoTeam)}) está banindo...");
    }

    private void HandleBan(CCSPlayerController banner, string map)
    {
        if (_phase != DraftPhase.Veto) return;
        if (!_remainingMaps.Contains(map)) return;

        var vetoTeam = VetoOrder[_vetoStep];
        var expected = vetoTeam == CsTeam.CounterTerrorist ? _capCT : _capT;
        if (expected == null || banner.SteamID != expected.SteamID) return;

        MenuManager.CloseActiveMenu(banner);
        AdvanceVeto(map);
    }

    private void AdvanceVeto(string bannedMap)
    {
        if (!string.IsNullOrEmpty(bannedMap))
        {
            _remainingMaps.Remove(bannedMap);
            Server.PrintToChatAll($"[X1Draft] {MapDisplayName(bannedMap)} banido. Mapas restantes: {string.Join(", ", _remainingMaps.Select(MapDisplayName))}");
        }

        _vetoStep++;

        if (_remainingMaps.Count <= 1) { FinalizeVeto(); return; }
        if (_vetoStep >= VetoOrder.Length) { FinalizeVeto(); return; }

        OpenVetoMenu();
    }

    private void FinalizeVeto()
    {
        var chosenMap = _remainingMaps.FirstOrDefault() ?? Config.MapPool.First();
        Server.PrintToChatAll($"[X1Draft] Mapa escolhido: {MapDisplayName(chosenMap)}! Iniciando partida...");

        _phase = DraftPhase.MatchStarting;

        foreach (var p in _teamCT) if (p.IsValid) p.ChangeTeam(CsTeam.CounterTerrorist);
        foreach (var p in _teamT)  if (p.IsValid) p.ChangeTeam(CsTeam.Terrorist);

        Server.NextFrame(() =>
        {
            Server.ExecuteCommand($"exec {Config.MatchCfg}");
            Server.ExecuteCommand($"changelevel {chosenMap}");
            ResetState();
        });
    }

    private void PrintRemainingMaps()
    {
        Server.PrintToChatAll($"[X1Draft] Pool: {string.Join(" | ", _remainingMaps.Select(MapDisplayName))}");
    }

    // ─── Draft Logic ─────────────────────────────────────────────────────────

    private void StartDraft(List<CCSPlayerController> all)
    {
        ResetState();

        var rng      = new Random();
        var shuffled = all.OrderBy(_ => rng.Next()).ToList();
        _capCT = shuffled[0];
        _capT  = shuffled[1];

        _specPool.AddRange(shuffled.Skip(2));
        _teamCT.Add(_capCT);
        _teamT.Add(_capT);

        Server.PrintToChatAll($"[X1Draft] Draft iniciado! Capitães: {_capCT.PlayerName} (CT) vs {_capT.PlayerName} (T).");
        Server.PrintToChatAll($"[X1Draft] {_specPool.Count} jogadores no pool. X1 começando...");

        BeginX1Round();
    }

    private void BeginX1Round()
    {
        _phase = DraftPhase.X1Duel;
        _roundStartPending = true;
        _duelActive = false;

        Server.ExecuteCommand("exec fraghub_x1draft_duel");
        Server.ExecuteCommand("mp_restartgame 1");

        Server.PrintToChatAll($"[X1Draft] X1: {_capCT?.PlayerName ?? "CT"} vs {_capT?.PlayerName ?? "T"}. Boa sorte!");
    }

    private void ArmCaptains()
    {
        foreach (var cap in new[] { _capCT, _capT })
        {
            if (cap == null || !cap.IsValid || cap.PlayerPawn?.Value == null) continue;
            cap.RemoveWeapons();
            cap.GiveNamedItem("weapon_knife");
            cap.GiveNamedItem("weapon_deagle");
            cap.GiveNamedItem("item_assaultsuit");
            cap.PlayerPawn.Value.Health    = 100;
            cap.PlayerPawn.Value.ArmorValue = 100;
        }
        _duelActive = true;
    }

    private void RegisterPick(CCSPlayerController player, CsTeam team)
    {
        if (team == CsTeam.CounterTerrorist) _teamCT.Add(player);
        else _teamT.Add(player);
        if (player.IsValid) player.ChangeTeam(team);
    }

    private void FinishDraft()
    {
        Server.PrintToChatAll("[X1Draft] Times fechados!");
        Server.PrintToChatAll($"[X1Draft] CT: {string.Join(", ", _teamCT.Select(p => p.PlayerName))}");
        Server.PrintToChatAll($"[X1Draft] T:  {string.Join(", ", _teamT.Select(p => p.PlayerName))}");

        foreach (var p in _teamCT) if (p.IsValid) p.ChangeTeam(CsTeam.CounterTerrorist);
        foreach (var p in _teamT)  if (p.IsValid) p.ChangeTeam(CsTeam.Terrorist);

        CloseAllMenus();
        StartVeto();
    }

    private void AwardWalkover(CCSPlayerController? winner, CCSPlayerController? loser)
    {
        _winner = winner;
        _loser  = loser;
        _phase  = DraftPhase.WinnerPick;
        if (_specPool.Count == 0) { FinishDraft(); return; }
        if (_winner != null) OpenPickMenu(_winner, "vencedor");
    }

    private void ResetState()
    {
        _phase = DraftPhase.Idle;
        _capCT = null;
        _capT  = null;
        _winner = null;
        _loser  = null;
        _specPool.Clear();
        _teamCT.Clear();
        _teamT.Clear();
        _remainingMaps.Clear();
        _chosenMap = string.Empty;
        _roundStartPending = false;
        _duelActive = false;
        _vetoStep = 0;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static List<CCSPlayerController> GetHumanPlayers() =>
        Utilities.GetPlayers().Where(p => p is { IsValid: true, IsBot: false, IsHLTV: false }).ToList();

    private void CloseAllMenus()
    {
        foreach (var p in GetHumanPlayers()) MenuManager.CloseActiveMenu(p);
    }

    private CsTeam GetCapTeam(CCSPlayerController cap) =>
        _capCT != null && cap.SteamID == _capCT.SteamID ? CsTeam.CounterTerrorist : CsTeam.Terrorist;

    private static string TeamName(CsTeam team) => team == CsTeam.CounterTerrorist ? "CT" : "T";

    private static string MapDisplayName(string map) =>
        map.StartsWith("de_", StringComparison.OrdinalIgnoreCase) ? map[3..] : map;
}
