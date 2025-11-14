import json
import boto3
import os

ddb = boto3.resource("dynamodb")
table = ddb.Table("ActiveConnections")

def lambda_handler(event, context):
    print(" Received event from IoT Core:")
    print(json.dumps(event, indent=2))

    # Parse payload
    try:
        payload = json.loads(event.get("payload", "{}")) if "payload" in event else event
    except Exception:
        payload = event

    print(" Parsed payload:", payload)

    # WebSocket endpoint (https://.../)
    ws_endpoint = os.environ["WS_ENDPOINT"]
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=ws_endpoint)

    #  อ่าน connection_id ทั้งหมดจาก DynamoDB
    connections = table.scan().get("Items", [])
    print(f" Found {len(connections)} active connections")

    for conn in connections:
        cid = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=json.dumps(payload))
            print(f" Sent to connection {cid}")
        except apigw.exceptions.GoneException:
            print(f" Connection gone: {cid}, deleting...")
            table.delete_item(Key={"connectionId": cid})
        except Exception as e:
            print(f" Error sending to {cid}: {e}")

    return {"statusCode": 200}