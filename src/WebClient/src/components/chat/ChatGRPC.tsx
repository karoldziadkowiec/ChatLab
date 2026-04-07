import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import CommunicationTechnologyService from '../../services/api/CommunicationTechnologyService';
import CommunicationTechnologyConst from "../../models/enums/CommunicationTechnologyConst";
import ChatHubGRPC from '../../services/chatGRPC/ChatHubGRPC'
import { MessageContentConfig, MessageIntervalConfigInMs, SimulationTimeConfigInMs } from '../../config/SimulationConfig';
import ChatModel from '../../models/interfaces/Chat';
import Message from '../../models/interfaces/Message';
import UserDTO from '../../models/dtos/UserDTO';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import '../../App.css';
import '../../styles/chat/Chat.css';

const ChatGRPC = () => {
    const METRICS_TOAST_ID = 'grpc-send-metrics';
    const THROUGHPUT_WINDOW_MS = 10_000;
    const [technologyName, setTechnologyName] = useState<string | null>(null);
    const [technologyId, setTechnologyId] = useState<number | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<ChatModel | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHubGRPC, setChatHubGRPC] = useState<ChatHubGRPC | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState<boolean>(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState<boolean>(false);
    const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

    // Continuous traffic simulation (single client): sends messages at a configured interval.
    const [isAutoSending, setIsAutoSending] = useState<boolean>(false);
    const autoSendRunIdRef = useRef<number>(0);

    // Aggregates for the whole simulation run (reset on Start).
    const runStartPerfMsRef = useRef<number | null>(null);
    const runSentOkCountRef = useRef<number>(0);
    const runSendAttemptCountRef = useRef<number>(0);
    const runSendFailCountRef = useRef<number>(0);
    const runEchoTotalMsRef = useRef<number>(0);
    const runEchoCountRef = useRef<number>(0);
    const runEchoMinMsRef = useRef<number | null>(null);
    const runEchoMaxMsRef = useRef<number | null>(null);
    const [runAvgEchoMs, setRunAvgEchoMs] = useState<number | null>(null);
    const [runMinEchoMs, setRunMinEchoMs] = useState<number | null>(null);
    const [runMaxEchoMs, setRunMaxEchoMs] = useState<number | null>(null);
    const [runAvgThroughputMsgPerSec, setRunAvgThroughputMsgPerSec] = useState<number | null>(null);
    const [runFailPercent, setRunFailPercent] = useState<number | null>(null);

    // Throughput (msg/s): keep timestamps of successful echos in a sliding window.
    const echoedOkTimestampsRef = useRef<number[]>([]);

    // Helps gRPC stream start from the newest already-loaded message.
    const lastLoadedMessageIdRef = useRef<number>(0);

    // Used for accurate latency measurement: correlate created message id with gRPC stream receive.
    const receivedMessageIdsRef = useRef<Set<number>>(new Set());
    const receiveWaitersRef = useRef<Map<number, () => void>>(new Map());

    const waitForReceive = useCallback((messageId: number, timeoutMs: number): Promise<void> => {
        if (receivedMessageIdsRef.current.has(messageId)) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                receiveWaitersRef.current.delete(messageId);
                reject(new Error('Timed out waiting for gRPC stream receive.'));
            }, timeoutMs);

            receiveWaitersRef.current.set(messageId, () => {
                window.clearTimeout(timeout);
                receiveWaitersRef.current.delete(messageId);
                resolve();
            });
        });
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const id = await AccountService.getId();
                if (id) setUserId(id);
            } catch (error) {
                console.error('Failed to fetch userId:', error);
                toast.error('Failed to load userId.');
            }
        };

        const fetchChatData = async (chatId: number, currentUserId: string | null) => {
            try {
                const _chatData = await ChatService.getChatById(chatId);
                setChatData(_chatData);

                // When current user is not a participant, still allow entering the room (load-testing mode).
                // We keep the header stable by showing one of the chat participants as the "receiver".
                if (currentUserId && _chatData.user1Id === currentUserId) {
                    setUser(_chatData.user1);
                    setReceiver(_chatData.user2);
                } else if (currentUserId && _chatData.user2Id === currentUserId) {
                    setUser(_chatData.user2);
                    setReceiver(_chatData.user1);
                } else {
                    setUser(null);
                    setReceiver(_chatData.user1 ?? _chatData.user2);
                }

                const _messages = await MessageService.getMessagesForChat(chatId);
                setMessages(_messages);
                if (Array.isArray(_messages) && _messages.length > 0) {
                    const maxId = Math.max(..._messages.map(m => (typeof m.id === 'number' ? m.id : 0)));
                    lastLoadedMessageIdRef.current = Number.isFinite(maxId) ? maxId : 0;
                } else {
                    lastLoadedMessageIdRef.current = 0;
                }

                const techName = CommunicationTechnologyConst.GRPC;
                setTechnologyName(techName);
                try {
                    const _technologyId = await CommunicationTechnologyService.getCommunicationTechnologyId(techName);
                    setTechnologyId(_technologyId);
                } catch (e) {
                    console.error('Failed to resolve communication technology id:', e);
                }
            } catch (error) {
                console.error('Failed to fetch chat data:', error);
                toast.error('Failed to load chat data.');
            }
        };

        if (id) {
            fetchUserData();
            fetchChatData(Number(id), userId);
        }
    }, [id, userId]);

    useEffect(() => {
        if (userId && id) {
            const hub = new ChatHubGRPC((message: Message) => {
                if (typeof message.id === 'number') {
                    receivedMessageIdsRef.current.add(message.id);
                    const waiter = receiveWaitersRef.current.get(message.id);
                    if (waiter) {
                        try { waiter(); } catch { /* ignore */ }
                    }
                }
                setMessages((prevMessages) => {
                    if (prevMessages.some(m => m.id === message.id)) return prevMessages;
                    return [...prevMessages, message];
                });
            }, { pollIntervalMs: 1000 });

            // Start streaming only from the newest message we already loaded via REST.
            hub.setLastMessageId(lastLoadedMessageIdRef.current);

            hub.startConnection(Number(id), userId)
                .then(() => setChatHubGRPC(hub))
                .catch(error => {
                    console.error('Failed to start gRPC chat service:', error);
                    toast.error('Failed to start chat service.');
                });

            return () => {
                // Stop background traffic loop on unmount/leave.
                autoSendRunIdRef.current += 1;
                setIsAutoSending(false);
                hub.leaveChat().catch(error => {
                    console.error('Failed to stop gRPC chat service:', error);
                });
            };
        }
    }, [userId, id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const resolveReceiverIdForSend = useCallback((): string | null => {
        if (!chatData) return null;
        if (userId && chatData.user1Id === userId) return chatData.user2Id;
        return chatData.user1Id;
    }, [chatData, userId]);

    const showMetricsToast = useCallback((message: string) => {
        if (toast.isActive(METRICS_TOAST_ID)) {
            toast.update(METRICS_TOAST_ID, {
                render: message,
                type: 'info',
                autoClose: 2500,
                closeOnClick: true,
                pauseOnHover: true
            });
            return;
        }

        toast.info(message, {
            toastId: METRICS_TOAST_ID,
            autoClose: 2500,
            closeOnClick: true,
            pauseOnHover: true
        });
    }, []);

    const getCurrentThroughputMsgPerSec = useCallback((): number => {
        const now = performance.now();
        const windowStart = now - THROUGHPUT_WINDOW_MS;
        const timestamps = echoedOkTimestampsRef.current;

        // Drop old entries in-place.
        let firstValidIndex = 0;
        while (firstValidIndex < timestamps.length && timestamps[firstValidIndex] < windowStart) {
            firstValidIndex += 1;
        }
        if (firstValidIndex > 0) {
            timestamps.splice(0, firstValidIndex);
        }

        const windowSeconds = THROUGHPUT_WINDOW_MS / 1000;
        return timestamps.length / windowSeconds;
    }, [THROUGHPUT_WINDOW_MS]);

    const sendMessageWithMetrics = useCallback(async (content: string, mode: 'manual' | 'auto') => {
        const isAuto = mode === 'auto' && runStartPerfMsRef.current != null;
        if (isAuto) {
            runSendAttemptCountRef.current += 1;
            const attempts = runSendAttemptCountRef.current;
            const fails = runSendFailCountRef.current;
            setRunFailPercent(attempts > 0 ? (fails / attempts) * 100 : null);
        }

        try {
            if (!chatHubGRPC) {
                toast.error('Chat service not ready.');
                throw new Error('Chat service not ready.');
            }

            const senderId = userId;
            const receiverId = resolveReceiverIdForSend();
            if (!chatData?.id || !senderId || !receiverId || !technologyId) {
                toast.error('Unable to send message. Missing required data.');
                throw new Error('Missing required data.');
            }

            const startTime = performance.now();
            const dto: MessageSendDTO = {
                chatId: chatData.id,
                senderId,
                receiverId,
                communicationTechnologyId: technologyId,
                content
            };

            const created = await chatHubGRPC.sendMessage(dto);
            if (!created || typeof created.id !== 'number') {
                throw new Error('gRPC SendMessage did not return created message with id.');
            }

            // Optimistic UI update: show the message immediately.
            // If/when the stream echoes it back, we dedupe by id in the stream handler.
            setMessages(prev => {
                if (prev.some(m => m.id === created.id)) return prev;
                return [...prev, created];
            });

            let echoMs: number | null = null;
            try {
                await waitForReceive(created.id, 5000);
                echoMs = performance.now() - startTime;
            } catch {
                // ignore timeout
            }

            if (echoMs != null) {
                const echoDonePerfMs = performance.now();
                echoedOkTimestampsRef.current.push(echoDonePerfMs);
                const throughput = getCurrentThroughputMsgPerSec();

                if (isAuto) {
                    runSentOkCountRef.current += 1;
                    const elapsedSec = (echoDonePerfMs - runStartPerfMsRef.current!) / 1000;
                    if (elapsedSec > 0) {
                        setRunAvgThroughputMsgPerSec(runSentOkCountRef.current / elapsedSec);
                    }

                    runEchoTotalMsRef.current += echoMs;
                    runEchoCountRef.current += 1;
                    setRunAvgEchoMs(runEchoTotalMsRef.current / runEchoCountRef.current);

                    const currentMin = runEchoMinMsRef.current;
                    const currentMax = runEchoMaxMsRef.current;
                    const nextMin = currentMin == null ? echoMs : Math.min(currentMin, echoMs);
                    const nextMax = currentMax == null ? echoMs : Math.max(currentMax, echoMs);
                    runEchoMinMsRef.current = nextMin;
                    runEchoMaxMsRef.current = nextMax;
                    setRunMinEchoMs(nextMin);
                    setRunMaxEchoMs(nextMax);

                    const attempts = runSendAttemptCountRef.current;
                    const fails = runSendFailCountRef.current;
                    setRunFailPercent(attempts > 0 ? (fails / attempts) * 100 : null);
                }

                const echoRounded = Math.round(echoMs);
                const toastMessage = `gRPC (${mode}): time ${echoRounded} ms | throughput ${throughput.toFixed(2)} msg/s`;
                showMetricsToast(toastMessage);
                console.log(`gRPC send metrics (${mode}): time=${echoRounded}ms, throughput=${throughput.toFixed(2)} msg/s`);
                return;
            }

            // Timeout path
            const throughput = getCurrentThroughputMsgPerSec();
            const toastMessage = `gRPC (${mode}): time timeout | throughput ${throughput.toFixed(2)} msg/s`;
            showMetricsToast(toastMessage);
        } catch (e) {
            if (isAuto) {
                runSendFailCountRef.current += 1;
                const attempts = runSendAttemptCountRef.current;
                const fails = runSendFailCountRef.current;
                setRunFailPercent(attempts > 0 ? (fails / attempts) * 100 : null);
            }
            throw e;
        }
    }, [chatHubGRPC, chatData?.id, userId, technologyId, resolveReceiverIdForSend, waitForReceive, getCurrentThroughputMsgPerSec, showMetricsToast]);

    const startAutoSend = useCallback(async () => {
        if (isAutoSending) return;

        if (!chatHubGRPC) {
            toast.error('Chat service not ready yet.');
            return;
        }

        if (!userId || !chatData?.id || !technologyId) {
            toast.error('Chat is not ready yet (missing user/chat/technology).');
            return;
        }

        if (!MessageIntervalConfigInMs || MessageIntervalConfigInMs <= 0) {
            toast.error('Invalid message interval config.');
            return;
        }

        const content = (MessageContentConfig ?? '').trim();
        if (!content) {
            toast.error('Message content config is empty.');
            return;
        }

        setIsAutoSending(true);

        // Reset run aggregates.
        const runStartPerfMs = performance.now();
        runStartPerfMsRef.current = runStartPerfMs;
        runSentOkCountRef.current = 0;
        runSendAttemptCountRef.current = 0;
        runSendFailCountRef.current = 0;
        runEchoTotalMsRef.current = 0;
        runEchoCountRef.current = 0;
        runEchoMinMsRef.current = null;
        runEchoMaxMsRef.current = null;
        setRunAvgEchoMs(null);
        setRunMinEchoMs(null);
        setRunMaxEchoMs(null);
        setRunAvgThroughputMsgPerSec(null);
        setRunFailPercent(null);

        // Reset sliding-window throughput so it doesn't carry over between runs.
        echoedOkTimestampsRef.current = [];

        const runId = autoSendRunIdRef.current + 1;
        autoSendRunIdRef.current = runId;

        const stopAtPerfMs = SimulationTimeConfigInMs && SimulationTimeConfigInMs > 0
            ? runStartPerfMs + SimulationTimeConfigInMs
            : null;

        // Loop: send -> wait -> repeat. (No overlapping sends)
        while (autoSendRunIdRef.current === runId) {
            if (stopAtPerfMs != null && performance.now() >= stopAtPerfMs) {
                break;
            }
            try {
                await sendMessageWithMetrics(content, 'auto');
            } catch (e) {
                console.error('Auto-send failed:', e);
            }

            await new Promise<void>(resolve => setTimeout(resolve, MessageIntervalConfigInMs));
        }

        // If we exited because time elapsed (and not because user pressed Stop), stop the run.
        if (autoSendRunIdRef.current === runId && stopAtPerfMs != null) {
            autoSendRunIdRef.current += 1;
            setIsAutoSending(false);
            toast.info('Simulation time elapsed — stopped automatically.');
        }
    }, [isAutoSending, chatHubGRPC, userId, chatData?.id, technologyId, sendMessageWithMetrics]);

    const stopAutoSend = useCallback(() => {
        autoSendRunIdRef.current += 1;
        setIsAutoSending(false);
    }, []);

    if (!chatData) {
        return <div><h2><strong>No chat found...</strong></h2></div>;
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            await sendMessageWithMetrics(newMessage, 'manual');
            setNewMessage('');
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message.');
        }
    };

    const handleDeleteChatRoom = async () => {
        if (!chatData)
            return;

        try {
            await ChatService.deleteChat(chatData.id);
            setShowDeleteChatRoomModal(false);
            toast.success('Your chat room has been deleted successfully.');
            navigate(RoutePaths.chats());
        }
        catch (error) {
            console.error('Failed to delete chat room:', error);
            toast.error('Failed to delete chat room.');
        }
    };

    const handleShowDeleteMessageModal = (messageId: number) => {
        setDeleteMessageId(messageId);
        setShowDeleteMessageModal(true);
    };

    const handleDeleteMessage = async () => {
        if (!userId || !deleteMessageId)
            return;

        try {
            await MessageService.deleteMessage(deleteMessageId);
            toast.success('Message has been deleted successfully.');
            setShowDeleteMessageModal(false);
            setDeleteMessageId(null);
            // Refresh the chat data
            const _messages = await MessageService.getMessagesForChat(chatData.id);
            setMessages(_messages);
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message.');
        }
    };

    return (
        <div className="Chat">
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - gRPC</h1>
            <div className="chat-container">
                <div className="chat-header sticky-top">
                    <div className="chat-header__left">
                        <div className="chat-avatar">
                            {`${receiver?.firstName?.[0] ?? ''}${receiver?.lastName?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div className="chat-title">
                            <div className="chat-name">{receiver ? `${receiver.firstName} ${receiver.lastName}` : 'Receiver'}</div>
                            <div className="chat-subtitle">Chat via gRPC</div>
                        </div>
                    </div>
                    <div className="chat-header__right">
                        <Button
                            variant={isAutoSending ? 'warning' : 'secondary'}
                            size='sm'
                            onClick={() => {
                                if (isAutoSending) stopAutoSend();
                                else startAutoSend();
                            }}
                            title={isAutoSending ? 'Stop continuous sending' : `Start continuous sending (${MessageIntervalConfigInMs} ms)`}
                        >
                            <i className={isAutoSending ? 'bi bi-stop-fill' : 'bi bi-play-fill'}></i>
                        </Button>
                        <div className="chat-header__metrics small">
                            avg time:{' '}
                            {runAvgEchoMs != null ? (
                                <span className="text-warning">{Math.round(runAvgEchoMs)} ms</span>
                            ) : (
                                '-'
                            )}{' '}
                            | min:{' '}
                            {runMinEchoMs != null ? (
                                <span className="text-warning">{Math.round(runMinEchoMs)} ms</span>
                            ) : (
                                '-'
                            )}{' '}
                            | max:{' '}
                            {runMaxEchoMs != null ? (
                                <span className="text-warning">{Math.round(runMaxEchoMs)} ms</span>
                            ) : (
                                '-'
                            )}{' '}
                            | avg throughput:{' '}
                            {runAvgThroughputMsgPerSec != null ? (
                                <span className="text-warning">{runAvgThroughputMsgPerSec.toFixed(2)} msg/s</span>
                            ) : (
                                '-'
                            )}{' '}
                            | failed:{' '}
                            {runFailPercent != null ? (
                                <span className="text-warning">{runFailPercent.toFixed(2)}%</span>
                            ) : (
                                '-'
                            )}
                        </div>
                        <Button variant="danger" size='sm' onClick={() => setShowDeleteChatRoomModal(true)}>
                            <i className="bi bi-trash"></i>
                        </Button>
                    </div>
                </div>
                <div className="messages">
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const isMe = message.senderId === userId;
                            return (
                                <div key={message.id} className={`msg ${isMe ? 'msg--me' : 'msg--other'}`}>
                                    <div className={`msg-bubble ${isMe ? 'msg-bubble--me' : 'msg-bubble--other'}`}>
                                        <div className="msg-content">{message.content}</div>
                                        <div className="msg-footer">
                                            <span className="msg-time">{TimeService.formatDateToEURWithHour(message.timestamp)} ({message.communicationTechnology?.name || technologyName || 'gRPC'})</span>
                                            {isMe && (
                                                <Button variant="outline-danger" size='sm' className="msg-delete" onClick={() => handleShowDeleteMessageModal(message.id)}>
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div>
                            <p><strong>You're starting a new conversation</strong></p>
                            <p>Type your first message below.</p>
                        </div>
                    )}
                    {/* Scrolling down */}
                    <div ref={messagesEndRef} />
                </div>

                <div className="message-input">
                    <div className="message-input__inner">
                        <input
                            className="message-input__field"
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button variant="dark" onClick={handleSendMessage} className="message-input__send">
                            <i className="bi bi-send-fill"></i>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete Chat Room Modal */}
            <Modal show={showDeleteChatRoomModal} onHide={() => setShowDeleteChatRoomModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to delete this chat room?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteChatRoomModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteChatRoom}>Delete</Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Message Modal */}
            <Modal show={showDeleteMessageModal} onHide={() => setShowDeleteMessageModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to delete this message?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteMessageModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteMessage}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ChatGRPC;