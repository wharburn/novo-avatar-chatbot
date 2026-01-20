import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * MCP Client Manager
 * Manages connections to MCP servers and tool execution
 */

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      console.log(`[MCP] Already connected to ${config.name}`);
      return;
    }

    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env,
      });

      const client = new Client(
        {
          name: 'novo-chatbot',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);

      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);

      console.log(`[MCP] Connected to ${config.name}`);
    } catch (error) {
      console.error(`[MCP] Failed to connect to ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    const transport = this.transports.get(serverName);

    if (client && transport) {
      await client.close();
      await transport.close();
      this.clients.delete(serverName);
      this.transports.delete(serverName);
      console.log(`[MCP] Disconnected from ${serverName}`);
    }
  }

  /**
   * List available tools from a server
   */
  async listTools(serverName: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Not connected to server: ${serverName}`);
    }

    const response = await client.listTools();
    return response.tools as MCPTool[];
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Not connected to server: ${serverName}`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      return result as MCPToolResult;
    } catch (error) {
      console.error(`[MCP] Tool execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get all connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const servers = this.getConnectedServers();
    await Promise.all(servers.map((server) => this.disconnect(server)));
  }
}

// Singleton instance
export const mcpClient = new MCPClientManager();

