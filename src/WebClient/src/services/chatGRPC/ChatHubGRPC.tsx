import Message from '../../models/interfaces/Message';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import { CORE_GRPC_BASE, CORE_GRPC_DIRECT_BASE, buildAuthMetadata, timestampToIso } from './GrpcClient';
import { ChatGrpcClient } from '../../grpc/ChatServiceClientPb';
import { MessageSend as PbMessageSend, StreamRequest, Message as PbMessage } from '../../grpc/chat_pb';

type Options = {
	pollIntervalMs?: number;
};

class ChatHubGRPC {
	private onMessageCb: (message: Message) => void;
	private client: any | null = null;
	private unaryClient: any | null = null;
	private stream: any | null = null;
	private chatId: number | null = null;
	private lastMessageId: number | null = null;
	private reconnectAttempts = 0;
	private maxReconnectDelayMs = 10000;
	private baseReconnectDelayMs = 500;
	private stopRequested = false;
	private streamBaseUrl: string;
	private unaryBaseUrl: string;
	private triedGatewayFallbackForStream = false;

	constructor(onMessage: (message: Message) => void, options?: Options) {
		this.onMessageCb = onMessage;
		// IMPORTANT:
		// - Server streaming via gRPC-web is often buffered/broken by gateways/proxies.
		//   Use CoreService directly for the stream so we can measure echo reliably.
		// - Unary SendMessage can still go through the Gateway to keep traffic patterns comparable.
		this.streamBaseUrl = CORE_GRPC_DIRECT_BASE;
		this.unaryBaseUrl = CORE_GRPC_BASE;
	}

	async startConnection(chatId: number, userId?: string): Promise<void> {
		// start/restart is an explicit user action; allow reconnects
		this.stopRequested = false;
		this.chatId = chatId;
		this.stopCurrentStream();
		this.client = new ChatGrpcClient(this.streamBaseUrl, null, {});
		const md = await buildAuthMetadata();
		const req = new StreamRequest();
		req.setChatid(chatId);
		if (userId) {
			req.setUserid(userId);
		}
		req.setSincemessageid(this.lastMessageId ?? 0);
		this.stream = this.client.streamChat(req, md);
		this.stream.on('data', (pb: PbMessage) => {
			const techName = pb.getTechnologyname && typeof pb.getTechnologyname === 'function' ? pb.getTechnologyname() : '';
			const msg: Message = {
				id: pb.getId(),
				chatId: pb.getChatid(),
				senderId: pb.getSenderid(),
				receiverId: pb.getReceiverid(),
				content: pb.getContent(),
				timestamp: timestampToIso(pb.getTimestamp()),
				communicationTechnology: { id: 0, name: techName || 'gRPC' }
			} as any;
			this.onMessageCb(msg);
			this.lastMessageId = msg.id;
			this.reconnectAttempts = 0; // reset on successful data
		});
		this.stream.on('error', (err: any) => {
			if (this.stopRequested) return;

			// If CoreService direct port is down (ERR_CONNECTION_REFUSED/RESET), fall back to gateway.
			if (!this.triedGatewayFallbackForStream && this.streamBaseUrl === CORE_GRPC_DIRECT_BASE && this.isNetworkUnavailableError(err)) {
				this.triedGatewayFallbackForStream = true;
				this.streamBaseUrl = CORE_GRPC_BASE;
				this.reconnectAttempts = 0;
				try { this.stopCurrentStream(); } catch { }
				this.startConnection(chatId, userId).catch(() => { /* ignore */ });
				return;
			}
			this.scheduleReconnect(userId);
		});
		this.stream.on('end', () => {
			if (this.stopRequested) return;
			this.scheduleReconnect(userId);
		});
	}

	async leaveChat(): Promise<void> {
		this.stopRequested = true;
		this.stopCurrentStream();
	}

	async sendMessage(dto: MessageSendDTO): Promise<Message> {
		// Use a separate unary client (Gateway) so streaming remains stable.
		if (!this.unaryClient) {
			this.unaryClient = new ChatGrpcClient(this.unaryBaseUrl, null, {});
		}
		const md = await buildAuthMetadata();
		const req = new PbMessageSend();
		req.setChatid(dto.chatId);
		req.setSenderid(dto.senderId);
		req.setReceiverid(dto.receiverId);
		req.setCommunicationtechnologyid(dto.communicationTechnologyId);
		req.setContent(dto.content);
		return new Promise<Message>((resolve, reject) => {
			this.unaryClient.sendMessage(req, md, (err: any, pb: PbMessage) => {
				if (err) {
					reject(err);
					return;
				}
				const techName = pb.getTechnologyname && typeof pb.getTechnologyname === 'function' ? pb.getTechnologyname() : '';
				const created: Message = {
					id: pb.getId(),
					chatId: pb.getChatid(),
					senderId: pb.getSenderid(),
					receiverId: pb.getReceiverid(),
					content: pb.getContent(),
					timestamp: timestampToIso(pb.getTimestamp()),
					communicationTechnology: { id: dto.communicationTechnologyId, name: techName || 'gRPC' }
				} as any;
				resolve(created);
			});
		});
	}

	setLastMessageId(id: number): void {
		this.lastMessageId = id;
	}

	private isNetworkUnavailableError(err: any): boolean {
		const msg = (err && (err.message || err.toString?.())) ? String(err.message || err.toString()) : '';
		return (
			msg.includes('ERR_CONNECTION_REFUSED') ||
			msg.includes('ERR_CONNECTION_RESET') ||
			msg.includes('Failed to fetch') ||
			msg.includes('UNAVAILABLE')
		);
	}

	private scheduleReconnect(userId?: string): void {
		if (this.stopRequested || !this.chatId) return;
		this.reconnectAttempts += 1;
		const jitter = Math.floor(Math.random() * 300);
		const delay = Math.min(this.maxReconnectDelayMs, this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts)) + jitter;
		setTimeout(() => {
			if (this.stopRequested || !this.chatId) return;
			this.startConnection(this.chatId, userId).catch(() => {
				// swallow; next error will schedule another reconnect
			});
		}, delay);
	}

	private stopCurrentStream(): void {
		if (this.stream) {
			try { this.stream.cancel(); } catch { }
			this.stream = null;
		}
	}
}

export default ChatHubGRPC;
