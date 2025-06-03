import { REST } from '@discordjs/rest';
import { Options, Partials } from 'discord.js';
import { createRequire } from 'node:module';

import { Button } from './buttons/index.js';
import {
    ClaudeResumeCommand,
    ClaudeStartCommand,
    ClaudeStopCommand,
    DevCommand,
    HelpCommand,
    InfoCommand,
    TestCommand,
} from './commands/chat/index.js';
import {
    ChatCommandMetadata,
    Command,
    MessageCommandMetadata,
    UserCommandMetadata,
} from './commands/index.js';
import { ViewDateSent } from './commands/message/index.js';
import { ViewDateJoined } from './commands/user/index.js';
import {
    ButtonHandler,
    CommandHandler,
    GuildJoinHandler,
    GuildLeaveHandler,
    MessageHandler,
    ReactionHandler,
    TriggerHandler,
} from './events/index.js';
import { CustomClient } from './extensions/index.js';
import { Job } from './jobs/index.js';
import { Bot } from './models/bot.js';
import { Reaction } from './reactions/index.js';
import {
    ClaudeSessionManager,
    CommandRegistrationService,
    EventDataService,
    JobService,
    Logger,
} from './services/index.js';
import { Trigger } from './triggers/index.js';

const require = createRequire(import.meta.url);

// Load config based on BOT_CONFIG environment variable
const configName = process.env.BOT_CONFIG || 'config';
let Config = require(`../config/${configName}.json`);
let Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    // Get working directory from command line args
    Logger.info(`${process.argv}`)
    const workingDir = process.argv[2]; // After node script.js [command] [workingDir]
    Logger.info(`Claude working directory set to: ${workingDir}`);

    // Services
    let eventDataService = new EventDataService();
    let claudeSessionManager = new ClaudeSessionManager(workingDir);

    // Client
    let client = new CustomClient({
        intents: Config.client.intents,
        partials: (Config.client.partials as string[]).map(partial => Partials[partial]),
        makeCache: Options.cacheWithLimits({
            // Keep default caching behavior
            ...Options.DefaultMakeCacheSettings,
            // Override specific options from config
            ...Config.client.caches,
        }),
    });

    // Commands
    let commands: Command[] = [
        // Chat Commands
        new DevCommand(),
        new HelpCommand(),
        new InfoCommand(),
        new TestCommand(),

        // Claude Commands
        new ClaudeStartCommand(claudeSessionManager, workingDir),
        new ClaudeStopCommand(claudeSessionManager),
        new ClaudeResumeCommand(claudeSessionManager),

        // Message Context Commands
        new ViewDateSent(),

        // User Context Commands
        new ViewDateJoined(),

        // TODO: Add new commands here
    ];

    // Buttons
    let buttons: Button[] = [
        // TODO: Add new buttons here
    ];

    // Reactions
    let reactions: Reaction[] = [
        // TODO: Add new reactions here
    ];

    // Triggers
    let triggers: Trigger[] = [
        // TODO: Add new triggers here
    ];

    // Event handlers
    let guildJoinHandler = new GuildJoinHandler(eventDataService);
    let guildLeaveHandler = new GuildLeaveHandler();
    let commandHandler = new CommandHandler(commands, eventDataService);
    let buttonHandler = new ButtonHandler(buttons, eventDataService);
    let triggerHandler = new TriggerHandler(triggers, eventDataService);
    let messageHandler = new MessageHandler(triggerHandler, claudeSessionManager);
    let reactionHandler = new ReactionHandler(reactions, eventDataService);

    // Jobs
    let jobs: Job[] = [
        // TODO: Add new jobs here
    ];

    // Bot
    let bot = new Bot(
        Config.client.token,
        client,
        guildJoinHandler,
        guildLeaveHandler,
        messageHandler,
        commandHandler,
        buttonHandler,
        reactionHandler,
        new JobService(jobs)
    );

    // Register
    if (process.argv[2] == 'commands') {
        try {
            let rest = new REST({ version: '10' }).setToken(Config.client.token);
            let commandRegistrationService = new CommandRegistrationService(rest);
            let localCmds = [
                ...Object.values(ChatCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
                ...Object.values(MessageCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
                ...Object.values(UserCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
            ];
            await commandRegistrationService.process(localCmds, process.argv);
        } catch (error) {
            Logger.error(Logs.error.commandAction, error);
        }
        // Wait for any final logs to be written.
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit();
    }

    // Set up Claude message listener
    claudeSessionManager.on('claude-message', async (message) => {
        Logger.info(`Received claude-message event: ${JSON.stringify(message)}`);
        try {
            const channel = await client.channels.fetch(message.channelId);
            Logger.info(`Fetched channel: ${channel?.id}, isTextBased: ${channel?.isTextBased()}`);
            
            if (channel?.isTextBased() && 'send' in channel) {
                // Split long messages if needed
                const maxLength = 2000;
                const content = message.content;
                
                Logger.info(`Sending message to Discord channel: "${content}"`);
                
                if (content.length <= maxLength) {
                    await channel.send(content);
                    Logger.info('Message sent successfully');
                } else {
                    // Split into chunks
                    const chunks = content.match(/.{1,2000}/g) || [];
                    for (const chunk of chunks) {
                        await channel.send(chunk);
                    }
                    Logger.info(`Message sent in ${chunks.length} chunks`);
                }
            } else {
                Logger.warn('Channel is not text-based or cannot send messages');
            }
        } catch (error) {
            Logger.error('Failed to send Claude message to Discord:', error);
        }
    });

    await bot.start();
}

process.on('unhandledRejection', (reason, _promise) => {
    Logger.error(Logs.error.unhandledRejection, reason);
});

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});
