import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import Message from "../../models/interfaces/Message";
import ChatHubURL from '../../config/ChatHubWebSocketsConfig';
import AccountService from "../api/AccountService"; // use if you have getToken method

export type ChatWebSocketEnvelope = {
    type: string;
    chatId?: number;
    clientMessageId?: string | null;
    code?: string;
    message?: string;
    payload?: unknown;
};

export default class ChatHubWebSockets {
    private socket: WebSocket | null = null;
    private readonly chatId: number;
    private readonly userId: string;
    private readonly onMessageReceived: (msg: Message, envelope?: ChatWebSocketEnvelope) => void;
    private readonly onServerError?: (envelope: ChatWebSocketEnvelope) => void;
    private reconnectAttempts = 0;
    private heartbeatTimer: number | null = null;
    private closedExplicitly = false;

    constructor(
        chatId: number,
        userId: string,
        onMessageReceived: (msg: Message, envelope?: ChatWebSocketEnvelope) => void,
        onServerError?: (envelope: ChatWebSocketEnvelope) => void
    ) {
        this.chatId = chatId;
        this.userId = userId;
        this.onMessageReceived = onMessageReceived;
        this.onServerError = onServerError;
    }

    async connect(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                let url = `${ChatHubURL}`;
                const token = typeof AccountService?.getToken === 'function'
                    ? await AccountService.getToken()
                    : null;
                const qs = new URLSearchParams();
                if (token) qs.set('access_token', token);
                qs.set('chatId', String(this.chatId));
                qs.set('userId', this.userId);
                url += (url.includes('?') ? '&' : '?') + qs.toString();

                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    console.info('WebSocket opened', url);
                    this.reconnectAttempts = 0;
                    this.sendRaw({ type: 'join', chatId: this.chatId, userId: this.userId });
                    // Heartbeat every ~25s
                    this.startHeartbeat();
                    resolve();
                };

                this.socket.onmessage = (ev: MessageEvent) => {
                    try {
                        const data = JSON.parse(ev.data) as ChatWebSocketEnvelope;
                        if (data?.type === 'receive' || data?.type === 'message') {
                            this.onMessageReceived(data.payload as Message, data);
                        } else if (data?.type === 'pong') {
                            // heartbeat OK
                        } else if (data?.type === 'error') {
                            console.warn('WS server error:', data);
                            this.onServerError?.(data);
                        } else {
                            console.debug('WS message (unknown type):', data);
                        }
                    } catch (e) {
                        console.warn('Invalid JSON from WS:', ev.data);
                    }
                };

                this.socket.onerror = (err) => {
                    console.error('WebSocket error', err);
                };

                this.socket.onclose = (ev) => {
                    console.warn('WebSocket closed', ev.code, ev.reason);
                    this.stopHeartbeat();
                    if (!this.closedExplicitly) {
                        this.scheduleReconnect();
                    }
                };
            } catch (ex) {
                reject(ex);
            }
        });
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = window.setInterval(() => {
            this.sendRaw({ type: 'ping' });
        }, 25000);
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            window.clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private scheduleReconnect() {
        this.reconnectAttempts += 1;
        const base = 500; // ms
        const max = 5000; // ms
        const jitter = Math.random() * 0.25 + 0.75; // 0.75-1.0
        const delay = Math.min(max, Math.pow(2, this.reconnectAttempts) * base) * jitter;
        console.info(`Reconnecting WS in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
        window.setTimeout(() => {
            if (this.closedExplicitly) return;
            this.connect().catch(err => console.error('Reconnect failed', err));
        }, delay);
    }

    private sendRaw(obj: any): boolean {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(obj));
            return true;
        } else {
            // Optionally buffer or drop
            console.warn('Attempt to send on closed socket', obj);
            return false;
        }
    }

    // Send message in envelope, as expected by the server
    send(messageDto: MessageSendDTO, clientMessageId?: string | null): boolean {
        const envelope = {
            type: 'message',
            chatId: this.chatId,
            clientMessageId: clientMessageId ?? null,
            payload: messageDto
        };
        return this.sendRaw(envelope);
    }

    createClientMessageId(): string {
        // Modern browsers support crypto.randomUUID(). Keep a fallback for older ones.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    disconnect(): void {
        this.closedExplicitly = true;
        this.stopHeartbeat();
        if (this.socket) {
            try {
                this.sendRaw({ type: 'leave', chatId: this.chatId });
            } catch { /* ignore */ }
            this.socket.close();
            this.socket = null;
        }
    }
}