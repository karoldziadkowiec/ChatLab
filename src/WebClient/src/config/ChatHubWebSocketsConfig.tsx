const ApiPORT: number = 8001;

const HubName: string = 'ws';

const ChatHubURL: string = `wss://localhost:${ApiPORT}/${HubName}`;
export default ChatHubURL;