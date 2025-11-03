# Token Manager Access

This project has access to the centralized Token Manager.

## Quick Access

**Location:** `/mnt/c/Development/video_game_tokens/`
**Password:** `jpu7qbh-cgn9DQB8abyn`

## Commands

### List all available tokens:
```bash
node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "jpu7qbh-cgn9DQB8abyn" --list
```

### Get specific token:
```bash
node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "jpu7qbh-cgn9DQB8abyn" "[Token Name]"
```

### Get token as JSON (for paired credentials):
```bash
node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "jpu7qbh-cgn9DQB8abyn" "[Token Name]" --json
```

## For Node.js Projects

You can use the helper module:

```javascript
const { execSync } = require('child_process');

function getToken(tokenName) {
  const password = 'jpu7qbh-cgn9DQB8abyn';
  const command = `node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "${password}" "${tokenName}"`;
  return execSync(command, { encoding: 'utf-8' }).trim();
}

// Usage
const githubToken = getToken('Git Hub');
```

## Documentation

Full documentation: `/mnt/c/Development/video_game_tokens/resources/CLAUDE_ACTION_KIT.md`
