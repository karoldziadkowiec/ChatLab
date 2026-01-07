interface ChatCreateDTO {
    chatId: number;
    senderId: string;
    receiverId: string;
    communicationTechnologyId: number;
    content: string;
}

export default ChatCreateDTO;