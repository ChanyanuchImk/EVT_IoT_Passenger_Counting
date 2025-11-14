import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table("ActiveConnections")

def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    print(f" New connection: {connection_id}")

    table.put_item(Item={"connectionId": connection_id})
    print(" Stored connectionId in DynamoDB")

    return {"statusCode": 200}