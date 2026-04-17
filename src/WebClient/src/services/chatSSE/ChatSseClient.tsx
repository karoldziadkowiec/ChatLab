import ApiCoreURL from '../../config/ApiCoreConfig';

export default class ChatSseClient {
    private chatId: number;
    private onMessage: (msg: any) => void;
    private eventSource: EventSource | null = null;
    private baseUrl: string;
    private triedDirectFallback = false;

    constructor(chatId: number, onMessage: (msg: any) => void, baseUrl?: string) {
        this.chatId = chatId;
        this.onMessage = onMessage;
        this.baseUrl = baseUrl ?? ApiCoreURL;
    }

    connect() {
        const url = `${this.baseUrl}/chat/stream?chatId=${this.chatId}`;
        // withCredentials helps when the backend auth/session is cookie-based.
        // (Even if this SSE endpoint is anonymous today, this keeps it working when auth is enabled later.)
        this.eventSource = new EventSource(url, { withCredentials: true });

        // The server sends a one-time 'connected' event (not a default 'message').
        // Treat it as a heartbeat/diagnostic only.
        this.eventSource.addEventListener('connected', () => {
            // no-op
        });

        this.eventSource.onmessage = (event) => {
            try {
                const raw = (event.data ?? '') as string;
                const normalized = raw.replace(/^\uFEFF/, '').trim();
                if (!normalized) return;
                const message = JSON.parse(normalized);
                this.onMessage(this.normalizeMessageShape(message));
            } catch {
                console.warn("Invalid SSE message", event.data);
            }
        };

        this.eventSource.onerror = () => {
            // NOTE: EventSource will auto-retry on its own.
            // We only close+reconnect if we decide to switch to a different baseUrl.
            console.error("SSE connection error.");

            // Fallback: Ocelot/gateway sometimes breaks SSE streaming.
            // If we were using the gateway base URL, retry once directly against CoreService.
            if (!this.triedDirectFallback && this.baseUrl === ApiCoreURL) {
                this.triedDirectFallback = true;
                this.baseUrl = 'http://localhost:8001/api/core';
                try {
                    this.eventSource?.close();
                } catch {
                    // ignore
                }
                try {
                    this.connect();
                } catch {
                    // ignore
                }
            }
        };
    }

    close() {
        this.eventSource?.close();
    }

    private normalizeMessageShape(message: any): any {
        if (!message || typeof message !== 'object') return message;

        // Server-side SSE serialization used to be PascalCase (Id/ChatId/Content...),
        // while the REST API uses camelCase. Normalize here for backwards compatibility.
        if ('Id' in message && !('id' in message)) {
            const mapped: any = { ...message };

            if ('Id' in mapped) { mapped.id = mapped.Id; delete mapped.Id; }
            if ('ChatId' in mapped) { mapped.chatId = mapped.ChatId; delete mapped.ChatId; }
            if ('Content' in mapped) { mapped.content = mapped.Content; delete mapped.Content; }
            if ('SenderId' in mapped) { mapped.senderId = mapped.SenderId; delete mapped.SenderId; }
            if ('ReceiverId' in mapped) { mapped.receiverId = mapped.ReceiverId; delete mapped.ReceiverId; }
            if ('Timestamp' in mapped) { mapped.timestamp = mapped.Timestamp; delete mapped.Timestamp; }
            if ('CommunicationTechnologyId' in mapped) { mapped.communicationTechnologyId = mapped.CommunicationTechnologyId; delete mapped.CommunicationTechnologyId; }
            if ('CommunicationTechnology' in mapped) { mapped.communicationTechnology = mapped.CommunicationTechnology; delete mapped.CommunicationTechnology; }
            if ('Sender' in mapped) { mapped.sender = mapped.Sender; delete mapped.Sender; }
            if ('Receiver' in mapped) { mapped.receiver = mapped.Receiver; delete mapped.Receiver; }
            if ('Chat' in mapped) { mapped.chat = mapped.Chat; delete mapped.Chat; }

            return mapped;
        }

        return message;
    }
}