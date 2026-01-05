import axios from 'axios';
import ApiURL from '../../config/ApiConfig';
import AccountService from './AccountService';
import Message from '../../models/interfaces/Message';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';

const MessageService = {
    async getMessageById(messageId: number): Promise<Message> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Message>(`${ApiURL}/messages/${messageId}`, {
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
            const response = await axios.get<Message[]>(`${ApiURL}/messages`, {
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
            const response = await axios.get<number>(`${ApiURL}/messages/count`, {
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
            const response = await axios.get<Message[]>(`${ApiURL}/messages/chat/${chatId}`, {
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

    async getMessagesForChatCount(chatId: number): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiURL}/messages/chat/${chatId}/count`, {
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
            const response = await axios.get<string>(`${ApiURL}/messages/chat/${chatId}/last-message-date`, {
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

    async sendMessage(dto: MessageSendDTO): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.post(`${ApiURL}/messages`, dto, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
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
            await axios.delete(`${ApiURL}/messages/${messageId}`, {
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