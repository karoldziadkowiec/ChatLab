import GatewayPORT from "./GatewayConfig";

const gatewayPort = GatewayPORT;
const ApiProblemURL: string = `http://localhost:${gatewayPort}/api/problems`;

export default ApiProblemURL;
