import boto3
import json

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))  # Log the incoming request for debugging
    print("Received context:", context)  # Log execution context

    # Extract the connection ID of the client that sent the request
    connection_id = event['requestContext']['connectionId']

    # Construct the API Gateway WebSocket endpoint URL
    domain = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    api_endpoint = f"https://{domain}/{stage}"

    # Initialize API Gateway Management API client
    apigw_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=api_endpoint
    )

    # Define the error response message to be sent to the client
    response_message = {
        "error": "Invalid request",
        "message": "The requested action is not recognized. Please check your WebSocket commands."
    }    

    # Attempt to send the error message to the client
    try:
        apigw_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(response_message)
        )
    except Exception as e:
        # Log the error if message sending fails
        print(f"Error sending message to connection {connection_id}: {e}")

    # Return a 200 OK response, indicating that the function executed successfully
    return {'statusCode': 200}
