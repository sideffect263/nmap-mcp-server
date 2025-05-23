import { createStatelessServer } from '@smithery/sdk/server/stateless.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { exec, execSync } from 'child_process';
import { Parser as XmlParser } from 'xml2js';
import { promisify } from 'util';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const xmlParser = new XmlParser({ explicitArray: false, mergeAttrs: true });
const execAsync = promisify(exec);

// Function to find nmap executable
function findNmapPath() {
  try {
    // Try 'which' command, common on Linux/macOS
    const path = execSync('which nmap').toString().trim();
    if (path) {
      console.log(`Found nmap at: ${path}`);
      return path;
    }
  } catch (error) {
    // 'which' might not be available or nmap not in PATH
    console.warn("'which nmap' failed, trying 'where nmap' or default path.");
  }

  try {
    // Try 'where' command, common on Windows, though less likely in Docker
    const path = execSync('where nmap').toString().trim().split('\\n')[0]; // Take the first result if multiple
    if (path) {
      console.log(`Found nmap at: ${path}`);
      return path;
    }
  } catch (error) {
     console.warn("'where nmap' failed, falling back to default path.");
  }
  
  // Fallback to a common default path if not found
  const defaultPath = "/usr/bin/nmap"; // A common path on Linux
  console.log(`Nmap not found via which/where, using default path: ${defaultPath}`);
  return defaultPath;
}

const NMAP_PATH = findNmapPath();

// Input validation and sanitization
function validateTarget(target) {
  // Basic validation for domain names and IP addresses
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  const cidrRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}\/([0-2]?[0-9]|3[0-2])$/;
  
  return domainRegex.test(target) || ipRegex.test(target) || cidrRegex.test(target);
}

function validateFlags(flags) {
  // Handle undefined/null flags
  if (!flags || typeof flags !== 'string') {
    return false;
  }
  
  const flagsArray = flags.split(/\s+/);
  
  for (let i = 0; i < flagsArray.length; i++) {
    const flag = flagsArray[i];
    
    // Skip empty flags
    if (!flag) continue;
    
    // Check if it's a port specification (after -p flag)
    if (i > 0 && flagsArray[i-1] === '-p') {
      // Validate port specification: numbers, commas, dashes
      if (flag.match(/^[\d,\-]+$/)) {
        // Further validate individual port specs
        const portSpecs = flag.split(',');
        const validPortSpec = portSpecs.every(spec => {
          // Single port: 80
          if (spec.match(/^\d+$/)) return parseInt(spec) <= 65535;
          // Port range: 80-90
          if (spec.match(/^\d+-\d+$/)) {
            const [start, end] = spec.split('-').map(Number);
            return start <= end && start > 0 && end <= 65535;
          }
          return false;
        });
        if (validPortSpec) continue;
      }
      return false;
    }
    
    // Check if it's a standalone number (port range after --top-ports)
    if (i > 0 && flagsArray[i-1] === '--top-ports') {
      if (flag.match(/^\d+$/) && parseInt(flag) <= 65535) continue;
      return false;
    }
    
    // Check if it's a script name (after --script flag)
    if (i > 0 && flagsArray[i-1] === '--script') {
      // Allow any alphanumeric script name with basic symbols
      if (flag.match(/^[a-zA-Z0-9_\-.,]+$/)) { 
        continue;
      }
      return false;
    }
    
    // Allow any flag that starts with - or --
    // This replaces the whitelist approach
    if (flag.startsWith('-')) {
      // Block potentially dangerous command injection characters
      if (flag.includes(';') || flag.includes('&') || flag.includes('|') || 
          flag.includes('>') || flag.includes('<') || flag.includes('`')) {
        console.log(`Flag validation failed for: ${flag} - contains potential command injection characters`);
        return false;
      }
      continue;
    }
    
    // If we get here, the flag doesn't match our format requirements
    console.log(`Flag validation failed for: ${flag} - not a valid flag format`);
    return false;
  }
  
  return true;
}

function createMcpServer({ sessionId, config }) {
  console.log(`[${sessionId || 'N/A'}] Creating MCP server instance`);
  
  const mcpServer = new McpServer({
    name: "NmapService",
    version: "1.0.0",
  });

  // Add the nmap scan tool
  mcpServer.tool(
    "nmapScan",
    {
      target: z.string().describe("Domain name, IP address, or CIDR notation to scan (e.g., example.com, 192.168.1.1, 10.0.0.0/24)"),
      flags: z.string().optional().default("-T4 -p 1-1000").describe("Nmap scanning flags. Common options: -T4 (timing), -p 1-1000 (port range), -sS (SYN scan), -A (aggressive scan)")
    },
    async ({ target, flags = "-T4 -p 1-1000" }) => {
      const logPrefix = `[${sessionId || 'N/A'}]`;
      
      // Debug: Log the received arguments
      console.log(`${logPrefix} Received target: ${target}, flags: ${flags}`);
      
      try {
        console.log(`${logPrefix} Starting Nmap scan for target: ${target}`);
        
        // Validate inputs
        if (!validateTarget(target)) {
          throw new Error(`Invalid target format: ${target}. Use domain names, IP addresses, or CIDR notation.`);
        }
        
        if (!validateFlags(flags)) {
          throw new Error(`Invalid or potentially unsafe flags detected: ${flags}`);
        }

        // Construct and execute nmap command
        const nmapCommand = `${NMAP_PATH} --datadir /usr/share/nmap -oX - ${flags} ${target}`;
        console.log(`${logPrefix} Executing command: ${nmapCommand}`);
        
        const { stdout, stderr } = await execAsync(nmapCommand, {
          timeout: 300000, // 5 minute timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        if (stderr) {
          console.warn(`${logPrefix} Nmap stderr: ${stderr}`);
        }

        // Parse XML output
        const parsedResult = await new Promise((resolve, reject) => {
          xmlParser.parseString(stdout, (parseError, result) => {
            if (parseError) {
              reject(new Error(`Failed to parse Nmap XML output: ${parseError.message}`));
            } else {
              resolve(result);
            }
          });
        });

        console.log(`${logPrefix} Nmap scan completed successfully for ${target}`);

        // Validate parsed result structure
        if (!parsedResult || typeof parsedResult.nmaprun !== 'object') {
          throw new Error("Nmap output parsing did not yield expected nmaprun structure");
        }

        // Format results for better readability
        const summary = formatNmapResults(parsedResult);
        
        return {
          content: [
            {
              type: "text",
              text: `Nmap Scan Results for ${target}\n\n${summary}\n\nFull XML Output:\n${JSON.stringify(parsedResult, null, 2)}`
            }
          ]
        };

      } catch (error) {
        console.error(`${logPrefix} Nmap scan failed: ${error.message}`);
        
        return {
          content: [
            {
              type: "text", 
              text: `Nmap scan failed for target: ${target}\n\nError: ${error.message}`
            }
          ]
        };
      }
    }
  );

  // Add a simple info tool for testing introspection
  mcpServer.tool(
    "getInfo",
    z.object({}),
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `Nmap Service Information:
- Service: Network scanning using Nmap
- Version: 1.0.0
- Available Tools: nmapScan, getInfo
- Session ID: ${sessionId || 'N/A'}
- Supported Targets: Domain names, IP addresses, CIDR notation
- Security: Input validation and command sanitization enabled`
          }
        ]
      };
    }
  );

  console.log(`${sessionId || 'N/A'} MCP server instance created with tools: nmapScan, getInfo`);
  return mcpServer;
}

// Helper function to format nmap results
function formatNmapResults(parsedResult) {
  try {
    const nmaprun = parsedResult.nmaprun;
    let summary = `Scan started: ${nmaprun.startstr || 'Unknown'}\n`;
    
    if (nmaprun.host) {
      const hosts = Array.isArray(nmaprun.host) ? nmaprun.host : [nmaprun.host];
      
      for (const host of hosts) {
        const address = host.address?.addr || 'Unknown';
        const hostname = host.hostnames?.hostname?.name || '';
        summary += `\nHost: ${address}${hostname ? ` (${hostname})` : ''}\n`;
        summary += `Status: ${host.status?.state || 'Unknown'}\n`;
        
        if (host.ports?.port) {
          const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
          summary += `Open ports:\n`;
          
          for (const port of ports) {
            if (port.state?.state === 'open') {
              summary += `  ${port.portid}/${port.protocol} - ${port.service?.name || 'unknown'}\n`;
            }
          }
        }
      }
    }
    
    summary += `\nScan completed: ${nmaprun.runstats?.finished?.timestr || 'Unknown'}`;
    return summary;
  } catch (error) {
    return "Could not format scan results - see full XML output below";
  }
}

// Create and start the server
console.log('Initializing Nmap MCP Server...');

const { app } = createStatelessServer(createMcpServer);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the documentation website at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`MCP Nmap server (Smithery SDK) is running on port ${PORT}`);
  console.log(`Server ready to accept MCP connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});