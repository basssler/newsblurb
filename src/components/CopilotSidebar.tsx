"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    action?: string;
}

interface CopilotSidebarProps {
    ticker?: string;
    horizon?: string;
    analysisData?: {
        fundamentals?: {
            pe: number;
            evEbitda: number;
            epsGrowth: number;
            dividendYield: number;
        };
        technicals?: {
            rsi: number;
            sma20: number;
            sma50: number;
            atr: number;
            currentPrice: number;
        };
    };
    isOpen: boolean;
    onToggle: () => void;
    onDockChange?: (isDocked: boolean) => void;
    pendingAction?: {
        action: "explain" | "define" | "summarize";
        text: string;
    } | null;
    onActionProcessed?: () => void;
}

export default function CopilotSidebar({
    ticker,
    horizon,
    analysisData,
    isOpen,
    onToggle,
    onDockChange,
    pendingAction,
    onActionProcessed,
}: CopilotSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDocked, setIsDocked] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Handle dock state change
    const toggleDock = useCallback(() => {
        const newDocked = !isDocked;
        setIsDocked(newDocked);
        onDockChange?.(newDocked);
    }, [isDocked, onDockChange]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === "K") {
                e.preventDefault();
                onToggle();
            }
        };
        window.addEventListener("keydown", handleKeyboard);
        return () => window.removeEventListener("keydown", handleKeyboard);
    }, [onToggle]);

    // Handle pending actions from text selection tooltip
    useEffect(() => {
        if (pendingAction && isOpen) {
            handleActionRequest(pendingAction.action, pendingAction.text);
            onActionProcessed?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingAction, isOpen]);

    const sendMessage = async (content: string, action?: string, selectedText?: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: action ? `[${action.toUpperCase()}] "${selectedText}"` : content,
            timestamp: new Date(),
            action,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const history = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    action: action || "chat",
                    selectedText,
                    context: {
                        ticker,
                        horizon,
                        fundamentals: analysisData?.fundamentals,
                        technicals: analysisData?.technicals,
                    },
                    history,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: unknown) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionRequest = (action: "explain" | "define" | "summarize", text: string) => {
        sendMessage(text, action, text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input.trim());
        setInput("");
    };

    const clearChat = () => {
        setMessages([]);
    };

    // Render simple markdown (bold, bullets, code)
    const renderMarkdown = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, i) => {
            // Bold
            let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
            // Inline code
            processed = processed.replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-slate-700 rounded text-blue-300 text-xs">$1</code>');
            // Bullet points
            if (processed.startsWith("- ") || processed.startsWith("• ")) {
                return (
                    <div key={i} className="flex gap-2 ml-2 mb-1">
                        <span className="text-blue-400 flex-shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: processed.substring(2) }} />
                    </div>
                );
            }
            // Empty line
            if (!processed.trim()) return <div key={i} className="h-2" />;
            // Regular line
            return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: processed }} />;
        });
    };

    return (
        <>
            {/* Floating Toggle Button (when sidebar is closed) */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="copilot-fab group"
                    title="Open Copilot (Ctrl+Shift+K)"
                    aria-label="Open AI Copilot sidebar"
                >
                    <span className="copilot-fab-icon">✨</span>
                    <span className="copilot-fab-label">AI Copilot</span>
                </button>
            )}

            {/* Backdrop for mobile when sidebar is open and not docked */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar Panel */}
            <div
                className={`copilot-sidebar ${isOpen ? "copilot-sidebar--open" : ""} ${isDocked ? "copilot-sidebar--docked" : ""
                    }`}
                role="complementary"
                aria-label="AI Copilot Sidebar"
            >
                {/* Header */}
                <div className="copilot-sidebar-header">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h3 className="font-semibold text-white text-sm">AI Copilot</h3>
                        {ticker && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full font-medium">
                                {ticker}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Dock/Undock button */}
                        <button
                            onClick={toggleDock}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title={isDocked ? "Undock sidebar" : "Dock sidebar"}
                        >
                            {isDocked ? (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="1" y="1" width="14" height="14" rx="2" />
                                    <line x1="10" y1="1" x2="10" y2="15" />
                                    <circle cx="13" cy="4" r="1" fill="currentColor" stroke="none" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="1" y="1" width="14" height="14" rx="2" />
                                    <line x1="10" y1="1" x2="10" y2="15" />
                                </svg>
                            )}
                        </button>
                        {/* Clear chat */}
                        <button
                            onClick={clearChat}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Clear chat"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                            </svg>
                        </button>
                        {/* Close button */}
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Close (Ctrl+Shift+K)"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="copilot-messages">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                            <div className="text-4xl mb-4">🤖</div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">
                                Hi! I&apos;m your AI Copilot
                            </h4>
                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                                Ask me anything about {ticker || "stocks"}. I can explain
                                financial concepts, analyze data, and help you understand the
                                market.
                            </p>
                            <div className="space-y-2 w-full">
                                {[
                                    `What does the RSI of ${analysisData?.technicals?.rsi?.toFixed(0) || "30"} mean?`,
                                    `Is ${ticker || "this stock"} overvalued right now?`,
                                    "Explain the P/E ratio in simple terms",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            setInput(suggestion);
                                            sendMessage(suggestion);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`copilot-message ${msg.role === "user" ? "copilot-message--user" : "copilot-message--assistant"
                                }`}
                        >
                            {msg.action && (
                                <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mb-1">
                                    {msg.action === "explain" && "📖 Explain"}
                                    {msg.action === "define" && "📝 Define"}
                                    {msg.action === "summarize" && "✂️ Summarize"}
                                </div>
                            )}
                            <div className="text-sm leading-relaxed">
                                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="copilot-message copilot-message--assistant">
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="copilot-typing">
                                    <span /><span /><span />
                                </div>
                                <span className="text-xs">Thinking...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="copilot-input-area">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Ask about ${ticker || "anything"}...`}
                            className="copilot-input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="copilot-send-btn"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1.5 1.5L14.5 8L1.5 14.5V9.5L10.5 8L1.5 6.5V1.5Z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5 text-center">
                        Highlight text on the page for quick actions • Ctrl+Shift+K to toggle
                    </p>
                </form>
            </div>
        </>
    );
}
