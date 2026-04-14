# FragHub Tags Plugin (CS:GO)

**Version:** 1.0.0  
**Author:** FragHub  
**Description:** Display player level tags [1-10] or [ADMIN] in CS:GO based on FragHub backend ratings.

## Features

- Fetches player level from FragHub API on join
- Displays level tags in-game: `[1]` through `[10]` for regular players, `[ADMIN]` for administrators
- 5-minute caching to reduce API calls
- 3-second HTTP timeout for API requests
- Graceful fallback: if API unavailable, no tag is displayed (silent)
- Logs all operations for debugging

## Requirements

- SourceMod 1.11+
- CS:GO Game Server
- SteamWorks extension (for HTTP calls, optional but recommended)
- Network access to FragHub API (http://localhost:3000 or configured URL)

## Installation

1. **Copy the compiled SMX plugin:**
   ```bash
   cp fraghub_tags.smx /path/to/game/cstrike/addons/sourcemod/plugins/
   ```

2. **Copy or create config file:**
   ```bash
   mkdir -p /path/to/game/cstrike/addons/sourcemod/cfg
   cp fraghub_tags.cfg /path/to/game/cstrike/addons/sourcemod/cfg/
   ```

3. **Restart game server or load manually:**
   ```bash
   sm plugins load fraghub_tags
   ```

## Configuration

Edit `cstrike/addons/sourcemod/cfg/fraghub_tags.cfg`:

```
api_url=http://localhost:3000
```

- `api_url`: Base URL of FragHub API (defaults to `http://localhost:3000`)

## Compilation

To recompile the plugin (requires SourcePawn compiler):

```bash
spcomp fraghub_tags.sp -o fraghub_tags.smx
```

Output SMX: `fraghub_tags.smx`

### Compiler Setup

1. Download SourcePawn compiler: https://github.com/alliedmodders/sourcepawn/releases
2. Add to PATH or use full path:
   ```bash
   /path/to/spcomp fraghub_tags.sp -o fraghub_tags.smx
   ```

## API Integration

The plugin calls `GET /api/player/{steamid}` expecting response:

```json
{
  "level": 5,
  "role": "player"  // or "admin"
}
```

If `role` is "admin", tag displayed is `[ADMIN]`.  
Otherwise, tag is `[{level}]` where level is clamped to 1-10.

## Caching

Player levels are cached for 5 minutes to reduce API load. Cache is cleared on:
- Player disconnect
- Map start
- Cache entry expires (5 minutes)

## Error Handling

- **API Timeout (3s):** Logged as warning, no tag applied
- **API Error (4xx/5xx):** Logged as warning, no tag applied
- **Network Error:** Logged as warning, no tag applied
- **Invalid Config:** Plugin logs error, uses default API URL

## Logging

All operations logged to game server console:
- `[FragHub Tags] Plugin loaded`
- `[FragHub Tags] Config loaded: api_url=...`
- `[FragHub Tags] Cache hit for {steamid}: {tag}`
- `[FragHub Tags] Applied tag {tag} to client {id}`
- `[FragHub Tags] Failed to fetch level: {reason}`

## Testing

To test the plugin:

1. Ensure FragHub API is running and `/api/player/{steamid}` responds correctly
2. Connect a player to the server
3. Check server console for tag fetch messages
4. Verify tag appears in player list (via clan tag display)

## Troubleshooting

**Plugin not loading:**
- Check `fraghub_tags.smx` is in `cstrike/addons/sourcemod/plugins/`
- Verify SourceMod is working: `sm plugins list`
- Check for compilation errors in SMX file

**Tags not appearing:**
- Verify API URL in config is correct
- Check network connectivity to API from game server
- Verify API response format is correct

**Cache not clearing:**
- Verify player disconnect event is firing
- Check server logs for errors
- Manual clear on map change (automatic)

## Dependencies

- **Required:** SourceMod 1.11+, Counter-Strike: Global Offensive
- **Optional:** SteamWorks extension (for HTTP requests, if using networked API)

## License

Part of the FragHub project. See LICENSE file in project root.
