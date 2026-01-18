'use client';

import { useState, useRef } from 'react';
import { Terminal, Play, Trash2, Minimize2, Maximize2 } from 'lucide-react';

interface OutputItem {
  type: 'success' | 'error';
  code: string;
  result?: unknown;
  error?: string;
  timestamp: Date;
}

interface DevREPLProps {
  context?: Record<string, unknown>;
}

export default function DevREPL({ context = {} }: DevREPLProps) {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<OutputItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const executeCode = () => {
    if (!code.trim()) return;

    try {
      // Create a function with context variables in scope
      const func = new Function(...Object.keys(context), `return ${code}`);
      const result = func(...Object.values(context));
      
      setOutput(prev => [...prev, { 
        type: 'success', 
        code, 
        result,
        timestamp: new Date()
      }]);
      setHistory(prev => [...prev, code]);
      setHistoryIndex(-1);
      setCode('');
    } catch (error) {
      setOutput(prev => [...prev, { 
        type: 'error', 
        code, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Execute on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCode();
    }
    
    // History with Up/Down
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setCode(history[history.length - 1 - newIndex]);
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCode(history[history.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setCode('');
      }
    }
  };

  const formatResult = (result: unknown): string => {
    if (result === undefined) return 'undefined';
    if (result === null) return 'null';
    if (typeof result === 'function') return '[Function]';
    if (typeof result === 'object') {
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }
    return String(result);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 bg-gray-900 text-white rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-2"
      >
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm">Dev Console</span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-4 left-4 bg-gray-900 text-white rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-200 ${
        isExpanded ? 'w-[600px] h-[500px]' : 'w-[400px] h-[350px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">Dev Console</span>
          <span className="text-xs text-gray-500">({output.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOutput([])}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Clear output"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title={isExpanded ? 'Shrink' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 bg-gray-850 border-b border-gray-700 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setCode('getState()')}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
        >
          Get State
        </button>
        <button
          onClick={() => setCode('addTestMessage("Hello!", "user")')}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
        >
          Add Message
        </button>
        <button
          onClick={() => setCode('changeEmotion("happy")')}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
        >
          Happy
        </button>
        <button
          onClick={() => setCode('changeEmotion("thinking")')}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
        >
          Thinking
        </button>
        <button
          onClick={() => setCode('toggleTranscript()')}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
        >
          Toggle Transcript
        </button>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {output.map((item, i) => (
          <div key={i} className="border-l-2 border-gray-700 pl-3 pb-2">
            <div className="text-gray-500">&gt; {item.code}</div>
            {item.type === 'success' && (
              <pre className="text-green-400 mt-1 whitespace-pre-wrap overflow-x-auto">
                {formatResult(item.result)}
              </pre>
            )}
            {item.type === 'error' && (
              <div className="text-red-400 mt-1">Error: {item.error}</div>
            )}
          </div>
        ))}
        
        {output.length === 0 && (
          <div className="text-gray-600 text-center py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Start typing commands...</p>
            <p className="text-xs mt-2">Available: getState(), addTestMessage(), changeEmotion(), toggleTranscript(), clearMessages()</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter JavaScript..."
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={executeCode}
            className="bg-blue-600 hover:bg-blue-700 px-4 rounded transition-colors flex items-center justify-center"
            title="Execute"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Cmd+Enter to execute | Up/Down for history
        </div>
      </div>
    </div>
  );
}
