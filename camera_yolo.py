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
print(f"✅ Connected to {WS_URL}")
print("🚀 YOLOv8n starting... Press 'q' to quit")

peak = 0
total = 0
last_current = 0     # ✅ เพิ่มบรรทัดนี้

try:
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        results = model(frame, classes=[0])
        num_people = len(results[0].boxes) if results and results[0].boxes is not None else 0

        # อัปเดต peak
        if num_people > peak:
            peak = num_people

        # ✅ อัปเดต total เฉพาะตอนมีคนเพิ่ม
        if num_people > last_current:
            total += (num_people - last_current)

        last_current = num_people

        payload = {
            "current": num_people,
            "peak": peak,
            "total": total,
            "busLine": BUS_LINE,
            "busNumber": BUS_NUMBER
        }
        ws.send(json.dumps(payload))

        annotated = results[0].plot()
        cv2.putText(annotated, f"Current: {num_people}  Peak: {peak}  Total: {total}",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("YOLOv8n Bus Counter", annotated)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        time.sleep(0.2)
finally:
    cap.release()
    cv2.destroyAllWindows()
    ws.close()
