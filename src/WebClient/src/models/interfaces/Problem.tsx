import UserDTO from '../dtos/UserDTO';

interface Problem {
    id: number;
    title: string;
    description: string;
    creationDate: string;
    isSolved: boolean;
    requesterId: string;
    requester: UserDTO;
}

export default Problem;