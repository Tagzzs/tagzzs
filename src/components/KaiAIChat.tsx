"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Send, Loader2, Check, Sparkles, ChevronUp, Zap, Book } from "lucide-react";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  taskType?: string;
  confidence?: number;
  executionTime?: number;
  executionSteps?: Array<{ step?: string; step_name?: string; status: string; timestamp?: string }>;
}

interface TaskType {
  type: string;
  name: string;
  description: string;
}

interface AgentResponse {
  success: boolean;
  task_type?: string;
  task_confidence?: number;
  answer?: string;
  confidence_score?: number;
  execution_time_ms?: number;
  execution_steps?: Array<{ step_name: string; status: string }>;
  error?: string;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  available_tasks: number;
  active_services: Record<string, boolean>;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Example queries for quick access
const EXAMPLE_QUERIES = [
  "Tell me a summary of the content",
  "What are the key insights?",
  "Compare different topics",
  "Extract important information",
  "Analyze the main themes",
];

export default function KaiAIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Welcome to Kai AI! I can help you search, summarize, analyze, and extract insights from your content. Select a task type or just ask me anything!",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [_conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [pastChats, setPastChats] = useState<Array<{ chatId: string; title: string; messageCount: number; createdAt: number; updatedAt: number; preview: string }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch available tasks and health on mount
  useEffect(() => {
    fetchTasks();
    checkHealth();
    // initialize conversation id
    const id = `chat_${uuidv4()}`;
    setConversationId(id);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-agent/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTaskTypes(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-agent/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (error) {
      console.error("Failed to check health:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !user) return;

    const query = input;
    const userId = user.id;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const requestBody = {
        query: query,
        user_id: userId,
        conversation_history: messages
          .filter((m) => m.role === "user" || (m.role === "assistant" && m.taskType))
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        content_id_filter: null,
        task_type: selectedTask || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/ai-agent/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify(requestBody),
      });

      const data: AgentResponse = await response.json();

      if (data.success && data.answer) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          taskType: data.task_type,
          confidence: data.confidence_score,
          executionTime: data.execution_time_ms,
          executionSteps: data.execution_steps,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation history and save
        const userContent = query;
        const assistantContent = data.answer as string;
        setConversationHistory((prev) => {
          const updated: Array<{ role: string; content: string }> = [
            ...prev,
            { role: 'user', content: userContent },
            { role: 'assistant', content: assistantContent },
          ];

          // Save to backend
          saveConversationToFirebase(conversationId, updated);

          return updated;
        });
      } else {
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `❌ ${data.error || "Failed to process query"}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: `❌ Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save conversation to backend (create or update)
  const saveConversationToFirebase = async (chatId: string, history: Array<{ role: string; content: string }>, title?: string) => {
    if (!chatId || history.length === 0) return;

    try {
      const finalTitle = title || (history.find(h => h.role === 'user')?.content.substring(0,50) || 'Untitled Chat');

      const response = await fetch('/api/user-database/ai-chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          title: finalTitle,
          messages: history.map(h => ({ role: h.role, content: h.content, timestamp: Date.now() })),
        }),
      });

      if (response.ok) {
        console.log('[KAI_AI] ✅ Chat saved:', chatId);
      } else {
        console.error('[KAI_AI] Failed to save chat:', await response.text());
      }
    } catch (err) {
      console.error('[KAI_AI] Error saving chat:', err);
    }
  };

  // Load past chats list
  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/user-database/ai-chats/list');
      const data = await res.json();
      if (data.success) {
        setPastChats(data.chats || []);
      } else {
        console.error('[KAI_AI] Failed to load chat history:', data.error);
      }
    } catch (err) {
      console.error('[KAI_AI] Error loading chat history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load a specific past chat into the view
  const loadPastChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/user-database/ai-chats/get?chatId=${chatId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const chat = data.data;
        setConversationId(chatId);
        setConversationHistory(chat.messages || []);

        // Build display messages
        const display: Message[] = [
          {
            id: 'welcome',
            role: 'assistant',
            content: "👋 Welcome to Kai AI! I can help you search, summarize, analyze, and extract insights from your content. Select a task type or just ask me anything!",
            timestamp: new Date(),
          },
          ...(chat.messages || []).map((m: { role: string; content: string; timestamp?: number }, idx: number) => ({
            id: `msg_loaded_${idx}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp || Date.now()),
          })),
        ];

        setMessages(display);
        setShowChatHistory(false);
      } else {
        console.error('[KAI_AI] Failed to load chat:', data.error);
      }
    } catch (err) {
      console.error('[KAI_AI] Error loading past chat:', err);
    }
  };

  // Delete past chat
  const deletePastChat = async (chatId: string) => {
    if (!confirm('Delete this chat?')) return;
    try {
      const res = await fetch('/api/user-database/ai-chats/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      });
      if (res.ok) {
        setPastChats((p) => p.filter(c => c.chatId !== chatId));
        console.log('[KAI_AI] Deleted chat', chatId);
      } else {
        console.error('[KAI_AI] Failed to delete chat');
      }
    } catch (err) {
      console.error('[KAI_AI] Error deleting chat:', err);
    }
  };

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleExampleQuery = (query: string) => {
    setInput(query);
  };

  const selectTask = (taskName: string) => {
    setSelectedTask(selectedTask === taskName ? null : taskName);
    setIsTaskDropdownOpen(false);
  };

  const formatStepName = (stepName: string): string => {
    const steps: Record<string, string> = {
      "TaskRouter": "Analyzing task type",
      "task_router": "Analyzing task type",
      "ContentRetrieval": "Retrieving relevant content",
      "content_retrieval": "Retrieving relevant content",
      "ContentSearch": "Searching content database",
      "content_search": "Searching content database",
      "SummaryGeneration": "Generating summary",
      "summary_generation": "Generating summary",
      "ResponseGeneration": "Generating response",
      "response_generation": "Generating response",
      "Validation": "Validating response",
      "validation": "Validating response",
      "ContextBuilding": "Building context",
      "context_building": "Building context",
      "MetadataFiltering": "Filtering by metadata",
      "metadata_filtering": "Filtering by metadata",
      "DataAggregation": "Aggregating data",
      "data_aggregation": "Aggregating data",
      "Analysis": "Analyzing patterns",
      "analysis": "Analyzing patterns",
      "Comparison": "Comparing results",
      "comparison": "Comparing results",
    };
    const defaultName = stepName ? stepName.replace(/_/g, " ") : "Unknown step";
    return steps[stepName || ""] || defaultName;
  };

  const getTaskColor = (taskType?: string) => {
    const colors: Record<string, string> = {
      SEARCH: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
      SUMMARIZE: "bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700",
      ANALYZE: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700",
      COMPARE: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700",
      EXTRACT_INSIGHTS: "bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700",
      METADATA_QUERY: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700",
    };
    return colors[taskType || "SEARCH"] || "bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
  };

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                KAI<sup className="text-xs font-semibold text-blue-600 dark:text-blue-400 align-super ml-0.5">AI</sup>
              </h1>
              <p className="text-xs text-muted-foreground">Intelligent content analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Task Selector Dropdown */}
            <DropdownMenu open={isTaskDropdownOpen} onOpenChange={setIsTaskDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  disabled={taskTypes.length === 0}
                >
                  <Zap className="w-4 h-4" />
                  {selectedTask ? selectedTask.replace(/_/g, " ") : "Task"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {taskTypes.map((task) => (
                  <DropdownMenuItem
                    key={task.type}
                    onClick={() => selectTask(task.type)}
                    className={`cursor-pointer ${selectedTask === task.type ? "bg-blue-500/20" : ""}`}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <div className="mt-1">
                        {selectedTask === task.type ? (
                          <Check className="w-4 h-4 text-blue-600" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Health Status */}
            {healthStatus && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                healthStatus.status === "healthy"
                  ? "bg-green-500/20 text-green-700 dark:text-green-300"
                  : healthStatus.status === "degraded"
                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                  : "bg-red-500/20 text-red-700 dark:text-red-300"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  healthStatus.status === "healthy"
                    ? "bg-green-500"
                    : healthStatus.status === "degraded"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`} />
                <span className="hidden sm:inline">{healthStatus.status}</span>
              </div>
            )}
              {/* New Chat */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Start a new conversation without deleting existing saved chats
                  const newId = `chat_${uuidv4()}`;
                  setConversationId(newId);
                  setConversationHistory([]);
                  setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      content:
                        "👋 Welcome to Kai AI! I can help you search, summarize, analyze, and extract insights from your content. Select a task type or just ask me anything!",
                      timestamp: new Date(),
                    },
                  ]);
                  setShowChatHistory(false);
                  console.log('[KAI_AI] Started new chat', newId);
                }}
                className="gap-2 text-xs"
              >
                <Sparkles className="w-4 h-4" />
                New Chat
              </Button>

              {/* History Button (toggle) */}
              {!showChatHistory ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (pastChats.length === 0) loadChatHistory();
                    setShowChatHistory(true);
                  }}
                  className="gap-2 text-xs"
                >
                  <Book className="w-4 h-4" />
                  History
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChatHistory(false)}
                  className="gap-2 text-xs"
                >
                  <ChevronDown className="w-4 h-4" />
                  Close
                </Button>
              )}
          </div>
        </div>
      </div>

      {/* Messages Container or Chat History */}
      {!showChatHistory ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-2xl ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : ""}`}>
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none"
                      : "bg-card border border-border rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {message.role === "assistant" && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {message.taskType && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskColor(message.taskType)}`}>
                        {message.taskType.replace(/_/g, " ")}
                      </span>
                    )}
                    {message.confidence !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        📊 {Math.round(message.confidence * 100)}%
                      </span>
                    )}
                    {message.executionTime !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ⏱ {message.executionTime}ms
                      </span>
                    )}
                    {message.executionSteps && message.executionSteps.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-1"
                        onClick={() => toggleExpanded(message.id)}
                      >
                        {expandedMessages.has(message.id) ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Details
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {message.role === "assistant" && expandedMessages.has(message.id) && message.executionSteps && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 w-full">
                    <p className="text-xs font-bold text-foreground mb-3">
                      Processing Pipeline
                    </p>
                    <div className="space-y-2">
                      {message.executionSteps.map((step, idx) => {
                        const stepName = step.step || step.step_name || "";
                        const display = formatStepName(stepName);
                        const isCompleted = step.status === "completed";
                        
                        // Only show completed steps
                        if (!isCompleted) {
                          return null;
                        }
                        
                        return (
                          <div key={idx} className="flex items-center gap-3 py-1.5">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/90 flex items-center justify-center">
                              <span className="text-white font-bold text-xs">✓</span>
                            </div>
                            <span className="text-sm text-foreground font-medium">{display}</span>
                          </div>
                        );
                      })}
                      
                      {/* Show loading indicator for any in-progress steps */}
                      {message.executionSteps.some((step) => step.status === "in_progress") && (
                        <div className="flex items-center gap-3 py-1.5">
                          <div className="flex-shrink-0 w-5 h-5">
                            <div className="w-full h-full rounded-full border-2 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">Processing...</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-900/50 text-xs text-muted-foreground">
                      All steps completed
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Kai is thinking</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      ) : (
        /* Chat History View */
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 space-y-3">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="h-8 w-8 text-gray-400 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading chats...</p>
              </div>
            </div>
          ) : pastChats.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No saved chats yet</p>
              </div>
            </div>
          ) : (
            pastChats.map((chat) => (
              <div key={chat.chatId} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all duration-200 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => loadPastChat(chat.chatId)}>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{chat.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{chat.preview}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>{chat.messageCount} messages</span>
                      <span>•</span>
                      <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Button variant="ghost" size="sm" onClick={() => loadPastChat(chat.chatId)}>Open</Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePastChat(chat.chatId)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur-sm px-6 py-4 sticky bottom-0 z-10">
        <form onSubmit={sendMessage} className="flex flex-col gap-4">
          {/* Example Queries */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Book className="w-3 h-3" />
                Try asking:
              </span>
              {EXAMPLE_QUERIES.map((query, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-2.5 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={() => handleExampleQuery(query)}
                  disabled={isLoading}
                >
                  {query}
                </Button>
              ))}
            </div>
          )}

          {/* Input and Send */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Kai anything about your content..."
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                disabled={isLoading || !user}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || !user}
              size="lg"
              className="px-6 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </Button>
          </div>

          {/* Status Messages */}
          {!user && (
            <p className="text-xs text-destructive">Please sign in to use Kai AI</p>
          )}
          {selectedTask && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              📌 Task filter active: <span className="font-medium">{selectedTask.replace(/_/g, " ")}</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
