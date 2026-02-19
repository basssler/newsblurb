"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
    chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
    const [svg, setSvg] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: "default",
            securityLevel: "loose",
            fontFamily: "inherit",
        });
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (!containerRef.current || !chart) return;

            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
            } catch (error) {
                console.error("Mermaid rendering failed:", error);
                setSvg(""); // Clear on error
            }
        };

        renderChart();
    }, [chart]);

    if (!svg) return null;

    return (
        <div
            ref={containerRef}
            className="mermaid-chart flex justify-center py-4 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
