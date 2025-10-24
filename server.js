// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);

// --- WebSocket สำหรับ Dashboard (port 8080) ---
const dashboardWSS = new WebSocketServer({ server });

// --- WebSocket สำหรับ Python Camera (port 8081) ---
const cameraWSS = new WebSocketServer({ port: 8081 });

// ------------------- Serve Static Files -------------------
app.use(express.static(".")); // เสิร์ฟ index-2.html และ javascript.js
server.listen(8080, () => {
  console.log("Dashboard server running at http://localhost:8080");
});

// ------------------- Dashboard WS -------------------
dashboardWSS.on("connection", (ws, req) => {
  console.log("Dashboard connected:", req.socket.remoteAddress);
});

// ------------------- Camera WS -------------------
cameraWSS.on("connection", (ws, req) => {
  console.log("Camera connected:", req.socket.remoteAddress);

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("Data received:", data);

      // ส่งต่อข้อมูลไปยัง Dashboard ทุกตัว
      dashboardWSS.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (e) {
      console.error("JSON parse error", e);
    }
  });

  ws.on("close", () => console.log("Camera disconnected"));
});
