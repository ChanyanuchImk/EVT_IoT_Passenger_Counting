import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table("ActiveConnections")

def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    print(f" Disconnected: {connection_id}")

    table.delete_item(Key={"connectionId": connection_id})
    print(" Removed connectionId from DynamoDB")

    return {"statusCode": 200}