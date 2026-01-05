import UserDTO from '../dtos/UserDTO';
import Chat from './Chat';

interface Message {
    id: number; 
    chatId: number;
    chat: Chat;
    content: string;
    senderId: string;
    sender: UserDTO;
    receiverId: string;
    receiver: UserDTO;
    timestamp: string;
}

export default Message;