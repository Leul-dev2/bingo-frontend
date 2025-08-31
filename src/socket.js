import { io } from "socket.io-client";

const SOCKET_URL = "https://api.bingoogame.com";

console.log(`[Frontend] Attempting to connect to: ${SOCKET_URL}`);

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export default socket;