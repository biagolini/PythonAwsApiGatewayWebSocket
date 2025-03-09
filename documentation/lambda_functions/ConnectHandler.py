import boto3
import json
import datetime

# Initialize a DynamoDB resource
dynamodb_client = boto3.resource('dynamodb')

# Define DynamoDB table names
SESSION_HISTORY_TABLE_NAME = "SessionHistory"
ACTIVE_CONNECTIONS_TABLE_NAME = "ActiveConnections"

# Reference to the DynamoDB tables
session_history_table = dynamodb_client.Table(SESSION_HISTORY_TABLE_NAME)
active_connections_table = dynamodb_client.Table(ACTIVE_CONNECTIONS_TABLE_NAME)

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))  # Log the incoming event for debugging

    try:
        # Extract connection details from the API Gateway event
        connection_id = event['requestContext']['connectionId']
        source_ip = event['requestContext']['identity']['sourceIp']
        connected_at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        # Add the new connection to the ActiveConnections table
        active_connections_table.put_item(Item={
            'connection_id': connection_id
        })
        print(f"New connection stored: {connection_id}")

        # Store the connection details (IP and timestamp) in the SessionHistory table
        session_history_table.put_item(Item={
            'connection_id': connection_id,
            'source_ip': source_ip,
            'connected_at': connected_at
        })

        # Retrieve the list of all active connections
        response = active_connections_table.scan()
        connections = response.get('Items', [])

        # Construct API Gateway Management API endpoint for sending messages
        domain = event['requestContext']['domainName']
        stage = event['requestContext']['stage']
        api_endpoint = f"https://{domain}/{stage}"

        # Initialize API Gateway Management API client
        apigw_client = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=api_endpoint
        )

        # Construct message to notify existing users about the new connection
        formatted_message = f"A new user has joined the chat - {connection_id}"

        # Send notification to all active connections except the new one
        for conn in connections:
            conn_id = conn.get('connection_id')
            if conn_id and conn_id != connection_id:
                try:
                    apigw_client.post_to_connection(
                        ConnectionId=conn_id,
                        Data=json.dumps({'message': formatted_message})
                    )
                except Exception:
                    pass  # Ignore errors (e.g., stale connections)

    except Exception:
        return {'statusCode': 500, 'body': 'Internal server error'}
    
    return {'statusCode': 200, 'body': 'Connected successfully'}
