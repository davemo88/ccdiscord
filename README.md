# Claude Code Discord Bot

[![discord.js](https://img.shields.io/badge/discord.js-v14-blue)](https://discord.js.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

**Claude Code Discord Bot** - A Discord bot that proxies Claude Code sessions to Discord channels, allowing multiple users to interact with Claude AI through Discord.

## Introduction

This bot enables Discord users to interact with Claude Code (claude.ai/code) directly within Discord channels. It manages Claude CLI sessions, forwards messages between Discord and Claude, and supports multiple concurrent sessions across different bot instances.

## Features

### Claude Integration:

-   **Claude Code Proxy**: Forward Discord messages to Claude CLI and stream responses back.
-   **Session Management**: Start, stop, and resume Claude sessions within Discord channels.
-   **Multi-Instance Support**: Run multiple bot instances with separate session namespaces.
-   **Session Persistence**: Resume sessions using session IDs after bot restarts.
-   **Command Forwarding**: Claude CLI commands like `/help` and `/model` work seamlessly.

### Core Bot Features:

-   **Slash Commands**: Modern Discord slash command structure.
-   **Rate Limiting**: Built-in cooldowns to prevent spam.
-   **Multi-Language Support**: Internationalization using Linguini.
-   **Welcome Messages**: Automated messages when joining servers.
-   **Server Statistics**: Shows server count in bot status.

### Developer Friendly:

-   **TypeScript**: Fully typed codebase for better development experience.
-   **discord.js v14**: Uses the latest Discord.js framework.
-   **ESM Modules**: Modern JavaScript module system.
-   **Testing**: Vitest test suite with coverage reports.
-   **Linting & Formatting**: ESLint and Prettier configured.
-   **Docker Support**: Containerization ready.
-   **PM2 Support**: Process management for production.

### Scalability:

-   **Sharding**: Automatic sharding for 2500+ server deployments.
-   **Clustering**: Multi-machine deployment support.
-   **HTTP API**: Inter-process communication for distributed setups.

## Commands

### Claude Commands

#### `/claude-start`
Starts a new Claude Code session in the current channel. The bot will create a new Claude CLI process and begin forwarding messages.

#### `/claude-stop`
Stops the active Claude session in the current channel. The session can be resumed later using its session ID.

#### `/claude-resume <session_id>`
Resumes a previously stopped Claude session. Useful after bot restarts or to continue conversations in different channels.

### Utility Commands

#### `/help`
Get help on different areas of the bot or contact support. Includes categories for different topics.

#### `/info`
Get information about the bot, including version, uptime, and useful links.

#### `/test`
A simple test command to verify the bot is working correctly.

#### `/dev`
Developer-only command showing technical information about the bot instance.

### Context Menu Commands

-   **View Date Sent**: Right-click a message to see when it was sent.
-   **View Date Joined**: Right-click a user to see when they joined the server.

## Setup

### Prerequisites

-   Node.js 18.x or higher
-   npm or yarn
-   Claude CLI installed and configured (for Claude features)
-   Discord Bot Token

### Installation

1. **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ccdiscord
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Configure the bot:**
    - Navigate to the `config` folder
    - Copy all `.example.json` files and remove the `.example` suffix:
        - `config.example.json` → `config.json`
        - `bot-sites.example.json` → `bot-sites.json`
        - `debug.example.json` → `debug.json`

4. **Set up Discord Bot:**
    - Create a new application in the [Discord Developer Portal](https://discord.com/developers/applications/)
    - Create a bot and copy the token
    - Enable the following intents:
        - Server Members Intent
        - Message Content Intent
    - Edit `config/config.json`:
        - Set `client.id` to your bot's application ID
        - Set `client.token` to your bot token

5. **Register slash commands:**
    ```bash
    npm run commands:register
    ```

### Multi-Instance Setup (Optional)

To run multiple bot instances with different identities:

1. Create additional config files:
    - `config-bot1.json` for Bot1 (port 3001)
    - `config-bot2.json` for Bot2 (port 3002)

2. Configure each instance with unique:
    - Bot tokens
    - API ports
    - Bot identity (name, colors)
    - Session prefixes

3. Start specific instances:
    ```bash
    npm run start:bot1  # Uses config-bot1.json
    npm run start:bot2  # Uses config-bot2.json
    ```

## Running the Bot

### Development Mode

```bash
npm start              # Single instance with config.json
npm run start:bot1     # Bot1 instance with config-bot1.json
npm run start:bot2     # Bot2 instance with config-bot2.json
```

### Production Mode

```bash
npm run start:manager  # Sharding manager for scaling
npm run start:pm2      # PM2 process manager
```

### Other Scripts

```bash
# Development
npm run build          # Compile TypeScript
npm run dev            # Watch mode (if configured)

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Check Prettier formatting
npm run format:fix     # Auto-format code

# Testing
npm test               # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Discord Commands
npm run commands:view      # View registered commands
npm run commands:register  # Register commands
npm run commands:rename    # Rename commands
npm run commands:delete    # Delete specific commands
npm run commands:clear     # Clear all commands
```

## Architecture

### Core Components

-   **`start-bot.ts`**: Single bot instance entry point
-   **`start-manager.ts`**: Sharding manager for multi-process scaling
-   **`ClaudeSessionManager`**: Manages Claude CLI processes and message routing
-   **Event Handlers**: Modular handlers for Discord events
-   **Command System**: Slash commands with metadata and permissions

### Key Features

-   **Session Management**: In-memory storage of Claude sessions
-   **Message Routing**: Bi-directional message flow between Discord and Claude
-   **Multi-Instance Support**: Different bot identities with isolated sessions
-   **Error Handling**: Graceful error recovery and session cleanup

## Configuration

### Main Configuration (`config.json`)

```json
{
    "client": {
        "id": "YOUR_BOT_ID",
        "token": "YOUR_BOT_TOKEN"
    },
    "api": {
        "port": 3000
    }
}
```

### Environment Variables

-   `BOT_CONFIG`: Specify which config file to use (e.g., `bot1`, `bot2`)
-   `NODE_ENV`: Set to `production` for production deployments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/your-repo/issues) page.
