import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import { Command, CommandDeferType } from '../index.js';
import { EventData } from '../../models/internal-models.js';
import { ClaudeSessionManager } from '../../services/index.js';
import { InteractionUtils } from '../../utils/index.js';

export class ClaudeResumeCommand implements Command {
    public names = ['claude-resume'];
    private sessionManager: ClaudeSessionManager;

    constructor(sessionManager: ClaudeSessionManager) {
        this.sessionManager = sessionManager;
    }

    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const sessionId = intr.options.getString('session_id', true);

        try {
            // Check if session already exists
            const existingSession = this.sessionManager.getSession(intr.channelId);
            if (existingSession) {
                await InteractionUtils.send(
                    intr,
                    `⚠️ A Claude session is already active in this channel. Use \`/claude-stop\` to end it first.`
                );
                return;
            }

            // Resume session
            await intr.deferReply();
            await this.sessionManager.resumeSession(intr.channelId, sessionId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('📎 Claude Session Resumed')
                .setDescription(
                    'Previous Claude session has been resumed. Continue your conversation!'
                )
                .addFields({
                    name: 'Session ID',
                    value: `\`${sessionId}\``,
                    inline: true,
                })
                .setFooter({ text: 'Session will end if the bot restarts' })
                .setTimestamp();

            await InteractionUtils.editReply(intr, { embeds: [embed] });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error occurred';
            await InteractionUtils.editReply(
                intr,
                `❌ Failed to resume Claude session: ${errorMessage}`
            );
        }
    }

}