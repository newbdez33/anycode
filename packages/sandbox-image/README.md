# AnyCode Sandbox Image

Docker image for running Claude Code in isolated containers.

## Features

- Ubuntu 22.04 base
- Node.js 20 LTS
- Claude Code CLI pre-installed
- Non-root user (developer) for security
- Git pre-configured
- Common development tools included

## Build

```bash
./build.sh
# or
./build.sh v1.0.0
```

## Usage

```bash
# Interactive shell
docker run -it --rm anycode/sandbox

# With project mount
docker run -it --rm \
  -v /path/to/project:/workspace \
  -e ANTHROPIC_API_KEY=your_key \
  anycode/sandbox

# Run Claude Code
docker run -it --rm \
  -v /path/to/project:/workspace \
  -e ANTHROPIC_API_KEY=your_key \
  anycode/sandbox \
  -c "claude 'help me with this code'"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key (injected by AnyCode) |
| `SANDBOX_ID` | Unique sandbox identifier |
| `PROJECT_ID` | Project identifier |
| `GIT_BRANCH` | Git branch to checkout |

## Security

- Runs as non-root user `developer`
- Limited capabilities when run by AnyCode
- No persistent storage for credentials
