// src/services/chatWebSockets/ChatHub.ts
import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import Message from "../../models/interfaces/Message";
import ChatHubURL from '../../config/ChatHubWebSocketsConfig';
import AccountService from "../api/AccountService"; // używaj jeśli masz metodę getToken

export default class ChatWebSocket {
    private socket: WebSocket | null = null;
    private readonly chatId: number;
    private readonly onMessageReceived: (msg: Message) => void;

    constructor(chatId: number, onMessageReceived: (msg: Message) => void) {
        this.chatId = chatId;
        this.onMessageReceived = onMessageReceived;
    }

    async connect(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // Jeżeli masz token JWT - dołącz go do query string aby backend mógł go zweryfikować
                let url = `${ChatHubURL}`;
                // jeśli ChatHubURL nie zawiera query param, dodaj zapytanie
                // np. ChatHubURL = "wss://localhost:7220/ws"
                const token = typeof AccountService?.getToken === 'function'
                    ? await AccountService.getToken()
                    : null;
                const qs = new URLSearchParams();
                if (token) qs.set('access_token', token);
                qs.set('chatId', String(this.chatId));
                url += (url.includes('?') ? '&' : '?') + qs.toString();

                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    console.info('WebSocket opened', url);
                    // Po otwarciu - jawne dołączenie jeśli serwer tego wymaga (bezpieczniejsze)
                    this.sendRaw({ type: 'join', chatId: this.chatId });
                    resolve();
                };

                this.socket.onmessage = (ev: MessageEvent) => {
                    try {
                        const data = JSON.parse(ev.data);
                        // oczekujemy komunikatu: { type: "receive" | "message", payload: Message }
                        if (data?.type === 'receive' || data?.type === 'message') {
                            this.onMessageReceived(data.payload as Message);
                        } else if (data?.type === 'pong') {
                            // opcjonalnie ping/pong
                        } else {
                            // loguj inne typy dla debugowania
                            console.debug('WS message (unknown type):', data);
                        }
                    } catch (e) {
                        console.warn('Invalid JSON from WS:', ev.data);
                    }
                };

                this.socket.onerror = (err) => {
                    console.error('WebSocket error', err);
                    // nie rejectujemy tutaj, onclose/ onerror często występują razem; zostaw reject tylko na initial failure
                };

                this.socket.onclose = (ev) => {
                    console.warn('WebSocket closed', ev.code, ev.reason);
                    // jeśli chcesz, możesz dodać tu reconnect logic
                };
            } catch (ex) {
                reject(ex);
            }
        });
    }

    private sendRaw(obj: any): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(obj));
        } else {
            console.warn('Attempt to send on closed socket', obj);
        }
    }

    // wysyłaj wiadomość w envelope, tak jak serwer oczekuje
    send(messageDto: MessageSendDTO): void {
        const envelope = {
            type: 'message',
            chatId: this.chatId,
            payload: messageDto
        };
        this.sendRaw(envelope);
    }

    disconnect(): void {
        if (this.socket) {
            try {
                // opcjonalnie poinformuj serwer przed zamknięciem
                this.sendRaw({ type: 'leave', chatId: this.chatId });
            } catch { /* ignore */ }
            this.socket.close();
            this.socket = null;
        }
    }
}