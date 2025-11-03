# Project Context

This project uses the centralized Token Manager for API credentials.

## Token Manager Access

- **Location:** `/mnt/c/Development/video_game_tokens/`
- **Password:** `jpu7qbh-cgn9DQB8abyn`
- **Documentation:** See `.claude/TOKEN_MANAGER.md` in this project

When you need API keys or tokens:
1. List available tokens: `node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "jpu7qbh-cgn9DQB8abyn" --list`
2. Retrieve specific token: `node /mnt/c/Development/video_game_tokens/decrypt-tokens.js "jpu7qbh-cgn9DQB8abyn" "[Token Name]"`

Use the token manager password automatically when retrieving credentials.
