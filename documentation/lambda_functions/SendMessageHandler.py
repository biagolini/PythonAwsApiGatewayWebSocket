import boto3
import json
import datetime
import uuid

# Initialize a DynamoDB resource
dynamodb_client = boto3.resource('dynamodb')

# Define DynamoDB table names
ACTIVE_CONNECTIONS_TABLE_NAME = "ActiveConnections"
MESSAGE_HISTORY_TABLE_NAME = "MessageHistory"

# Reference to the DynamoDB tables
active_connections_table = dynamodb_client.Table(ACTIVE_CONNECTIONS_TABLE_NAME)
message_history_table = dynamodb_client.Table(MESSAGE_HISTORY_TABLE_NAME)

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))  # Log incoming request for debugging
    print("Received context:", context)  # Log execution context

    # Extract message body from the event
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '')

    # Handle 'ping' messages with an immediate 'pong' response
    if message == 'ping':
        return {'statusCode': 200, 'body': json.dumps({'message': 'pong'})}
    
    errors = []  # List to store error messages, if any occur

    # Validate that the message is not empty
    if not message:
        return {'statusCode': 400, 'body': 'Message cannot be empty'}

    # Retrieve active connections from DynamoDB
    try:
        response = active_connections_table.scan()
        connections = response.get('Items', [])
    except Exception as e:
        error_message = f"Error scanning ActiveConnections table: {e}"
        print(error_message)
        errors.append(error_message)
        return {'statusCode': 500, 'body': json.dumps({'errors': errors})}

    # Construct API Gateway Management API endpoint for sending messages
    domain = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    api_endpoint = f"https://{domain}/{stage}"

    # Initialize API Gateway Management API client
    apigw_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=api_endpoint
    )

    # Get the current timestamp in UTC format
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Extract the sender's connection ID
    sender_connection_id = event['requestContext']['connectionId']

    # Format the message for broadcast
    formatted_message = f'[{now} - UTC]\n {sender_connection_id}  {message}\n'

    # Generate a unique message ID
    message_id = str(uuid.uuid4())

    # Store the message in the MessageHistory table
    try:
        message_history_table.put_item(
            Item={
                'message_id': message_id,
                'connection_id': sender_connection_id,
                'timestamp': now,
                'message': message
            }
        )
        print(f"Message logged successfully: {message_id}")
    except Exception as e:
        error_message = f"Error writing message to MessageHistory table: {e}"
        print(error_message)
        errors.append(error_message)

    # Broadcast the message to all active connections
    for connection in connections:
        connection_id = connection.get('connection_id')
        if connection_id:
            try:
                apigw_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=json.dumps({'message': formatted_message})
                )
            except Exception as e:
                error_message = f"Failed to send message to {connection_id}: {e}"
                print(error_message)
                errors.append(error_message)

    # Prepare the response message
    response_body = {
        'status': 'Message broadcast completed' if not errors else 'Message broadcast with errors',
        'errors': errors  # Include any errors encountered during execution
    }

    return {'statusCode': 200, 'body': json.dumps(response_body)}
