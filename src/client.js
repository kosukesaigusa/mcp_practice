import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["src/server.js"]
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0"
  }
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log("Available tools:");
tools.tools.forEach(tool => {
  console.log(`- ${tool.name}:`);
  console.log("  Input schema:", JSON.stringify(tool.inputSchema, null, 2));
});

// Call add tool
const addResult = await client.callTool({
  name: "add",
  arguments: {
    a: 5,
    b: 3
  }
});
console.log("Add result:", addResult);

// Call subtract tool
const subtractResult = await client.callTool({
  name: "subtract",
  arguments: {
    a: 10,
    b: 4
  }
});
console.log("Subtract result:", subtractResult);

// Close the client
await client.close();