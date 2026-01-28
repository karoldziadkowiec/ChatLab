import GatewayPORT from "./GatewayConfig";

const gatewayPort = GatewayPORT;
const HubName: string = 'rt/ws';

// Use ws:// for HTTP and wss:// for HTTPS automatically
const scheme = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss' : 'ws';
const ChatHubURL: string = `${scheme}://localhost:${gatewayPort}/${HubName}`;
export default ChatHubURL;