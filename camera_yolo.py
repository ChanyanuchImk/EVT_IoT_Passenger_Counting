from ultralytics import YOLO
import cv2, json, time, websocket

BUS_LINE = "สาย 2"
BUS_NUMBER = "127"
WS_URL = "ws://localhost:8081"

model = YOLO("yolov8n.pt")

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

ws = websocket.WebSocket()
ws.connect(WS_URL)
print(f"Connected to {WS_URL}")
print("YOLOv8n starting... Press 'q' to quit")

# -------------------- ตัวแปร --------------------
peak = 0
total = 0
current = 0
tracks = {}   # {id: last_zone}
zone_split = 0.5   # ครึ่งจอ: <0.5 = Zone A, >=0.5 = Zone B

try:
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        h, w, _ = frame.shape
        mid_x = int(w * zone_split)
        cv2.line(frame, (mid_x, 0), (mid_x, h), (0, 255, 255), 2)  # เส้นแบ่งโซน

        # ตรวจจับและติดตามคน
        results = model.track(frame, classes=[0], persist=True)  # ใช้ track() เพื่อให้มี ID
        num_people = 0

        if results and results[0].boxes.id is not None:
            ids = results[0].boxes.id.cpu().tolist()
            boxes = results[0].boxes.xywh.cpu().tolist()

            for pid, (x, y, bw, bh) in zip(ids, boxes):
                num_people += 1
                center_x = x / w

                # โซนปัจจุบัน
                zone = "A" if center_x < zone_split else "B"
                last_zone = tracks.get(pid)

                # ตรวจจับการข้ามโซน
                if last_zone and last_zone != zone:
                    if last_zone == "A" and zone == "B":
                        total += 1      # คนเข้า
                        current += 1
                        print(f"ID {pid} เข้ารถ")
                    elif last_zone == "B" and zone == "A":
                        current = max(current - 1, 0)
                        print(f"ID {pid} ออกรถ")

                tracks[pid] = zone

                # วาดกล่อง
                color = (0, 255, 0) if zone == "B" else (255, 0, 0)
                x1, y1 = int(x - bw/2), int(y - bh/2)
                x2, y2 = int(x + bw/2), int(y + bh/2)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"ID {pid} {zone}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # อัปเดต peak
        if current > peak:
            peak = current

        payload = {
            "current": current,
            "peak": peak,
            "total": total,
            "busLine": BUS_LINE,
            "busNumber": BUS_NUMBER
        }
        ws.send(json.dumps(payload))

        # แสดงภาพ
        cv2.putText(frame, f"Cur:{current}  Peak:{peak}  Total:{total}",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
        cv2.imshow("YOLOv8n Zone Tracking", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        time.sleep(0.1)

finally:
    cap.release()
    cv2.destroyAllWindows()
    ws.close()
