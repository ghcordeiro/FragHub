/**
 * ADMIN-03: RCON command allowlist configuration
 * Static, non-user-modifiable configuration for safe command execution.
 * All patterns are tested before command execution.
 * Blocklist is checked first (DENY), then allowlist (ALLOW).
 */

export const RCON_ALLOWLIST = {
  blocklist: [
    /rcon_password/i, // Password change (absolute blocker)
    /sv_password/i, // Server password change
    /^quit$/i, // Server shutdown (use systemd instead)
    /^restart$/i, // Server restart (use systemd instead)
    /^exit$/i, // Server exit
    /;/, // Command injection: semicolon separator
    /&&/, // Command injection: AND operator
    /\|\|/, // Command injection: OR operator
    /\|/, // Command injection: pipe
    /`/, // Command injection: backticks
    /\$\(/, // Command injection: command substitution
  ],

  // Allowed patterns for CS2/CS:GO game commands
  game: [
    /^status$/i, // Game status
    /^mp_roundtime\s+\d+$/i, // Game cvars
    /^mp_freezetime\s+\d+$/i,
    /^mp_maxrounds\s+\d+$/i,
    /^mp_buytime\s+\d+$/i,
    /^sv_cheats\s+[01]$/i,
    /^say\s+.+$/i, // Admin commands
    /^say_team\s+.+$/i,
    /^ban\s+.+$/i,
    /^kick\s+.+$/i,
    /^unban\s+.+$/i,
    /^banid\s+\d+\s+.+$/i,
    /^removeid\s+\d+$/i,
    /^exec\s+[a-zA-Z0-9_]+\.cfg$/i, // Config execution (limited to .cfg)
    /^map\s+[a-zA-Z0-9_]+$/i, // Map change
    /^changelevel\s+[a-zA-Z0-9_]+$/i,
    /^mp_restartgame\s+[01]$/i,
  ],
};

/**
 * Validate RCON command against blocklist and allowlist.
 * Returns: true if allowed, false if blocked.
 */
export function validateRconCommand(command: string): boolean {
  // Check blocklist (DENY trumps everything)
  for (const pattern of RCON_ALLOWLIST.blocklist) {
    if (pattern.test(command)) {
      return false;
    }
  }

  // Check allowlist (ALLOW only if matches)
  for (const pattern of RCON_ALLOWLIST.game) {
    if (pattern.test(command)) {
      return true;
    }
  }

  return false;
}
