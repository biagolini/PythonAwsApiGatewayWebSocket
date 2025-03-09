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

    # Extract the connection ID from the API Gateway event
    connection_id = event['requestContext']['connectionId']
    disconnected_at_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    errors = []  # List to store error messages, if any occur
    duration_seconds = None  # Placeholder for session duration calculation

    # Retrieve session details for the disconnected user
    try:
        response = session_history_table.get_item(Key={'connection_id': connection_id})
        session_item = response.get('Item')

        if session_item and 'connected_at' in session_item:
            # Calculate the duration of the session (time spent connected)
            connected_at_str = session_item['connected_at']
            connected_at = datetime.datetime.strptime(connected_at_str, '%Y-%m-%dT%H:%M:%SZ')
            disconnected_at = datetime.datetime.strptime(disconnected_at_str, '%Y-%m-%dT%H:%M:%SZ')
            duration_seconds = int((disconnected_at - connected_at).total_seconds())
        else:
            duration_seconds = None  # No valid connection time found

    except Exception as e:
        error_message = f"Error retrieving session history: {e}"
        print(error_message)
        errors.append(error_message)

    # Update the session record with the disconnection timestamp and session duration
    try:
        session_history_table.update_item(
            Key={'connection_id': connection_id},
            UpdateExpression="SET disconnected_at = :d, duration_seconds = :s",
            ExpressionAttributeValues={
                ':d': disconnected_at_str,
                ':s': duration_seconds
            }
        )
    except Exception as e:
        error_message = f"Error updating session history: {e}"
        print(error_message)
        errors.append(error_message)

    # Retrieve all active connections to notify other users
    try:
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

        # Construct a message notifying others that the user has disconnected
        formatted_message = f"User {connection_id} has left the chat."

        # Send notification to all active connections except the disconnected user
        for conn in connections:
            conn_id = conn.get('connection_id')
            if conn_id and conn_id != connection_id:
                try:
                    apigw_client.post_to_connection(
                        ConnectionId=conn_id,
                        Data=json.dumps({'message': formatted_message})
                    )
                except Exception as e:
                    error_message = f"Failed to notify user {conn_id} about disconnection: {e}"
                    print(error_message)
                    errors.append(error_message)

    except Exception as e:
        error_message = f"Error retrieving active connections: {e}"
        print(error_message)
        errors.append(error_message)

    # Remove the disconnected user from the active connections table
    try:
        active_connections_table.delete_item(Key={'connection_id': connection_id})
    except Exception as e:
        error_message = f"Error deleting active connection: {e}"
        print(error_message)
        errors.append(error_message)

    # Prepare the response message
    response_body = {
        'status': 'Disconnected successfully' if not errors else 'Disconnected with errors',
        'errors': errors  # Include errors if any occurred
    }

    return {'statusCode': 200, 'body': json.dumps(response_body)}
