# Nmap MCP Server

This project implements an MCP-compliant (Model Context Protocol) server that wraps the Nmap network scanner. It allows users to initiate Nmap scans via a simple HTTP API and retrieve structured JSON results.

## Features

-   **`/introspect`**: Provides metadata about the Nmap tool, including input and output schemas.
-   **`/invoke`**: Initiates an Nmap scan on a specified target with optional flags. Returns a task ID.
-   **`/result/:taskId`**: Retrieves the status and results of an Nmap scan. Results are provided in JSON format (parsed from Nmap's XML output).
-   In-memory task tracking.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v14.x or later recommended)
-   [Nmap](https://nmap.org/download.html) installed and available in your system's PATH.

## Installation

1.  Clone the repository (or download the source code).
2.  Navigate to the project directory:
    ```bash
    cd nmap-mcp-server
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

By default, the server will listen on `http://localhost:3000`. You can set the `PORT` environment variable to use a different port.

## API Endpoints

### `GET /introspect`

Returns metadata about the Nmap scanner.

**Example Response:**

```json
{
  "name": "Nmap Scanner",
  "description": "Scans a target using Nmap and returns structured results.",
  "input_schema": {
    "type": "object",
    "properties": {
      "target": { "type": "string", "description": "Domain or IP address to scan" },
      "flags": { "type": "string", "description": "Nmap flags (e.g., -T4 -p 1-1000)", "default": "-T4 -p 1-1000" }
    },
    "required": ["target"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "taskId": { "type": "string" },
      "status": { "type": "string" }
      // The actual result for a completed task will be under a 'result' field
      // containing the parsed Nmap XML output.
    }
  }
}
```

### `POST /invoke`

Initiates an Nmap scan.

**Request Body (JSON):**

```json
{
  "target": "scanme.nmap.org",
  "flags": "-A -T4" // Optional, defaults to "-T4 -p 1-1000"
}
```

**Success Response (202 Accepted):**

```json
{
  "taskId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "pending",
  "message": "Nmap scan initiated"
}
```

**Error Response (400 Bad Request if target is missing):**

```json
{
  "error": "Target is required"
}
```

### `GET /result/:taskId`

Retrieves the status and result of a scan.

**URL Parameter:**

-   `taskId`: The ID of the task returned by `/invoke`.

**Success Response (200 OK - Scan Completed):**

```json
{
  "taskId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "completed",
  "result": {
    "nmaprun": {
      // ... full Nmap XML output parsed as JSON ...
    }
  }
}
```

**Pending Response (202 Accepted - Scan In Progress):**

```json
{
  "taskId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "pending",
  "message": "Nmap scan is still in progress."
}
```

**Error Response (404 Not Found - Task Not Found):**

```json
{
  "error": "Task not found"
}
```

**Error Response (500 Internal Server Error - Scan Failed):**

```json
{
  "taskId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "failed",
  "error": "Nmap execution failed: ..." // or "Failed to parse Nmap XML output: ..."
}
```

## Deployment on Smithery

To deploy this server on Smithery, you will typically need to:

1.  **Ensure Nmap is available in the Smithery execution environment.** This might involve custom Docker images or buildpacks if Nmap isn't pre-installed.
2.  **Define the startup command:** Smithery will need to know how to start the application (e.g., `npm start`).
3.  **Port configuration:** Smithery will expose the application, usually handling port mapping. Ensure the application listens on the port Smithery expects (often configured via the `PORT` environment variable, which this server supports).
4.  **Package the application:** This usually means providing the source code and `package.json` (and `package-lock.json`). Smithery will then build the application, installing dependencies.

Refer to the Smithery documentation for specific deployment instructions and how to configure services. 