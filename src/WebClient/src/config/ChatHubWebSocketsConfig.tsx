const ApiPORT: number = 8001;

const HubName: string = 'ws';

// Use ws:// for HTTP and wss:// for HTTPS automatically
const scheme = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss' : 'ws';
const ChatHubURL: string = `${scheme}://localhost:${ApiPORT}/${HubName}`;
export default ChatHubURL;