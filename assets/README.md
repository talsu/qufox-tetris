# Asset Sources

This project now includes Kenney assets under CC0.

- UI Pack: https://www.kenney.nl/assets/ui-pack
- Impact Sounds: https://www.kenney.nl/assets/impact-sounds
- License: https://creativecommons.org/publicdomain/zero/1.0/

## Added Directories

- `assets/image/ui-pack/`
- `assets/sound/impact-sounds/`

## Safari / iOS Audio Fallback

- Selected Impact Sounds used by gameplay now include `.mp3` fallback files next to `.ogg` in `assets/sound/impact-sounds/Audio/`.
- Conversion was performed locally with `ffmpeg`.

## Runtime Setup

- Preload entry: `src/tetris/scenes/menuScene.ts`
- Shared preload helper: `src/tetris/ui/kenneyAssets.ts`
- Shared SFX playback hooks: `src/tetris/scenes/basePlayScene.ts`

## Production Permission Note

When deploying behind Nginx, ensure new asset files are world-readable and directories are traversable.

- Directories: `755`
- Files: `644`

Repository helper:

```bash
bash scripts/fix-static-permissions.sh /var/www/qufox-tetris
```
