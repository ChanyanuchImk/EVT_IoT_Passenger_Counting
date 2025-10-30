// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();


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

// ------------------- AWS S3 Setup -------------------
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const bucketName = "dashboardiot2";

// ------------------- Dashboard WS -------------------
dashboardWSS.on("connection", (ws, req) => {
  console.log("Dashboard connected:", req.socket.remoteAddress);
});

// ------------------- Camera WS -------------------
cameraWSS.on("connection", (ws, req) => {
  console.log("Camera connected:", req.socket.remoteAddress);

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("Data received:", data);

      // ส่งต่อข้อมูลไปยัง Dashboard ทุกตัว
      dashboardWSS.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(data));
        }
      });

      // ส่งข้อมูลไปยัง S3
      const key = `yolo-data/${Date.now()}.json`; // สร้างชื่อไฟล์ timestamp
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: "application/json",
      });

      await s3.send(command);
      console.log(`Data uploaded to S3: ${key}`);
    } catch (e) {
      console.error("Error:", e);
    }
  });

  ws.on("close", () => console.log("Camera disconnected"));
});
