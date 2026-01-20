// Tool types for Hume AI EVI integration

export interface ToolCall {
  name: string;
  parameters: string;
  response_required: boolean;
  tool_call_id: string;
  tool_type: 'function';
}

export interface ToolCallWebhookEvent {
  event_name: 'tool_call';
  chat_group_id: string;
  chat_id: string;
  config_id: string;
  caller_number: string | null;
  custom_session_id: string | null;
  timestamp: number;
  tool_call_message: ToolCall;
}

export interface ToolResponse {
  type: 'tool_response' | 'tool_error';
  tool_call_id: string;
  content: string;
}

// Tool parameter types
export interface OpenBrowserParams {
  url: string;
}

export interface SendWhatsAppParams {
  phoneNumber: string;
  message: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

