# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run build          # Compile TypeScript to JavaScript
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run format         # Check Prettier formatting
npm run format:fix     # Auto-format with Prettier
npm test               # Run tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

### Running the Bot
```bash
npm start              # Start bot in single instance mode (config.json)
npm run start:bot1     # Start Bot1 instance (config-bot1.json)
npm run start:bot2     # Start Bot2 instance (config-bot2.json)
npm run start:manager  # Start bot with shard manager (for scaling)
npm run start:pm2      # Start bot with PM2 process manager
```

### Discord Command Management
```bash
npm run commands:view      # View registered commands
npm run commands:register  # Register slash commands with Discord
npm run commands:rename    # Rename commands
npm run commands:delete    # Delete specific commands
npm run commands:clear     # Clear all commands
```

## Architecture Overview

### Entry Points
- **start-bot.ts**: Single bot instance entry point. Initializes Discord client, registers all handlers, and manages command registration.
- **start-manager.ts**: Sharding manager for scaling across multiple processes/machines. Handles shard orchestration and provides HTTP API.

### Core Systems

**Claude Proxy System**: New feature for proxying Claude Code sessions to Discord:
- ClaudeSessionManager: Manages Claude CLI processes and session state in memory
- Claude Commands: `/claude-start`, `/claude-stop`, `/claude-resume <session_id>`
- Message forwarding: Discord messages → Claude CLI, Claude responses → Discord
- Multi-instance support: Different bot identities with separate session namespaces

**Command System**: Commands in `src/commands/`:
- Chat commands (slash commands): help, info, test, dev, claude-start, claude-stop, claude-resume
- Message context commands: "View Date Sent"
- User context commands: "View Date Joined"

**Event Handling**: All event handlers in `src/events/`:
- CommandHandler: Processes slash commands with cooldowns and permissions
- MessageHandler: Forwards messages to active Claude sessions, then processes triggers
- ButtonHandler, ReactionHandler, TriggerHandler: Handle interactions
- GuildJoinHandler/LeaveHandler: Server join/leave events

**Models**:
- Bot class: Main Discord client wrapper with event registration
- Manager class: Shard manager with clustering support
- Api class: Express server for inter-process communication

**Services**: Utility services in `src/services/`:
- ClaudeSessionManager: Manages Claude CLI processes and bi-directional message flow
- Logger: Pino-based logging with different levels
- Lang: Internationalization using Linguini
- JobService: Cron-based scheduled tasks
- MasterApiService: Communication with cluster master

### Configuration

**Multi-Instance Configuration**: Bot loads config based on BOT_CONFIG environment variable:
- config.json: Default configuration
- config-bot1.json: Bot1 instance (port 3001, bot identity, session prefix)
- config-bot2.json: Bot2 instance (port 3002, different colors/names)

### Claude Integration
- Sessions stored in memory (no persistence across restarts)
- Users can resume sessions manually using session IDs after bot restarts
- Claude commands like `/help`, `/model` are forwarded directly
- Supports multiple concurrent sessions per bot instance

### Testing
Tests use Vitest and are located in `tests/` directory. Run a single test file:
```bash
npx vitest tests/utils/string-utils.test.ts
```

### Code Style
- TypeScript with ES modules
- 4 spaces indentation, single quotes, 100 char line width
- Alphabetical imports with grouping
- No semicolons (Prettier configured)