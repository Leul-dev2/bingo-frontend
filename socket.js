import { io } from "socket.io-client";

const socket = io("https://api.bingoogame.com", {
  transports: ["websocket"],
});

export default socket;
