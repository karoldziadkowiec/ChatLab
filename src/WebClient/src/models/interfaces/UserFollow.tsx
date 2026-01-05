import UserDTO from '../dtos/UserDTO';

interface UserFollow {
    id: number;
    followerId: string;
    follower: UserDTO;
    followedId: string;
    followed: UserDTO;
}

export default UserFollow;