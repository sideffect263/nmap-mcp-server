# Nmap MCP Server (Smithery SDK)

This project implements an MCP-compliant (Model Context Protocol) server using the Smithery SDK. It wraps the Nmap network scanner, exposing its functionality as callable tools within the MCP framework.

## Features

-   **MCP Standard Endpoint (`/mcp`)**: Interacts with the server using JSON-RPC 2.0 requests.
-   **`nmapScan` Tool**: Initiates an Nmap scan on a specified target with configurable flags. Returns detailed scan results, including parsed XML output.
-   **`getInfo` Tool**: Provides basic information about the Nmap service and its capabilities.
-   Input validation for targets and Nmap flags to enhance security.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v16.x or later recommended)
-   [Nmap](https://nmap.org/download.html) installed and available in your system's PATH.

## Installation

1.  Clone the repository (or download the source code).
2.  Navigate to the project directory:
    ```bash
    cd your-project-directory
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Server

To start the server, run:

```bash
npm start
```

By default, the server will listen on `http://localhost:5001`. You can set the `PORT` environment variable to use a different port.

## Interacting with the Server (MCP)

All interactions with the server are done via the `/mcp` endpoint using JSON-RPC 2.0. You will send `POST` requests with a `Content-Type: application/json` header.

### Calling the `nmapScan` Tool

To initiate an Nmap scan:

**Request Body (JSON):**

```json
{
  "jsonrpc": "2.0",
  "id": 1, // Or any unique request ID
  "method": "tools/call",
  "params": {
    "name": "nmapScan",
    "arguments": {
      "target": "scanme.nmap.org",
      "flags": "-A -T4" // Optional, defaults to "-T4 -p 1-1000"
    }
  }
}
```

**Example using cURL:**

```bash
curl -X POST http://localhost:5001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "nmapScan",
      "arguments": {
        "target": "scanme.nmap.org",
        "flags": "-A"
      }
    }
  }'
```

**Expected Response Structure (Success):**

The server will respond with the results of the Nmap scan. The `content` array will contain a text object with a summary and the full JSON-parsed Nmap XML output.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Nmap Scan Results for scanme.nmap.org\n\nScan started: ...\n... (summary of open ports) ...\nScan completed: ...\n\nFull XML Output:\n{\n  \"nmaprun\": { ... }\n}"
      }
    ]
  }
}
```

If the scan fails or inputs are invalid, the `text` field will contain an error message.

### Calling the `getInfo` Tool

To get information about the service:

**Request Body (JSON):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "getInfo",
    "arguments": {}
  }
}
```

**Example using cURL:**

```bash
curl -X POST http://localhost:5001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getInfo",
      "arguments": {}
    }
  }'
```

**Expected Response Structure (Success):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Nmap Service Information:\n- Service: Network scanning using Nmap\n- Version: 1.0.0\n- Available Tools: nmapScan, getInfo\n- Session ID: N/A\n- Supported Targets: Domain names, IP addresses, CIDR notation\n- Security: Input validation and command sanitization enabled"
      }
    ]
  }
}
```

## Deployment on Smithery

To deploy this server on Smithery, you will typically need to:

1.  **Ensure Nmap is available in the Smithery execution environment.** This might involve custom Docker images or buildpacks if Nmap isn't pre-installed.
2.  **Define the startup command:** Smithery will need to know how to start the application (e.g., `npm start`).
3.  **Port configuration:** Smithery will expose the application, usually handling port mapping. Ensure the application listens on the port Smithery expects (often configured via the `PORT` environment variable, which this server supports via the `process.env.PORT || 5001` pattern).
4.  **Package the application:** This usually means providing the source code and `package.json` (and `package-lock.json`). Smithery will then build the application, installing dependencies.

Refer to the Smithery documentation for specific deployment instructions and how to configure services that adhere to the Model Context Protocol. 