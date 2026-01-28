import GatewayPORT from "./GatewayConfig";

const gatewayPort = GatewayPORT;
const HubName: string = 'rt/signalr';

const ChatHubURL: string = `http://localhost:${gatewayPort}/${HubName}`;
export default ChatHubURL;