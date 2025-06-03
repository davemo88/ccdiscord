import { Message, TextChannel } from 'discord.js';

import { EventHandler, TriggerHandler } from './index.js';
import { ClaudeSessionManager } from '../services/index.js';

export class MessageHandler implements EventHandler {
    constructor(
        private triggerHandler: TriggerHandler,
        private claudeSessionManager?: ClaudeSessionManager
    ) {}

    public async process(msg: Message): Promise<void> {
        // Don't respond to system messages or self
        if (msg.system || msg.author.id === msg.client.user?.id) {
            console.log(`Message ignored - System: ${msg.system}, Self: ${msg.author.id === msg.client.user?.id}`);
            return;
        }

        // Check for active Claude session
        if (this.claudeSessionManager) {
            const session = this.claudeSessionManager.getSession(msg.channel.id);
            console.log(`Claude session check - Channel: ${msg.channel.id}, Active: ${!!session}, Author bot: ${msg.author.bot}`);
            
            if (session && !msg.author.bot) {
                try {
                    console.log(`Forwarding message to Claude session: "${msg.content}"`);
                    // Show typing indicator
                    if (msg.channel instanceof TextChannel) {
                        await msg.channel.sendTyping();
                    }
                    
                    // Forward to Claude
                    await this.claudeSessionManager.sendMessage(msg.channel.id, msg.content);
                    console.log('Message forwarded to Claude successfully');
                    return; // Don't process triggers if Claude is active
                } catch (error) {
                    console.error('Error forwarding message to Claude:', error);
                }
            }
        }

        // Process trigger if no Claude session
        console.log('Processing message through trigger handler');
        await this.triggerHandler.process(msg);
    }
}
