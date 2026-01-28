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

	constructor(baseUrl?: string, path?: string) {
		// Default to gateway base URL and routed Socket.IO path
		this.baseUrl = baseUrl ?? ChatHubSocketIoBaseUrl;
		this.path = path ?? ChatHubSocketIoPath;
	}

	async connect(chatId: number, userId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.socket = io(this.baseUrl, {
				path: this.path,
				transports: ['websocket', 'polling'],
				withCredentials: true,
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
			}, 7000);

			this.socket.emit('send_message', { dto, authorization: this.authorization }, (response: any) => {
				if (response && response.id) {
					done(response as Message);
				} else if (response && response.error) {
					// Don't immediately reject; keep waiting for broadcast
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
			this.socket.disconnect();
			this.socket = null;
		}
	}

	setAuthorization(authHeader: string) {
		this.authorization = authHeader;
	}
}

export default ChatHubSocketIO;
