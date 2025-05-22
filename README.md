# Nmap MCP Server (Smithery SDK)

This project implements an MCP-compliant (Model Context Protocol) server using the Smithery SDK. It wraps the Nmap network scanner, exposing its functionality as callable tools within the MCP framework.

## Features

- **MCP Standard Endpoint (`/mcp`)**: Interacts with the server using JSON-RPC 2.0 requests.
- **`nmapScan` Tool**: Initiates an Nmap scan on a specified target with configurable flags. Returns detailed scan results, including parsed XML output.
- **`getInfo` Tool**: Provides basic information about the Nmap service and its capabilities.
- Input validation for targets and Nmap flags to enhance security.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or later recommended)
- [Nmap](https://nmap.org/download.html) installed and available in your system's PATH.

## Installation

1. Clone the repository (or download the source code).
2. Navigate to the project directory:
   ```bash
   cd your-project-directory
   ```
3. Install dependencies:
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

1. **Ensure Nmap is available in the Smithery execution environment.** This might involve custom Docker images or buildpacks if Nmap isn't pre-installed.
2. **Define the startup command:** Smithery will need to know how to start the application (e.g., `npm start`).
3. **Port configuration:** Smithery will expose the application, usually handling port mapping. Ensure the application listens on the port Smithery expects (often configured via the `PORT` environment variable, which this server supports via the `process.env.PORT || 5001` pattern).
4. **Package the application:** This usually means providing the source code and `package.json` (and `package-lock.json`). Smithery will then build the application, installing dependencies.

Refer to the Smithery documentation for specific deployment instructions and how to configure services that adhere to the Model Context Protocol.

## Example MCP Client

Below is an example of how to create a client to interact with this Nmap MCP server. You'll need to have the `@modelcontextprotocol/sdk` and `@smithery/sdk` packages installed in your client project.

Save the following code as `nmap_mcp_client_example.js`:

```javascript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk/shared/config.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Ensure you have your Smithery API key for the server in an environment variable
const SMITHERY_API_KEY = process.env.SMITHERY_NMAP_API_KEY || "your-smithery-api-key-here"; // Replace with your actual key or ensure env var is set
const NMAP_SERVER_URL = "https://server.smithery.ai/@sideffect263/nmap-mcp-server"; // Replace with your server URL if different

let clientInstance;
let nmapScanTool;
let getInfoTool;

async function initializeNmapClient() {
  if (clientInstance) {
    console.log("Nmap MCP Client already initialized.");
    return clientInstance;
  }

  console.log("Initializing Nmap MCP Client...");

  try {
    const config = {}; // Add any specific config for Smithery if needed
    const serverUrl = createSmitheryUrl(
      NMAP_SERVER_URL,
      { config, apiKey: SMITHERY_API_KEY }
    );

    const transport = new StreamableHTTPClientTransport(serverUrl);

    clientInstance = new Client({
      name: "ExampleNmapClient",
      version: "1.0.0",
    });

    console.log("Connecting to Nmap MCP server...");
    await clientInstance.connect(transport);
    console.log("Successfully connected to Nmap MCP server.");

    const toolsResponse = await clientInstance.listTools();
  
    if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
      console.log(`Available tools: ${toolsResponse.tools.map((t) => t.name).join(", ")}`);
      nmapScanTool = toolsResponse.tools.find(tool => tool.name === 'nmapScan');
      getInfoTool = toolsResponse.tools.find(tool => tool.name === 'getInfo');
    } else {
      throw new Error("Could not list tools from the server.");
    }

    if (!nmapScanTool) {
      throw new Error("Nmap tool ('nmapScan') not found on the MCP server.");
    }
    console.log(`Found Nmap tool: ${nmapScanTool.name}`);

    if (getInfoTool) {
      console.log(`Found GetInfo tool: ${getInfoTool.name}`);
    } else {
      console.warn("GetInfo tool ('getInfo') not found. This might be optional.");
    }
  
    return clientInstance;
  } catch (error) {
    console.error("Failed to initialize Nmap MCP client:", error);
    clientInstance = null; // Reset on failure
    nmapScanTool = null;
    getInfoTool = null;
    throw error;
  }
}

/**
 * Invokes the 'nmapScan' tool on the MCP server.
 * @param {Object} params - Parameters for the Nmap tool.
 * @param {string} params.target - The target IP, hostname, or CIDR.
 * @param {string} params.flags - Nmap flags as a single string (e.g., "-A -T4").
 * @returns {Promise<Object>} - The result from the 'nmapScan' tool.
 */
async function invokeNmapScan(params) {
  if (!clientInstance || !nmapScanTool) {
    console.log("Client not ready. Initializing...");
    await initializeNmapClient();
    if (!clientInstance || !nmapScanTool) {
      throw new Error("Nmap MCP client is not initialized or nmapScan tool not found.");
    }
  }

  const toolInput = {
    target: params.target,
    flags: params.flags 
  };
  console.log(\`Invoking Nmap tool "\${nmapScanTool.name}" with params:\`, toolInput);

  try {
    const result = await clientInstance.callTool({
      name: nmapScanTool.name,
      arguments: toolInput
    });
    console.log("'nmapScan' tool invocation successful. Result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(\`Error invoking 'nmapScan' tool for target \${params.target}:\`, error);
    throw error;
  }
}

/**
 * Invokes the 'getInfo' tool on the MCP server.
 * @returns {Promise<Object>} - The result from the 'getInfo' tool.
 */
async function invokeGetInfo() {
  if (!clientInstance || !getInfoTool) {
    console.log("Client or getInfo tool not ready. Initializing...");
    await initializeNmapClient();
    if (!clientInstance || !getInfoTool) {
      throw new Error("Nmap MCP client is not initialized or getInfo tool not found.");
    }
  }
  
  console.log(\`Invoking GetInfo tool "\${getInfoTool.name}"\`);
  try {
    const result = await clientInstance.callTool({
      name: getInfoTool.name,
      arguments: {} // getInfo usually takes no arguments
    });
    console.log("'getInfo' tool invocation successful. Result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Error invoking 'getInfo' tool:", error);
    throw error;
  }
}


// --- Example Usage ---
async function main() {
  try {
    await initializeNmapClient();

    // Example: Get server info
    console.log("\\n--- Calling getInfo ---");
    const info = await invokeGetInfo();
    if (info && info.content && info.content[0] && info.content[0].text) {
        console.log("Server Info:", info.content[0].text);
    }


    // Example: Perform an Nmap scan
    console.log("\\n--- Calling nmapScan ---");
    const scanParams = {
      target: "scanme.nmap.org", // A safe target for testing
      flags: "-T4 -F" // Example flags: Fast scan, default timing
    };
    const scanResult = await invokeNmapScan(scanParams);
    if (scanResult && scanResult.content && scanResult.content[0] && scanResult.content[0].text) {
        console.log(\`Scan results for \${scanParams.target}:\`, scanResult.content[0].text);
    }

  } catch (error) {
    console.error("\\n--- Example Script Failed ---");
    console.error("An error occurred:", error.message);
  } finally {
    if (clientInstance) {
      console.log("\\nDisconnecting client...");
      await clientInstance.disconnect();
      console.log("Client disconnected.");
    }
  }
}

// Run the example
main();

export { initializeNmapClient, invokeNmapScan, invokeGetInfo };
```

To run this example client:

1. Ensure you have Node.js installed.
2. Create a new directory for your client project.
3. Inside this directory, run `npm init -y` to create a `package.json` file.
4. Install the necessary SDKs:
   ```bash
   npm install @modelcontextprotocol/sdk @smithery/sdk
   ```
5. Save the code above as `nmap_mcp_client_example.js` in this directory.
6. Modify the `SMITHERY_NMAP_API_KEY` and `NMAP_SERVER_URL` constants in the script with your actual Smithery API key and the URL of your deployed Nmap MCP server.
7. If your `package.json` doesn't already have `"type": "module"`, add it or change the import/export syntax to CommonJS (`require`/`module.exports`). For ES Modules (as written), add:
   ```json
   // package.json
   {
     // ... other properties
     "type": "module" 
   }
   ```
8. Run the client:
   ```bash
   node nmap_mcp_client_example.js
   ```

This client will connect to your Nmap MCP server, list available tools, call `getInfo` for server information, and then call `nmapScan` to perform a scan on `scanme.nmap.org`.
