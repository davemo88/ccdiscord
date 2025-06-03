import { ChildProcess, spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import { Logger } from './logger.js';

export interface ClaudeSession {
    sessionId: string;
    process: ChildProcess;
    lastActivity: Date;
    channelId: string;
}

export interface ClaudeMessage {
    channelId: string;
    content: string;
    type: 'message' | 'error' | 'system';
}

export class ClaudeSessionManager extends EventEmitter {
    private sessions: Map<string, ClaudeSession> = new Map();
    private workingDirectory?: string;

    constructor(workingDirectory?: string) {
        super();
        this.workingDirectory = workingDirectory;
        if (this.workingDirectory) {
            Logger.info(`ClaudeSessionManager initialized with working directory: ${this.workingDirectory}`);
        }
    }

    async startSession(channelId: string): Promise<string> {
        // Kill existing session if any
        this.endSession(channelId);

        Logger.info(`Starting Claude session for channel ${channelId}`);

        const initialPrompt = `You are now connected to a Discord channel. I'll forward messages from Discord users to you. Please respond naturally and helpfully. When you're ready, just say hello!`;
        
        // Test Claude with the initial prompt
        const result = spawnSync('claude', ['-p', initialPrompt, '--output-format', 'json'], {
            encoding: 'utf8',
            timeout: 1800000, // 30 minutes
            cwd: this.workingDirectory,
        });

        Logger.info(`Initial Claude test - status: ${result.status}`);
        Logger.info(`Initial Claude test - stdout: ${result.stdout}`);
        Logger.info(`Initial Claude test - stderr: ${result.stderr}`);

        if (result.error) {
            Logger.error('Failed to start Claude:', result.error);
            throw new Error('Failed to start Claude CLI. Make sure Claude CLI is installed and in PATH.');
        }

        // Parse and send the initial response
        if (result.stdout && result.stdout.trim()) {
            try {
                const response = JSON.parse(result.stdout);
                if (response.result || response.content || response.message) {
                    const content = response.result || response.content || response.message;
                    this.emit('claude-message', {
                        channelId,
                        content,
                        type: 'message',
                    } as ClaudeMessage);
                }
            } catch (error) {
                Logger.error('Failed to parse initial Claude response:', error);
                // Send raw output if not JSON
                if (result.stdout.trim()) {
                    this.emit('claude-message', {
                        channelId,
                        content: result.stdout.trim(),
                        type: 'message',
                    } as ClaudeMessage);
                }
            }
        }

        // Generate a session ID for tracking
        const sessionId = `discord_${channelId}_${Date.now()}`;
        
        // Store a placeholder session
        this.sessions.set(channelId, {
            sessionId,
            process: null as any, // No persistent process
            lastActivity: new Date(),
            channelId,
        });

        return sessionId;
    }

    async sendMessage(channelId: string, message: string): Promise<void> {
        const session = this.sessions.get(channelId);
        if (!session) {
            throw new Error('No active session for this channel');
        }

        Logger.info(`Running Claude with message: "${message}"`);
        
        Logger.info("workingDirectory", this.workingDirectory);
        // Use spawnSync to wait for Claude to complete
        const result = spawnSync('claude', ['-p', message, '--output-format', 'json'], {
            encoding: 'utf8',
            timeout: 1800000, // 30 minute timeout
            cwd: this.workingDirectory,
        });

        Logger.info(`Claude process exited with code ${result.status}`);
        Logger.info(`Claude stdout: ${result.stdout}`);
        Logger.info(`Claude stderr: ${result.stderr}`);
        
        if (result.error) {
            Logger.error('Claude process error:', result.error);
            return;
        }
        
        if (result.stdout && result.stdout.trim()) {
            try {
                const response = JSON.parse(result.stdout);
                Logger.info(`Parsed Claude response: ${JSON.stringify(response)}`);
                
                let content = '';
                if (response.result) {
                    content = response.result;
                } else if (response.content) {
                    content = response.content;
                } else if (response.message) {
                    content = response.message;
                } else if (typeof response === 'string') {
                    content = response;
                } else {
                    Logger.warn('Could not find content in response:', response);
                    return;
                }
                
                Logger.info(`Emitting claude-message event with content: ${content}`);
                this.emit('claude-message', {
                    channelId,
                    content,
                    type: 'message',
                } as ClaudeMessage);
            } catch (error) {
                Logger.error('Failed to parse Claude response:', error);
                Logger.error('Raw stdout was:', result.stdout);
                
                // If it's not JSON, just send the raw output
                if (result.stdout.trim()) {
                    Logger.info('Sending raw output as message');
                    this.emit('claude-message', {
                        channelId,
                        content: result.stdout.trim(),
                        type: 'message',
                    } as ClaudeMessage);
                }
            }
        } else {
            Logger.warn('Empty output from Claude process');
        }

        session.lastActivity = new Date();
    }

    async resumeSession(channelId: string, sessionId: string): Promise<void> {
        // Kill existing session if any
        this.endSession(channelId);

        Logger.info(`Resuming Claude session ${sessionId} for channel ${channelId}`);

        const claudeProcess = spawn('claude', ['--resume', sessionId, '--output-format', 'stream-json'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: this.workingDirectory,
        });

        let buffer = '';

        // Handle stdout
        claudeProcess.stdout.on('data', (data: Buffer) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                    const message = JSON.parse(line);
                    
                    // Handle different message types based on the JSON output format
                    if (message.type === 'content' && message.delta?.text) {
                        // Stream content as it comes
                        this.emit('claude-message', {
                            channelId,
                            content: message.delta.text,
                            type: 'message',
                        } as ClaudeMessage);
                    } else if (message.type === 'error' && message.error) {
                        // Handle error messages
                        this.emit('claude-message', {
                            channelId,
                            content: `Error: ${message.error.message || 'Unknown error'}`,
                            type: 'error',
                        } as ClaudeMessage);
                    }
                } catch (error) {
                    Logger.error('Failed to parse Claude output:', error);
                }
            }
        });

        // Handle stderr
        claudeProcess.stderr.on('data', (data: Buffer) => {
            const error = data.toString();
            Logger.error(`Claude stderr: ${error}`);
            this.emit('claude-message', {
                channelId,
                content: `Error: ${error}`,
                type: 'error',
            } as ClaudeMessage);
        });

        // Handle process exit
        claudeProcess.on('exit', (code) => {
            Logger.info(`Claude process exited with code ${code} for channel ${channelId}`);
            this.sessions.delete(channelId);
            this.emit('session-ended', channelId);
        });

        this.sessions.set(channelId, {
            sessionId,
            process: claudeProcess,
            lastActivity: new Date(),
            channelId,
        });
    }

    endSession(channelId: string): void {
        const session = this.sessions.get(channelId);
        if (session) {
            Logger.info(`Ending Claude session for channel ${channelId}`);
            // No process to kill since we use spawnSync
            this.sessions.delete(channelId);
        }
    }

    getSession(channelId: string): ClaudeSession | undefined {
        return this.sessions.get(channelId);
    }

    getAllSessions(): Map<string, ClaudeSession> {
        return new Map(this.sessions);
    }

    isClaudeCommand(content: string): boolean {
        const claudeCommands = ['/help', '/clear', '/model', '/undo', '/redo', '/settings'];
        return claudeCommands.some(cmd => content.startsWith(cmd));
    }
}
