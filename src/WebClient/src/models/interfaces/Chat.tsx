import UserDTO from '../dtos/UserDTO';

interface Chat {
    id: number;
    user1Id: string;
    user1: UserDTO;
    user2Id: string;
    user2: UserDTO;
}

export default Chat;