import axios from 'axios';
import ApiCoreURL from '../../config/ApiCoreConfig';
import AccountService from './AccountService';
import UserFollow from '../../models/interfaces/UserFollow';
import UserFollowCreateDTO from '../../models/dtos/UserFollowCreateDTO';

const UserFollowService = {
    async getUserFollowById(userFollowId: number): Promise<UserFollow> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<UserFollow>(`${ApiCoreURL}/user-followers/${userFollowId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching user follow, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUserFollowers(): Promise<UserFollow[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<UserFollow[]>(`${ApiCoreURL}/user-followers`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all user followers, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUserFollowCount(): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/user-followers/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching user follow count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUserFollowedForUser(userId: string): Promise<UserFollow[]> {
        try {
        const authorizationHeader = await AccountService.getAuthorizationHeader();
        const response = await axios.get<UserFollow[]>(`${ApiCoreURL}/user-followers/followed/${userId}`, {
            headers: {
            'Authorization': authorizationHeader
            }
        });
        return response.data;
        }
        catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error fetching user's user followed, details:", error.response?.data || error.message);
        }
        else {
            console.error('Unexpected error:', error);
        }
        throw error;
        }
    },

    async getUserFollowedForUserCount(userId: string): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/user-followers/followed/count/${userId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching user followed for user count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUserFollowersForUser(userId: string): Promise<UserFollow[]> {
        try {
        const authorizationHeader = await AccountService.getAuthorizationHeader();
        const response = await axios.get<UserFollow[]>(`${ApiCoreURL}/user-followers/followers/${userId}`, {
            headers: {
            'Authorization': authorizationHeader
            }
        });
        return response.data;
        }
        catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error fetching user's user followers, details:", error.response?.data || error.message);
        }
        else {
            console.error('Unexpected error:', error);
        }
        throw error;
        }
    },

    async getUserFollowersForUserCount(userId: string): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/user-followers/followers/count/${userId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching user followers for user count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUserFollowIdBetweenUsers(followerId: string, followedId: string): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiCoreURL}/user-followers/between/${followerId}/${followedId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching user follow id, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async createUserFollow(dto: UserFollowCreateDTO): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.post(`${ApiCoreURL}/user-followers`, dto, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error creating new user follow, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async removeUserFollow(userFollowId: number): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.delete(`${ApiCoreURL}/user-followers/${userFollowId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error deleting user follow, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }
};

export default UserFollowService;