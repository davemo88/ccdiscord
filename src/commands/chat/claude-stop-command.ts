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

export class ClaudeStopCommand implements Command {
    public names = ['claude-stop'];
    private sessionManager: ClaudeSessionManager;

    constructor(sessionManager: ClaudeSessionManager) {
        this.sessionManager = sessionManager;
    }

    public deferType = CommandDeferType.NONE;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const session = this.sessionManager.getSession(intr.channelId);
        
        if (!session) {
            await InteractionUtils.send(
                intr,
                '❌ No active Claude session in this channel.'
            );
            return;
        }

        this.sessionManager.endSession(intr.channelId);

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('🔴 Claude Session Ended')
            .setDescription('The Claude session has been terminated.')
            .addFields({
                name: 'Previous Session ID',
                value: `\`${session.sessionId}\``,
                inline: true,
            })
            .setTimestamp();

        await InteractionUtils.send(intr, { embeds: [embed] });
    }

}