"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TooltipPosition {
    x: number;
    y: number;
}

interface TextSelectionTooltipProps {
    containerRef: React.RefObject<HTMLElement | null>;
    onAction: (action: "explain" | "define" | "summarize", text: string) => void;
}

export default function TextSelectionTooltip({
    containerRef,
    onAction,
}: TextSelectionTooltipProps) {
    const [selectedText, setSelectedText] = useState("");
    const [position, setPosition] = useState<TooltipPosition | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const handleMouseUp = useCallback(() => {
        // Small delay to let native selection finalize
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                return;
            }

            const text = selection.toString().trim();
            if (text.length < 3 || text.length > 2000) return;

            // Ensure selection is within our container
            const container = containerRef.current;
            if (!container) return;

            const anchorNode = selection.anchorNode;
            if (!anchorNode || !container.contains(anchorNode)) return;

            // Get position from the selection range
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Position tooltip above the selection, centered
            setSelectedText(text);
            setPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
            });
            setIsVisible(true);
        }, 10);
    }, [containerRef]);

    const handleClickAway = useCallback(
        (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                !tooltipRef.current.contains(e.target as Node)
            ) {
                setIsVisible(false);
                setSelectedText("");
            }
        },
        []
    );

    const handleScroll = useCallback(() => {
        setIsVisible(false);
        setSelectedText("");
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousedown", handleClickAway);
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            container.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousedown", handleClickAway);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [containerRef, handleMouseUp, handleClickAway, handleScroll]);

    const handleAction = (action: "explain" | "define" | "summarize") => {
        if (!selectedText) return;
        onAction(action, selectedText);
        setIsVisible(false);
        setSelectedText("");
        // Clear the browser selection
        window.getSelection()?.removeAllRanges();
    };

    if (!isVisible || !position) return null;

    return (
        <div
            ref={tooltipRef}
            className="selection-tooltip"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            <div className="selection-tooltip-inner">
                <button
                    onClick={() => handleAction("explain")}
                    className="selection-tooltip-btn"
                    title="Explain this text"
                >
                    <span>📖</span>
                    <span>Explain</span>
                </button>
                <div className="selection-tooltip-divider" />
                <button
                    onClick={() => handleAction("define")}
                    className="selection-tooltip-btn"
                    title="Define key terms"
                >
                    <span>📝</span>
                    <span>Define</span>
                </button>
                <div className="selection-tooltip-divider" />
                <button
                    onClick={() => handleAction("summarize")}
                    className="selection-tooltip-btn"
                    title="Summarize this text"
                >
                    <span>✂️</span>
                    <span>Summarize</span>
                </button>
            </div>
            {/* Arrow */}
            <div className="selection-tooltip-arrow" />
        </div>
    );
}
