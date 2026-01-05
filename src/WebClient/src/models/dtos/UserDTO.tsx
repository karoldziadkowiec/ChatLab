interface UserDTO {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    location: string;
    creationDate: string;
}

export default UserDTO;