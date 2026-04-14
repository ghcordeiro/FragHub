/**
 * ADMIN-04: Plugin configuration allowlist
 * Maps plugin slugs to their allowed file paths.
 * Static, non-user-modifiable configuration.
 * All file operations must be validated against this allowlist.
 */

export const PLUGIN_CONFIG_PATHS: Record<string, string> = {
  // CS2 plugins
  matchzy: '/var/lib/cs2server/csgo/cfg/matchzy.cfg',
  'cs2-simpleadmin': '/var/lib/cs2server/csgo/cfg/simple_admin.cfg',

  // CS:GO plugins
  get5: '/var/lib/csgoserver/cstrike/cfg/get5.cfg',
  sourcebans: '/var/lib/csgoserver/cstrike/cfg/sourcebans.cfg',
  rankme: '/var/lib/csgoserver/cstrike/cfg/rankme.cfg',

  // Add more as needed
};

/**
 * List of available plugins per server
 */
export const SERVER_PLUGINS: Record<string, string[]> = {
  cs2: ['matchzy', 'cs2-simpleadmin'],
  csgo: ['get5', 'sourcebans', 'rankme'],
};
