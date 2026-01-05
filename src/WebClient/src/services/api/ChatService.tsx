import axios from 'axios';
import ApiURL from '../../config/ApiConfig';
import AccountService from './AccountService';
import ChatModel from '../../models/interfaces/Chat';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';

const ChatService = {
    async getChatById(chatId: number): Promise<ChatModel> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<ChatModel>(`${ApiURL}/chats/${chatId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching chat, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getChats(): Promise<ChatModel[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<ChatModel[]>(`${ApiURL}/chats`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all chats, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getChatCount(): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiURL}/chats/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching chat count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getChatIdBetweenUsers(user1Id: string, user2Id: string): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiURL}/chats/between/${user1Id}/${user2Id}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching chat id, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async createChat(dto: ChatCreateDTO): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.post(`${ApiURL}/chats`, dto, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error creating new chat, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async deleteChat(chatId: number): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.delete(`${ApiURL}/chats/${chatId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error deleting chat, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async exportChatsToCsv(): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();

            const response = await axios.get(`${ApiURL}/chats/export`, {
                headers: {
                    'Authorization': authorizationHeader
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'chats.csv');

            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error exporting chats to CSV, details:", error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }
};

export default ChatService;