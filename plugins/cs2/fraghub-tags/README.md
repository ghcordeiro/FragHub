# FragHub Tags Plugin (CS2)

**Version:** 1.0.0  
**Author:** FragHub  
**Description:** Display player level tags [1-10] or [ADMIN] in CS2 based on FragHub backend ratings.

## Features

- Fetches player level from FragHub API on join
- Displays level tags in-game: `[1]` through `[10]` for regular players, `[ADMIN]` for administrators
- 5-minute caching to reduce API calls
- 3-second HTTP timeout for API requests
- Graceful fallback: if API unavailable, no tag is displayed (silent)
- Logs all operations for debugging

## Requirements

- Counter-Strike Sharp (CSS) API v1.0.0+
- .NET 8.0 runtime
- Network access to FragHub API (http://localhost:3000 or configured URL)

## Installation

1. **Copy the compiled DLL:**
   ```bash
   cp bin/Release/net8.0/fraghub-tags.dll /path/to/game/csgo/addons/counterstrikesharp/plugins/fraghub-tags/
   ```

2. **Create config file:**
   ```bash
   mkdir -p /path/to/game/csgo/addons/counterstrikesharp/plugins/fraghub-tags
   cat > fraghub_tags.cfg << 'EOF'
   {
     "api_url": "http://localhost:3000"
   }
   EOF
   ```

3. **Restart game server:**
   ```bash
   # Game server will load the plugin automatically
   ```

## Configuration

Edit `fraghub_tags.cfg` (JSON format):

```json
{
  "api_url": "http://localhost:3000"
}
```

- `api_url`: Base URL of FragHub API (defaults to `http://localhost:3000`)

## Compilation

To recompile the plugin:

```bash
cd /path/to/plugins/cs2/fraghub-tags
dotnet build -c Release
```

Output DLL: `bin/Release/net8.0/fraghub-tags.dll`

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
- Cache entry expires (5 minutes)

## Error Handling

- **API Timeout (3s):** Logged as warning, no tag applied
- **API Error (4xx/5xx):** Logged as warning, no tag applied
- **Network Error:** Logged as warning, no tag applied
- **Invalid Config:** Plugin logs error and disables gracefully

## Logging

All operations logged to game server console:
- `[FragHub Tags] Plugin loaded`
- `[FragHub Tags] Cache hit for {steamid}: {tag}`
- `[FragHub Tags] Fetched level {level} for {steamid}`
- `[FragHub Tags] Failed to fetch level: {reason}`

## Testing

To test the plugin:

1. Ensure FragHub API is running and `/api/player/{steamid}` responds correctly
2. Connect a player to the server
3. Check server console for tag fetch messages
4. Verify tag appears in player list (if CSS API supports it)

## Troubleshooting

**Plugin not loading:**
- Check `fraghub_tags.cfg` exists and is valid JSON
- Verify DLL path is correct
- Restart game server

**Tags not appearing:**
- Verify API URL in config is correct
- Check network connectivity to API
- Enable `DEBUG` logging in plugin (if available)

**Cache not clearing:**
- Verify player disconnect handler is firing
- Check server logs for errors

## License

Part of the FragHub project. See LICENSE file in project root.
