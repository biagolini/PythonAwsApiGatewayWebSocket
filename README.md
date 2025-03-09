# WebSocket Chat Application with AWS API Gateway & Lambda

This repository provides a **serverless real-time chat application** built with **AWS API Gateway (WebSocket), AWS Lambda, and DynamoDB**. The front-end is a simple **HTML, JavaScript, and CSS-based** interface that enables real-time messaging between clients.

Check this project at GitHub Pages: [https://biagolini.github.io/PythonAwsApiGatewayWebSocket/](https://biagolini.github.io/PythonAwsApiGatewayWebSocket/)

## Project Overview

This project demonstrates:
- **WebSocket API Gateway integration** for real-time communication.
- **AWS Lambda functions** handling connection, disconnection, and messaging events.
- **DynamoDB storage** for active connections, session logs, and message history.
- **A front-end chat client** with automatic connection, session tracking, and an optional auto-disconnect feature.
- **Heartbeat messages** to keep WebSocket connections active and prevent premature disconnection by AWS API Gateway.


### Architecture Overview

This project is **inspired** by the AWS tutorial and extends its functionality to explore additional interactions with WebSocket routes. Enhancements include a chat history, with ip identification of users, multi-table DynamoDB architecture, and refined session tracking. The original architecture can be found [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-chat-app.html).

The architecture consists of an API Gateway WebSocket endpoint that routes incoming WebSocket requests based on predefined routes. These routes trigger AWS Lambda functions, which handle different aspects of the chat system. The primary routes include:

- **`$connect` Route**: Triggers the `ConnectHandler` Lambda function, which registers the new client connection in the `ActiveConnections` table and logs session details in the `SessionHistory` table.
- **`$disconnect` Route**: Triggers the `DisconnectHandler` Lambda function, which removes the client connection from the `ActiveConnections` table and updates session details in the `SessionHistory` table.
- **`sendmessage` Route**: Triggers the `SendMessageHandler` Lambda function, which processes incoming chat messages and stores them in the `MessageHistory` table.
- **`$default` Route**: Triggers the `DefaultHandler` Lambda function to manage unexpected messages or routes.

Each Lambda function interacts with Amazon DynamoDB for data persistence, ensuring efficient storage and retrieval of connection states, session details, and chat messages. The API Gateway Management API enables broadcasting messages back to connected clients.

The figure below visually represents the architecture.

![Architecture](documentation/img/architecture.png)



---

## Repository Structure

```
├── index.html                 # Front-end interface for the chat
├── script.js                  # WebSocket connection and UI logic
├── style.css                  # Styling for the chat UI
├── documentation/             # Documentation & backend code
│   ├── lambda_functions/      # AWS Lambda function implementations
│   ├── dynamo_setup.py        # Script to create DynamoDB tables
│   ├── WebSocket_Tutorial.md  # Step-by-step implementation guide
└── README.md                  # Project documentation
```

---

## Prerequisites

Before using this project, ensure you have:
- An **AWS account** with permissions to use API Gateway, Lambda, and DynamoDB.
- Basic knowledge of **JavaScript, Python, and AWS services**.

---

## Step 1: Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/biagolini/WebSocketChatAWS.git
```

---

## Step 2: Deploy the Backend (AWS WebSocket API & Lambda)

Follow the steps outlined in **`documentation/WebSocket_Tutorial.md`** to:
1. **Create DynamoDB tables** for connection tracking and chat history.
2. **Deploy AWS Lambda functions** for handling WebSocket connections.
3. **Set up API Gateway (WebSocket)** to route WebSocket events.
4. **Integrate Lambda functions with API Gateway WebSocket routes.**
5. **Deploy the WebSocket API** and obtain the WebSocket connection URL.

---

## Step 3: Configure and Run the Front-End

1. **Open `index.html`** in a browser.
2. **Enter the WebSocket API URL** obtained from Step 2.
3. Click **Connect** to establish a WebSocket connection.
4. Start sending messages in real-time to connected users.

### Features
- **Automatic Reconnection**: If a previous WebSocket address is stored, the app automatically reconnects.
- **Session Tracking**: Displays connection ID, timestamp, and a live session timer.
- **Heartbeat Ping**: Sends a message every 30 seconds to prevent disconnection.
- **Auto-Disconnect**: Users can set a time limit for their session, after which they are automatically disconnected.

---

## Contributing

Contributions are welcome! Feel free to:
- Report issues or suggest improvements.
- Fork the repository and submit pull requests.
- Enhance the front-end UI or optimize backend functionality.

---

## License

This project is open-source and available under the **MIT License**. You are free to modify and use it, but must adhere to AWS service usage policies.

For the complete implementation and updates, check the [GitHub repository](https://github.com/biagolini/WebSocketChatAWS).

