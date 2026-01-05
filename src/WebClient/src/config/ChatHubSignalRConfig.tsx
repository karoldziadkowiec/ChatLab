const ApiPORT: number = 8001;

const HubName: string = 'signalr-chathub';

const ChatHubURL: string = `http://localhost:${ApiPORT}/${HubName}`;
export default ChatHubURL;