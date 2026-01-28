import ApiCoreURL from '../../config/ApiCoreConfig';

export default class ChatSseClient {
    private chatId: number;
    private onMessage: (msg: any) => void;
    private eventSource: EventSource | null = null;

    constructor(chatId: number, onMessage: (msg: any) => void) {
        this.chatId = chatId;
        this.onMessage = onMessage;
    }

    connect() {
        this.eventSource = new EventSource(
            `${ApiCoreURL}/chat/stream?chatId=${this.chatId}`
        );

        this.eventSource.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.onMessage(message);
            } catch {
                console.warn("Invalid SSE message", event.data);
            }
        };

        this.eventSource.onerror = () => {
            console.error("SSE connection error. Closing...");
            this.eventSource?.close();
        };
    }

    close() {
        this.eventSource?.close();
    }
}