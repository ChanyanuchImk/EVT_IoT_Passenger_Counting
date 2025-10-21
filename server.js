// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);

// --- WebSocket #1 สำหรับ Dashboard ---
const dashboardWSS = new WebSocketServer({ server });

// --- WebSocket #2 สำหรับ Python Camera (แยกพอร์ต) ---
const cameraWSS = new WebSocketServer({ port: 8081 });

// ------------------- Express serve -------------------
app.use(express.static("."));
server.listen(8080, () => {
  console.log("🚀 Dashboard server running at http://localhost:8080");
});

// เมื่อ dashboard เชื่อม
dashboardWSS.on("connection", (ws, req) => {
  console.log("🖥️ Dashboard connected:", req.socket.remoteAddress);
});

// เมื่อ YOLO Python เชื่อม
cameraWSS.on("connection", (ws, req) => {
  console.log("📸 Camera connected:", req.socket.remoteAddress);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("👥 Data received:", data);

      // broadcast ไปยัง dashboard ทุกตัว
      dashboardWSS.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (e) {
      console.error("❌ JSON parse error", e);
    }
  });

  ws.on("close", () => console.log("📸 Camera disconnected"));
});
