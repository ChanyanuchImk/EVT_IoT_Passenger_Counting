from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json, time, random
import websocket


# ✅ ใช้ endpoint ของ IoT Core (ไม่ใช่ของ S3)
AWS_ENDPOINT = "a36wvzhds26ihu-ats.iot.us-east-1.amazonaws.com"
AWS_ROOT_CA = "AmazonRootCA1.pem"
AWS_PRIVATE_KEY = "c27baf35a8848da6f82c661415dc9ef65f54abed0bf9219d7910eadfcc1e01a6-private.pem.key"
AWS_CERT = "c27baf35a8848da6f82c661415dc9ef65f54abed0bf9219d7910eadfcc1e01a6-certificate.pem.crt"
AWS_TOPIC = "bus/line2/status"

# --- สร้าง MQTT Client ---
client = AWSIoTMQTTClient("PiPublisher")
client.configureEndpoint(AWS_ENDPOINT, 8883)
client.configureCredentials(AWS_ROOT_CA, AWS_PRIVATE_KEY, AWS_CERT)

# --- เชื่อมต่อกับ IoT Core ---
client.connect()
print("✅ Connected to AWS IoT Core")

# --- ส่งข้อมูลจำลองทุก 3 วิ ---
while True:
    payload = {
        "current": random.randint(0, 20),
        "peak": random.randint(20, 50),
        "total": random.randint(100, 500)
    }
    print("📤 Publishing:", payload)
    client.publish(AWS_TOPIC, json.dumps(payload), 0)
    time.sleep(3)
