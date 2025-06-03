import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import { Command, CommandDeferType } from '../index.js';
import { EventData } from '../../models/internal-models.js';
import { ClaudeSessionManager } from '../../services/index.js';
import { InteractionUtils } from '../../utils/index.js';

export class ClaudeStartCommand implements Command {
    public names = ['claude-start'];
    private sessionManager: ClaudeSessionManager;
    private workingDirectory?: string;

    constructor(sessionManager: ClaudeSessionManager, workingDirectory?: string) {
        this.sessionManager = sessionManager;
        this.workingDirectory = workingDirectory;
    }

    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        try {
            // Check if session already exists
            const existingSession = this.sessionManager.getSession(intr.channelId);
            if (existingSession) {
                await InteractionUtils.editReply(
                    intr,
                    `⚠️ A Claude session is already active in this channel. Use \`/claude-stop\` to end it first.`
                );
                return;
            }

            // Start new session
            const sessionId = await this.sessionManager.startSession(intr.channelId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('🟢 Claude Session Started')
                .setDescription(
                    'Claude is now active in this channel. Type messages to chat with Claude!'
                )
                .addFields(
                    {
                        name: 'Session ID',
                        value: `\`${sessionId}\``,
                        inline: true,
                    },
                    {
                        name: 'Claude Commands',
                        value: '`/help` - Show Claude help\n`/model` - Change model\n`/clear` - Clear context',
                        inline: true,
                    }
                );
            
            if (this.workingDirectory) {
                embed.addFields({
                    name: 'Working Directory',
                    value: `\`${this.workingDirectory}\``,
                    inline: false,
                });
            }
            
            embed.setFooter({ text: 'Session will end if the bot restarts' })
                .setTimestamp();

            await InteractionUtils.editReply(intr, { embeds: [embed] });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error occurred';
            await InteractionUtils.editReply(
                intr,
                `❌ Failed to start Claude session: ${errorMessage}`
            );
        }
    }

}