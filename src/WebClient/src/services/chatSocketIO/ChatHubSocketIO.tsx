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

		// Defaults for load tests:
		// - Prefer websocket-only to avoid long-polling fallback, which generates extra GET traffic.
		// - If you *want* to test polling fallback, pass options.transports explicitly.
		this.transports = options?.transports ?? ["websocket"];
		this.reconnection = options?.reconnection ?? true;
		this.reconnectionAttempts = options?.reconnectionAttempts ?? 5;
		this.reconnectionDelay = options?.reconnectionDelay ?? 500;
		this.reconnectionDelayMax = options?.reconnectionDelayMax ?? 3000;
		// Under load the server-side ack can be delayed (it waits for Gateway/CoreService/DB).
		// Keep it reasonably high to avoid false client timeouts.
		this.timeoutMs = options?.timeoutMs ?? 15000;
	}

	async connect(chatId: number, userId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			let settled = false;
			const done = (err?: Error) => {
				if (settled) return;
				settled = true;
				if (joinTimeoutId) window.clearTimeout(joinTimeoutId);
				if (err) reject(err);
				else resolve();
			};

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
				// Guard against hanging joins under load.
				joinTimeoutId = window.setTimeout(() => {
					try { this.socket?.disconnect(); } catch { /* ignore */ }
					done(new Error('Timeout waiting for join ack'));
				}, this.timeoutMs);

				// Require server-side join ack so we're not "connected but not in room".
				this.socket?.emit('join', { chatId, userId }, (resp: any) => {
					if (resp && resp.ok === true) {
						done();
						return;
					}
					const message = resp?.error ? String(resp.error) : 'Join failed';
					try {
						this.socket?.disconnect();
					} finally {
						done(new Error(message));
					}
				});
			});

			let joinTimeoutId: number | null = null;
			this.socket.on('connect_error', (err) => {
				try { this.socket?.disconnect(); } catch { /* ignore */ }
				done(err instanceof Error ? err : new Error(String(err)));
			});
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
			const done = (msg?: Message, err?: Error) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeoutId);
				if (err) reject(err);
				else if (msg) resolve(msg);
				else reject(new Error('No response from server'));
			};

			const timeoutId = setTimeout(() => {
				done(undefined, new Error('Timeout waiting for server ack'));
			}, this.timeoutMs);

			this.socket.emit('send_message', { dto, authorization: this.authorization }, (response: any) => {
				if (response && response.id) {
					done(response as Message);
				} else if (response && response.error) {
					done(undefined, new Error(response.error));
				} else {
					done(undefined, new Error('Invalid ack from server'));
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
