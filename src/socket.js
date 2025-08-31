const { io } = require("socket.io-client");

const socket = io("https://api.bingoogame.com", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Error:", err.message);
});
