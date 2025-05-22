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
  console.log(`Invoking Nmap tool "${nmapScanTool.name}" with params:`, toolInput);

  try {
    const result = await clientInstance.callTool({
      name: nmapScanTool.name,
      arguments: toolInput
    });
    console.log("'nmapScan' tool invocation successful. Result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`Error invoking 'nmapScan' tool for target ${params.target}:`, error);
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
  
  console.log(`Invoking GetInfo tool "${getInfoTool.name}"`);
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
    console.log("\n--- Calling getInfo ---");
    const info = await invokeGetInfo();
    if (info && info.content && info.content[0] && info.content[0].text) {
        console.log("Server Info:", info.content[0].text);
    }


    // Example: Perform an Nmap scan
    console.log("\n--- Calling nmapScan ---");
    const scanParams = {
      target: "scanme.nmap.org", // A safe target for testing
      flags: "-T4 -F" // Example flags: Fast scan, default timing
    };
    const scanResult = await invokeNmapScan(scanParams);
    if (scanResult && scanResult.content && scanResult.content[0] && scanResult.content[0].text) {
        console.log(`Scan results for ${scanParams.target}:`, scanResult.content[0].text);
    }

  } catch (error) {
    console.error("\n--- Example Script Failed ---");
    console.error("An error occurred:", error.message);
  } finally {
    if (clientInstance) {
      console.log("\nDisconnecting client...");
      await clientInstance.disconnect();
      console.log("Client disconnected.");
    }
  }
}

// Run the example
main();

export { initializeNmapClient, invokeNmapScan, invokeGetInfo }; 