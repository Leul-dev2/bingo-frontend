import { io } from "socket.io-client"; // ✅ browser-compatible

const socket = io("https://api.bingoogame.com", {
  transports: ["websocket"], // forces WebSocket, avoids polling fallback
  autoConnect: false          // optional, connect manually if needed
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error:", err.message);
});

export default socket;
