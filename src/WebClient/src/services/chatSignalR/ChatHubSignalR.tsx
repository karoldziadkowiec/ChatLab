import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import ChatHubURL from '../../config/ChatHubSignalRConfig';
import Message from '../../models/interfaces/Message';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import AccountService from '../api/AccountService';

type ChatHubSignalROptions = {
    enableLogging?: boolean;
};

class ChatHubSignalR {
    private connection: HubConnection | null = null;
    private chatId: number | null = null;
    private onMessageReceived: (message: Message) => void;
    private readonly reconnectDelays = [0, 500, 1000, 2000, 5000, 8000];
    private readonly serverTimeoutMs = 30000;
    private readonly enableLogging: boolean;

    constructor(onMessageReceived: (message: Message) => void, options?: ChatHubSignalROptions) {
        this.onMessageReceived = onMessageReceived;
        this.enableLogging = options?.enableLogging ?? true;
    }

    public async startConnection(chatId: number, userId: string): Promise<void> {
        this.chatId = chatId;
        this.connection = new HubConnectionBuilder()
            .withUrl(ChatHubURL, {
                accessTokenFactory: async () => (await AccountService.getToken()) ?? ''
            })
            .withAutomaticReconnect(this.reconnectDelays)
            .configureLogging(this.enableLogging ? LogLevel.Information : LogLevel.None)
            .build();

        this.connection.serverTimeoutInMilliseconds = this.serverTimeoutMs;

        try {
            await this.connection.start();
            if (this.enableLogging) console.log("Joined the chat.");
            await this.connection.invoke("JoinChat", chatId, userId);
            this.connection.on("ReceiveMessage", (message: Message) => {
                try { this.onMessageReceived(message); } catch (e) { console.error('ReceiveMessage handler error', e); }
            });

            this.connection.onreconnected(() => {
                if (this.chatId != null) {
                    this.connection?.invoke("JoinChat", this.chatId, userId).catch(e => console.error('Rejoin failed', e));
                }
            });
            this.connection.onreconnecting(err => {
                console.warn('SignalR reconnecting...', err?.message);
            });
            this.connection.onclose(err => {
                if (err) console.warn('SignalR connection closed:', err);
            });
        } 
        catch (error) {
            console.error('Failed to connect to SignalR hub:', error);
            throw new Error('Failed to connect to chat.');
        }
    }

    public async sendMessage(messageSendDTO: MessageSendDTO): Promise<Message> {
        if (this.connection) {
            try {
                return await this.connection.invoke<Message>("SendMessage", messageSendDTO);
            } 
            catch (error) {
                console.error('Failed to send message:', error);
                throw new Error('Failed to send message.');
            }
        }

        throw new Error('SignalR connection is not established.');
    }

    public async leaveChat(): Promise<void> {
        if (this.connection && this.chatId !== null) {
            try {
                await this.connection.invoke("LeaveChat", this.chatId);
                this.connection.off("ReceiveMessage");
                await this.connection.stop();
            } 
            catch (error) {
                console.error('Failed to leave chat:', error);
                throw new Error('Failed to leave chat.');
            }
        }
    }
}

export default ChatHubSignalR;