import UserDTO from '../dtos/UserDTO';
import Chat from './Chat';
import CommunicationTechnology from './CommunicationTechnology';

interface Message {
    id: number; 
    chatId: number;
    chat: Chat;
    content: string;
    senderId: string;
    sender: UserDTO;
    receiverId: string;
    receiver: UserDTO;
    communicationTechnologyId: number;
    communicationTechnology: CommunicationTechnology;
    timestamp: string;
}

export default Message;