import GatewayPORT from "./GatewayConfig";

const gatewayPort = GatewayPORT;
const ApiCoreURL: string = `http://localhost:${gatewayPort}/api/core`;

export default ApiCoreURL;