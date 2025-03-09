import boto3

# Initialize the DynamoDB client
dynamodb = boto3.client('dynamodb')

# Define table configurations
tables = [
    {
        "TableName": "MessageHistory",
        "AttributeDefinitions": [
            {"AttributeName": "message_id", "AttributeType": "S"}
        ],
        "KeySchema": [
            {"AttributeName": "message_id", "KeyType": "HASH"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    {
        "TableName": "SessionHistory",
        "AttributeDefinitions": [
            {"AttributeName": "connection_id", "AttributeType": "S"}
        ],
        "KeySchema": [
            {"AttributeName": "connection_id", "KeyType": "HASH"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    },
    {
        "TableName": "ActiveConnections",
        "AttributeDefinitions": [
            {"AttributeName": "connection_id", "AttributeType": "S"}
        ],
        "KeySchema": [
            {"AttributeName": "connection_id", "KeyType": "HASH"}
        ],
        "BillingMode": "PAY_PER_REQUEST"
    }
]

# Create tables
for table in tables:
    try:
        response = dynamodb.create_table(**table)
        print(f"Table {table['TableName']} is being created.")
    except Exception as e:
        print(f"Error creating table {table['TableName']}: {str(e)}")
