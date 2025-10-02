import { io } from "socket.io-client";

const socket = io("https://bingo-backend-8929.onrender.com", {
  transports: ["websocket"],
});

export default socket;
