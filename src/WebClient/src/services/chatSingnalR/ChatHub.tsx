import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import ChatHubURL from '../../config/ChatHubSignalRConfig';
import Message from '../../models/interfaces/Message';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';

class ChatHub {
    private connection: HubConnection | null = null;
    private chatId: number | null = null;
    private onMessageReceived: (message: Message) => void;

    constructor(onMessageReceived: (message: Message) => void) {
        this.onMessageReceived = onMessageReceived;
    }

    public async startConnection(chatId: number): Promise<void> {
        this.chatId = chatId;
        this.connection = new HubConnectionBuilder()
            .withUrl(ChatHubURL)
            .withAutomaticReconnect()
            .build();

        try {
            await this.connection.start();
            console.log("Joined the chat.");
            await this.connection.invoke("JoinChat", chatId);
            this.connection.on("ReceiveMessage", (message: Message) => {
                this.onMessageReceived(message);
            });
        } 
        catch (error) {
            console.error('Failed to connect to SignalR hub:', error);
            throw new Error('Failed to connect to chat.');
        }
    }

    public async sendMessage(messageSendDTO: MessageSendDTO): Promise<void> {
        if (this.connection) {
            try {
                await this.connection.invoke("SendMessage", messageSendDTO);
            } 
            catch (error) {
                console.error('Failed to send message:', error);
                throw new Error('Failed to send message.');
            }
        }
    }

    public async leaveChat(): Promise<void> {
        if (this.connection && this.chatId !== null) {
            try {
                await this.connection.invoke("LeaveChat", this.chatId);
                await this.connection.stop();
            } 
            catch (error) {
                console.error('Failed to leave chat:', error);
                throw new Error('Failed to leave chat.');
            }
        }
    }
}

export default ChatHub;