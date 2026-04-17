import axios from 'axios';
import ApiCoreURL from '../../config/ApiCoreConfig';
import AccountService from './AccountService';
import Message from '../../models/interfaces/Message';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';

const MessageService = {
    async getMessageById(messageId: number): Promise<Message> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Message>(`${ApiCoreURL}/messages/${messageId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching message, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getAllMessages(): Promise<Message[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Message[]>(`${ApiCoreURL}/messages`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all messages, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getAllMessagesCount(): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/messages/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching messages count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getMessagesForChat(chatId: number): Promise<Message[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Message[]>(`${ApiCoreURL}/messages/chat/${chatId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching messages for chat, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getMessagesForChatAfterId(chatId: number, afterMessageId: number): Promise<Message[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Message[]>(`${ApiCoreURL}/messages/chat/${chatId}/after/${afterMessageId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching messages for chat after id, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getMessagesForChatCount(chatId: number): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/messages/chat/${chatId}/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching messages for chat count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getLastMessageDateForChat(chatId: number): Promise<string> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<string>(`${ApiCoreURL}/messages/chat/${chatId}/last-message-date`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching last message date, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async sendMessage(dto: MessageSendDTO, baseUrlOverride?: string): Promise<Message> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const baseUrl = baseUrlOverride ?? ApiCoreURL;
            const response = await axios.post<Message>(`${baseUrl}/messages`, dto, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error creating new message, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async deleteMessage(messageId: number): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.delete(`${ApiCoreURL}/messages/${messageId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error deleting message, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }
};

export default MessageService;