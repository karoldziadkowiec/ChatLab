import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import Message from "../../models/interfaces/Message";
import MessageService from "../api/MessageService";

type OnMessageReceived = (message: Message) => void;

export default class ChatHub {
    private chatId: number | null = null;
    private readonly onMessageReceived: OnMessageReceived;

    private running = false;
    private timeoutId: number | null = null;
    private lastMessageId = 0;

    private readonly pollIntervalMs: number;
    private currentDelayMs: number;
    private readonly maxBackoffMs: number;

    constructor(onMessageReceived: OnMessageReceived, options?: { pollIntervalMs?: number; maxBackoffMs?: number }) {
        this.onMessageReceived = onMessageReceived;
        this.pollIntervalMs = options?.pollIntervalMs ?? 1000;
        this.currentDelayMs = this.pollIntervalMs;
        this.maxBackoffMs = options?.maxBackoffMs ?? 30000;
    }

    public async startConnection(chatId: number): Promise<void> {
        if (this.running) return;
        this.chatId = chatId;
        this.running = true;

        // initial load to set lastMessageId (do not call onMessage here)
        try {
            const all = await MessageService.getMessagesForChat(chatId);
            if (Array.isArray(all) && all.length > 0) {
                const maxId = Math.max(...all.map(m => m.id ?? 0));
                this.lastMessageId = maxId;
            } else {
                this.lastMessageId = 0;
            }
        } catch (e) {
            console.warn("ChatPollingHub: initial load failed", e);
            this.lastMessageId = 0;
        }

        this.currentDelayMs = this.pollIntervalMs;
        this.scheduleNext(0);
    }

    public async leaveChat(): Promise<void> {
        this.running = false;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    public setLastMessageId(id: number) {
        if (typeof id === "number" && id > (this.lastMessageId ?? 0)) {
            this.lastMessageId = id;
        }
    }

    // sendMessage zwraca utworzoną wiadomość (o ile API ją zwraca)
    public async sendMessage(dto: MessageSendDTO): Promise<Message | null> {
        const svc: any = MessageService as any;
        if (typeof svc.sendMessage === "function") {
            const created = await svc.sendMessage(dto);
            // natychmiast zaktualizuj lastMessageId (jeśli mamy id)
            if (created && typeof created.id === "number") {
                this.setLastMessageId(created.id);
            }
            // krótkie pollOnce po wysłaniu nie jest konieczne jeśli setLastMessageId zabezpiecza duplikat; opcjonalnie można pollOnce()
            return created as Message;
        }

        // fallback: jeśli nie ma sendMessage, spróbuj createMessage
        if (typeof svc.createMessage === "function") {
            const created = await svc.createMessage(dto);
            if (created && typeof created.id === "number") {
                this.setLastMessageId(created.id);
            }
            return created as Message;
        }

        // nic nie zrobiono
        return null;
    }

    private scheduleNext(delayMs: number) {
        if (!this.running) return;
        if (this.timeoutId !== null) clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => this.pollLoop(), delayMs);
    }

    private async pollLoop(): Promise<void> {
        if (!this.running || !this.chatId) return;
        try {
            await this.pollOnce();
            this.currentDelayMs = this.pollIntervalMs;
            this.scheduleNext(this.currentDelayMs);
        } catch (err) {
            console.warn("ChatPollingHub poll error:", err);
            this.currentDelayMs = Math.min(this.currentDelayMs * 2 || this.pollIntervalMs, this.maxBackoffMs);
            this.scheduleNext(this.currentDelayMs);
        }
    }

    // pobiera nowe wiadomości i wywołuje callback tylko dla tych z id > lastMessageId
    private async pollOnce(): Promise<void> {
        if (!this.chatId) return;
        const msgs: Message[] = await MessageService.getMessagesForChat(this.chatId);
        if (!Array.isArray(msgs) || msgs.length === 0) return;

        msgs.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        const newMsgs = msgs.filter(m => (m.id ?? 0) > this.lastMessageId);

        if (newMsgs.length > 0) {
            for (const m of newMsgs) {
                try { this.onMessageReceived(m); } catch (e) { console.error("onMessageReceived error", e); }
            }
            const maxId = Math.max(...newMsgs.map(m => m.id ?? 0));
            this.lastMessageId = Math.max(this.lastMessageId, maxId);
        }
    }
}