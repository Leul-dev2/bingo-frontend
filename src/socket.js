import { io } from "socket.io-client";

const socket = io("https://api.bingoogame.com", {
  autoConnect: false, // we'll connect manually
});

export default socket;
