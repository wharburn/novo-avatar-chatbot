import { mcpClient, MCPServerConfig } from './mcp-client';

/**
 * MCP Translation Service
 * Provides translation capabilities using MCP servers
 */

export interface TranslationRequest {
  text: string;
  sourceLang?: string;
  targetLang: string;
}

export interface TranslationResult {
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
  provider: string;
}

/**
 * Available MCP translation server configurations
 */
const TRANSLATION_SERVERS: Record<string, MCPServerConfig> = {
  // Example: Google Translate MCP server (if available)
  google: {
    name: 'google-translate',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-translate'],
    env: {
      GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || '',
    },
  },
  // Example: LibreTranslate MCP server (free, self-hosted option)
  libre: {
    name: 'libre-translate',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-libretranslate'],
    env: {
      LIBRETRANSLATE_URL: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
      LIBRETRANSLATE_API_KEY: process.env.LIBRETRANSLATE_API_KEY || '',
    },
  },
};

class MCPTranslationService {
  private initialized = false;
  private preferredProvider: string = 'libre'; // Default to free option

  /**
   * Initialize the translation service
   */
  async initialize(provider?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    const providerToUse = provider || this.preferredProvider;
    const serverConfig = TRANSLATION_SERVERS[providerToUse];

    if (!serverConfig) {
      throw new Error(`Unknown translation provider: ${providerToUse}`);
    }

    try {
      await mcpClient.connect(serverConfig);
      this.initialized = true;
      console.log(`[MCP Translation] Initialized with provider: ${providerToUse}`);
    } catch (error) {
      console.error('[MCP Translation] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Translate text using MCP server
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Try to use the connected MCP server
      const servers = mcpClient.getConnectedServers();
      const translationServer = servers.find(
        (s) => s.includes('translate') || s.includes('translation')
      );

      if (!translationServer) {
        throw new Error('No translation server connected');
      }

      // Execute translation tool
      const result = await mcpClient.executeTool(translationServer, 'translate', {
        text: request.text,
        source: request.sourceLang || 'auto',
        target: request.targetLang,
      });

      // Extract translated text from result
      const translatedText =
        result.content.find((c) => c.type === 'text')?.text || request.text;

      return {
        translatedText,
        sourceLang: request.sourceLang,
        targetLang: request.targetLang,
        provider: translationServer,
      };
    } catch (error) {
      console.error('[MCP Translation] Translation failed:', error);
      throw error;
    }
  }

  /**
   * Check if translation service is available
   */
  isAvailable(): boolean {
    return this.initialized && mcpClient.getConnectedServers().length > 0;
  }

  /**
   * Get supported languages (if available from MCP server)
   */
  async getSupportedLanguages(): Promise<string[]> {
    // This would depend on the specific MCP server implementation
    // For now, return common language codes
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'no',
    ];
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await mcpClient.disconnectAll();
    this.initialized = false;
  }
}

// Singleton instance
export const mcpTranslation = new MCPTranslationService();

