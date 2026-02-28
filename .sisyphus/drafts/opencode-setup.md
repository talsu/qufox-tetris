# Draft: Troubleshooting Gemini model in OpenCode

## Requirements (confirmed)
- User is experiencing "Gemini model not found" error in OpenCode CLI.
- User wants to know what settings are required.

## Technical Context
- Current Assistant: `gemini-3-flash-preview`
- Environment: `darwin` (macOS)
- Project: `qufox-tetris` (Phaser 3/TypeScript)

## Research Needed
- Check if `opencode` is installed in the current shell.
- Check current environment variables for API keys.
- Check if any configuration files exist (~/.config/opencode/ or similar).

## Open Questions
- What is the exact error message when running `opencode`?
- Has the user already obtained an API key from Google AI Studio?
