import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from "../../services/api/AccountService";
import TimeService from "../../services/time/TimeService";
import ChatService from "../../services/api/ChatService";
import MessageService from "../../services/api/MessageService";
import CommunicationTechnologyService from '../../services/api/CommunicationTechnologyService';
import ChatHubWebSockets from "../../services/chatWebSockets/ChatHubWebSockets";
import CommunicationTechnologyConst from "../../models/enums/CommunicationTechnologyConst";
import { MessageContentConfig, MessageIntervalConfigInMs, SimulationTimeConfigInMs } from '../../config/SimulationConfig';
import Chat from "../../models/interfaces/Chat";
import Message from "../../models/interfaces/Message";
import UserDTO from "../../models/dtos/UserDTO";
import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import '../../App.css';
import "../../styles/chat/Chat.css";

const ChatWebSockets = () => {
    const METRICS_TOAST_ID = 'websockets-send-metrics';
    const THROUGHPUT_WINDOW_MS = 10_000;
    const [technologyName, setTechnologyName] = useState<string | null>(null);
    const [technologyId, setTechnologyId] = useState<number | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<Chat | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [wsClient, setWsClient] = useState<ChatHubWebSockets | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [newMessage, setNewMessage] = useState("");

    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
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

    // Used for accurate latency measurement: correlate clientMessageId with echoed "receive".
    const receivedClientMessageIdsRef = useRef<Set<string>>(new Set());
    const receiveWaitersRef = useRef<Map<string, () => void>>(new Map());

    const waitForReceive = useCallback((clientMessageId: string, timeoutMs: number): Promise<void> => {
        if (receivedClientMessageIdsRef.current.has(clientMessageId)) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                receiveWaitersRef.current.delete(clientMessageId);
                reject(new Error('Timed out waiting for receive echo.'));
            }, timeoutMs);

            receiveWaitersRef.current.set(clientMessageId, () => {
                window.clearTimeout(timeout);
                receiveWaitersRef.current.delete(clientMessageId);
                resolve();
            });
        });
    }, []);

    // Load user + chat metadata
    useEffect(() => {
        const load = async () => {
            try {
                const _userId = await AccountService.getId();
                if (_userId)
                    setUserId(_userId);

                if (id) {
                    const chat = await ChatService.getChatById(Number(id));
                    setChatData(chat);

                    // When current user is not a participant, still allow entering the room (load-testing mode).
                    // We keep the header stable by showing one of the chat participants as the "receiver".
                    if (_userId && chat.user1Id === _userId) {
                        setUser(chat.user1);
                        setReceiver(chat.user2);
                    } else if (_userId && chat.user2Id === _userId) {
                        setUser(chat.user2);
                        setReceiver(chat.user1);
                    } else {
                        setUser(null);
                        setReceiver(chat.user1 ?? chat.user2);
                    }

                    const msgs = await MessageService.getMessagesForChat(Number(id));
                    setMessages(msgs);

                    const techName = CommunicationTechnologyConst.WebSockets;
                    setTechnologyName(techName);
                    try {
                        const _technologyId = await CommunicationTechnologyService.getCommunicationTechnologyId(techName);
                        setTechnologyId(_technologyId);
                    } catch (e) {
                        console.error('Failed to resolve communication technology id:', e);
                    }
                }
            } catch (error) {
                toast.error("Failed to load chat data");
            }
        };

        load();
    }, [id]);

    // Open WebSocket connection
    useEffect(() => {
        if (id && userId) {
            const client = new ChatHubWebSockets(
                Number(id),
                userId,
                (msg, envelope) => {
                    const clientMessageId = envelope?.clientMessageId;
                    if (clientMessageId) {
                        receivedClientMessageIdsRef.current.add(clientMessageId);
                        const waiter = receiveWaitersRef.current.get(clientMessageId);
                        if (waiter) {
                            try { waiter(); } catch { /* ignore */ }
                        }
                    }

                    setMessages(prev => {
                        // Deduplicate by message id
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                },
                (errEnvelope) => {
                    // Surface server-side rate limiting etc. during load tests.
                    console.warn('WS server error envelope:', errEnvelope);
                }
            );

            client.connect()
                .then(() => setWsClient(client))
                .catch(err => toast.error("Cannot connect to WebSocket"));

            return () => client.disconnect();
        }
    }, [id, userId]);

    useEffect(() => {
        return () => {
            // Stop background traffic loop on unmount/leave.
            autoSendRunIdRef.current += 1;
            setIsAutoSending(false);
        };
    }, []);


    useEffect(() => {
        if (messagesEndRef.current)
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


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
            if (!wsClient) {
                toast.error('WebSocket client not ready.');
                throw new Error('WebSocket client not ready.');
            }

            const senderId = userId;
            const receiverId = resolveReceiverIdForSend();
            if (!chatData?.id || !senderId || !receiverId || !technologyId) {
                toast.error('Unable to send message. Missing required data.');
                throw new Error('Missing required data.');
            }

            const startTime = performance.now();
            const clientMessageId = wsClient.createClientMessageId();
            const waitPromise = waitForReceive(clientMessageId, 5000);

            const messageSendDTO: MessageSendDTO = {
                chatId: chatData.id,
                senderId,
                receiverId,
                communicationTechnologyId: technologyId,
                content
            };

            const sent = wsClient.send(messageSendDTO, clientMessageId);
            if (!sent) {
                throw new Error('Failed to send on socket (not open).');
            }

            let echoMs: number | null = null;
            try {
                await waitPromise;
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
                const toastMessage = `WebSockets (${mode}): time ${echoRounded} ms | throughput ${throughput.toFixed(2)} msg/s`;
                showMetricsToast(toastMessage);
                console.log(`WebSockets send metrics (${mode}): time=${echoRounded}ms, throughput=${throughput.toFixed(2)} msg/s`);
                return;
            }

            // Timeout path
            const throughput = getCurrentThroughputMsgPerSec();
            const toastMessage = `WebSockets (${mode}): time timeout | throughput ${throughput.toFixed(2)} msg/s`;
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
    }, [wsClient, userId, chatData?.id, technologyId, resolveReceiverIdForSend, waitForReceive, getCurrentThroughputMsgPerSec, showMetricsToast]);

    const startAutoSend = useCallback(async () => {
        if (isAutoSending) return;

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
    }, [isAutoSending, sendMessageWithMetrics]);

    const stopAutoSend = useCallback(() => {
        autoSendRunIdRef.current += 1;
        setIsAutoSending(false);
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            await sendMessageWithMetrics(newMessage, 'manual');
            setNewMessage('');
            // Do not refresh via REST — the message will arrive via WS
        }
        catch (error) {
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
            const _messages = await MessageService.getMessagesForChat(chatData!.id);
            setMessages(_messages);
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message.');
        }
    };


    if (!chatData) {
        return <div><h2><strong>No chat found...</strong></h2></div>;
    }


    return (
        <div className="Chat">
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - WebSockets</h1>
            <div className="chat-container">
                <div className="chat-header sticky-top">
                    <div className="chat-header__left">
                        <div className="chat-avatar">
                            {`${receiver?.firstName?.[0] ?? ''}${receiver?.lastName?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div className="chat-title">
                            <div className="chat-name">{receiver ? `${receiver.firstName} ${receiver.lastName}` : 'Receiver'}</div>
                            <div className="chat-subtitle">Chat via WebSockets</div>
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
                                            <span className="msg-time">{TimeService.formatDateToEURWithHour(message.timestamp)} ({message.communicationTechnology?.name ?? technologyName ?? 'WebSockets'})</span>
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

export default ChatWebSockets;