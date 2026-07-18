export const MessageContentConfig: string = 'Wiadomosc123456789!';
// 60000 = 1min
export const MessageIntervalConfigInMs: number = 200;
// If <= 0, simulation runs until manually stopped.
export const SimulationTimeConfigInMs: number = 120000;

const SimulationConfig = {
	MessageContentConfig,
	MessageIntervalConfigInMs,
	SimulationTimeConfigInMs
};

export default SimulationConfig;