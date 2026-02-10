import { io, Socket } from 'socket.io-client';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import Message from '../../models/interfaces/Message';
import ChatHubSocketIoBaseUrl from "../../config/ChatHubSocketIoBaseUrlConfig";
import ChatHubSocketIoPath from "../../config/ChatHubSocketIoPathConfig";

class ChatHubSocketIO {
	private socket: Socket | null = null;
	private lastMessageId: number | null = null;
	private readonly baseUrl: string;
	private readonly path: string;
	private authorization: string | null = null;
	private readonly transports: string[];
	private readonly reconnection: boolean;
	private readonly reconnectionAttempts: number;
	private readonly reconnectionDelay: number;
	private readonly reconnectionDelayMax: number;
	private readonly timeoutMs: number;

	constructor(
		baseUrl?: string,
		path?: string,
		options?: {
			transports?: string[];
			reconnection?: boolean;
			reconnectionAttempts?: number;
			reconnectionDelay?: number;
			reconnectionDelayMax?: number;
			timeoutMs?: number;
		}
	) {
		// Default to gateway base URL and routed Socket.IO path
		this.baseUrl = baseUrl ?? ChatHubSocketIoBaseUrl;
		this.path = path ?? ChatHubSocketIoPath;

		// Sensible defaults optimized for perf (prefer websocket)
		this.transports = options?.transports ?? ["websocket", "polling"];
		this.reconnection = options?.reconnection ?? true;
		this.reconnectionAttempts = options?.reconnectionAttempts ?? 5;
		this.reconnectionDelay = options?.reconnectionDelay ?? 500;
		this.reconnectionDelayMax = options?.reconnectionDelayMax ?? 3000;
		this.timeoutMs = options?.timeoutMs ?? 8000;
	}

	async connect(chatId: number, userId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket = io(this.baseUrl, {
				path: this.path,
				transports: this.transports,
				withCredentials: true,
				reconnection: this.reconnection,
				reconnectionAttempts: this.reconnectionAttempts,
				reconnectionDelay: this.reconnectionDelay,
				reconnectionDelayMax: this.reconnectionDelayMax,
				timeout: this.timeoutMs,
				auth: this.authorization ? { authorization: this.authorization } : undefined
			});

			this.socket.on('connect', () => {
				this.socket?.emit('join', { chatId, userId });
				resolve();
			});

			this.socket.on('connect_error', (err) => reject(err));
		});
	}

	onMessage(handler: (message: Message) => void): void {
		this.socket?.on('message', (payload: Message) => {
			handler(payload);
		});
	}

	offMessage(handler: (message: Message) => void): void {
		this.socket?.off('message', handler as any);
	}

	async sendMessage(dto: MessageSendDTO): Promise<Message> {
		return new Promise((resolve, reject) => {
			if (!this.socket) {
				reject(new Error('Socket.IO not connected'));
				return;
			}
			let settled = false;
			let ackError: Error | null = null;
			const done = (msg?: Message, err?: Error) => {
				if (settled) return;
				settled = true;
				this.socket?.off('message', onMessageMatch);
				clearTimeout(timeoutId);
				if (err) reject(err);
				else if (msg) resolve(msg);
				else reject(new Error('No response from server'));
			};

			const onMessageMatch = (payload: Message) => {
				// Resolve when broadcasted message for this dto arrives
				try {
					if (
						payload &&
						`${payload.chatId}` === `${dto.chatId}` &&
						`${payload.senderId}` === `${dto.senderId}` &&
						payload.content === dto.content
					) {
						done(payload);
					}
				} catch (_) {
					// ignore
				}
			};
			this.socket.on('message', onMessageMatch);

			const timeoutId = setTimeout(() => {
				// If we saw an ack error but no broadcast, reject with the ack error
				done(undefined, ackError ?? new Error('Timeout waiting for server'));
			}, this.timeoutMs);

			this.socket.emit('send_message', { dto, authorization: this.authorization }, (response: any) => {
				if (response && response.id) {
					done(response as Message);
				} else if (response && response.error) {
					// Prefer failing fast on ack error to reduce waiting under load
					ackError = new Error(response.error);
				} else {
					// If ack is empty, we'll resolve on broadcast or hit timeout
				}
			});
		});
	}

	setLastMessageId(id: number): void {
		this.lastMessageId = id;
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
		}
	}

	setAuthorization(authHeader: string) {
		this.authorization = authHeader;
		if (this.socket) {
			// Update auth for future reconnects
			(this.socket as any).auth = this.authorization ? { authorization: this.authorization } : undefined;
		}
	}
}

export default ChatHubSocketIO;
