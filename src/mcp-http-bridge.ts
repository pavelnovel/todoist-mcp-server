// mcp-http-bridge.js
import express from "express";
import { spawn } from "child_process";

const MCP_SERVER_PATH = "./dist/index.js"; // Updated path since we're now in the same package

const app = express();
app.use(express.json());

// Simple endpoint for "get tasks"
app.post("/mcp", async (req, res) => {
  const mcpArgs = req.body; // Should match the schema you showed earlier

  const mcpProc = spawn("node", [MCP_SERVER_PATH], {
    env: { ...process.env, TODOIST_API_TOKEN: process.env.TODOIST_API_TOKEN },
    stdio: ["pipe", "pipe", "inherit"]
  });

  let responseData = "";

  mcpProc.stdout.on("data", (data) => {
    responseData += data.toString();
  });

  mcpProc.on("close", (code) => {
    try {
      // Your server writes results as JSON lines
      // Make sure to return a valid JSON response
      res.json(JSON.parse(responseData));
    } catch (e) {
      res.status(500).json({ error: "Failed to parse MCP output" });
    }
  });

  // Write the request as a line (add newline if server expects it)
  mcpProc.stdin.write(JSON.stringify(mcpArgs) + "\n");
  mcpProc.stdin.end();
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`MCP HTTP Bridge listening on ${PORT}`)); 