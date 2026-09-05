"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Branch {
  name: string;
  children: string[];
}

interface MindMapData {
  root: string;
  branches: Branch[];
  mermaid?: string;
}

export function InteractiveMindMap({
  data,
  topicTitle,
}: {
  data: MindMapData | any;
  topicTitle?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Parse structured branches from data
  const { rootTitle, branches } = useMemo(() => {
    let root = data?.root || topicTitle || "Study Guide Mindmap";
    let branchList: Branch[] = [];

    if (Array.isArray(data?.branches) && data.branches.length > 0) {
      branchList = data.branches;
    } else if (typeof data?.mermaid === "string") {
      let currentBranch: Branch | null = null;
      for (const line of data.mermaid.split("\n")) {
        const stripped = line.trim();
        if (!stripped || stripped.startsWith("mindmap")) continue;
        if (stripped.startsWith("root(")) {
          const match = stripped.match(/root\(\((.*?)\)\)/);
          if (match) root = match[1];
          continue;
        }
        const indent = line.search(/\S/);
        if (indent <= 4) {
          currentBranch = { name: stripped, children: [] };
          branchList.push(currentBranch);
        } else if (currentBranch && indent > 4) {
          currentBranch.children.push(stripped);
        }
      }
    }

    if (branchList.length === 0) {
      branchList = [
        { name: "Core Principles", children: ["Definitions", "Framework"] },
        { name: "Practical Application", children: ["Methods", "Case Studies"] },
        { name: "Analysis & Optimization", children: ["Edge Cases", "Best Practices"] },
      ];
    }

    return { rootTitle: root, branches: branchList };
  }, [data, topicTitle]);

  // Toggle a single branch expansion
  const toggleBranch = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle all branches
  const toggleAll = () => {
    const anyExpanded = Object.values(expanded).some(v => v);
    if (anyExpanded) {
      setExpanded({});
    } else {
      const all: Record<number, boolean> = {};
      branches.forEach((_, i) => (all[i] = true));
      setExpanded(all);
    }
  };

  const copyMermaid = () => {
    const mermaidText =
      data?.mermaid ||
      `mindmap\n  root((${rootTitle}))\n` +
        branches
          .map(b => `    ${b.name}\n` + b.children.map(c => `      ${c}`).join("\n"))
          .join("\n");
    navigator.clipboard.writeText(mermaidText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSvgOrText = () => {
    copyMermaid();
  };

  // Compute Layout Heights and Path Geometry
  const nodeHeight = 36;
  const gapY = 14;
  const leafHeight = 28;
  const leafGapY = 8;

  const layout = useMemo(() => {
    let currentY = 20;
    const branchPositions = branches.map((b, idx) => {
      const isExp = !!expanded[idx];
      const startY = currentY;
      let branchBlockHeight = nodeHeight;
      const leafPositions: { text: string; y: number }[] = [];

      if (isExp && b.children.length > 0) {
        const totalLeafHeight =
          b.children.length * leafHeight + (b.children.length - 1) * leafGapY;
        branchBlockHeight = Math.max(nodeHeight, totalLeafHeight);
        let leafY = startY + (branchBlockHeight - totalLeafHeight) / 2;

        b.children.forEach(c => {
          leafPositions.push({ text: c, y: leafY + leafHeight / 2 });
          leafY += leafHeight + leafGapY;
        });
      }

      const branchCenterY = startY + branchBlockHeight / 2;
      currentY += branchBlockHeight + gapY;

      return {
        ...b,
        startY,
        branchCenterY,
        leafPositions,
        height: branchBlockHeight,
      };
    });

    const totalHeight = Math.max(360, currentY + 20);
    const rootY = totalHeight / 2;

    return {
      branchPositions,
      totalHeight,
      rootY,
    };
  }, [branches, expanded]);

  const rootX = 160;
  const branchX = 400;
  const leafX = 680;
  const totalWidth = 980;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* Top Header Bar */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-3">
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
            {rootTitle} Mindmap
          </h4>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <BookOpen className="h-3 w-3" /> {branches.length} Key Categories
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={copyMermaid}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 transition cursor-pointer"
            title="Copy Mermaid Syntax"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Mermaid"}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        className="relative overflow-auto p-6 bg-slate-50/40 dark:bg-slate-950/40 min-h-[380px] select-none"
        style={{ cursor: "default" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: `${totalWidth}px`,
            height: `${layout.totalHeight}px`,
            transition: "transform 0.15s ease-out",
          }}
          className="relative"
        >
          {/* SVG Smooth Connecting Splines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={totalWidth}
            height={layout.totalHeight}
          >
            {layout.branchPositions.map((b, i) => {
              const startX = rootX + 20;
              const startY = layout.rootY;
              const endX = branchX - 10;
              const endY = b.branchCenterY;
              const cp1X = startX + (endX - startX) * 0.5;
              const cp2X = startX + (endX - startX) * 0.5;

              return (
                <g key={`branch-line-${i}`}>
                  {/* Root to Branch Spline */}
                  <path
                    d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="#a5b4fc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="dark:stroke-indigo-500/50 transition-all duration-300"
                  />

                  {/* Branch to Leaf Splines */}
                  {b.leafPositions.map((leaf, li) => {
                    const lStartX = branchX + 180;
                    const lStartY = b.branchCenterY;
                    const lEndX = leafX - 10;
                    const lEndY = leaf.y;
                    const lcp1X = lStartX + (lEndX - lStartX) * 0.5;
                    const lcp2X = lStartX + (lEndX - lStartX) * 0.5;

                    return (
                      <path
                        key={`leaf-line-${i}-${li}`}
                        d={`M ${lStartX} ${lStartY} C ${lcp1X} ${lStartY}, ${lcp2X} ${lEndY}, ${lEndX} ${lEndY}`}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="dark:stroke-slate-700 transition-all duration-300"
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Root Node on the Left */}
          <div
            style={{
              position: "absolute",
              left: "20px",
              top: `${layout.rootY - 20}px`,
              width: "160px",
            }}
            className="z-10"
          >
            <div className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md text-center text-xs font-bold leading-tight border border-indigo-400 transition-all">
              {rootTitle}
            </div>
          </div>

          {/* Branch Nodes Column */}
          {layout.branchPositions.map((b, i) => {
            const isExp = !!expanded[i];
            const hasChildren = b.children.length > 0;

            return (
              <div
                key={`branch-${i}`}
                style={{
                  position: "absolute",
                  left: `${branchX}px`,
                  top: `${b.branchCenterY - 18}px`,
                  width: "190px",
                }}
                className="z-10"
              >
                <div
                  onClick={() => toggleBranch(i)}
                  className={cn(
                    "p-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition-all duration-200",
                    isExp
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                  )}
                >
                  <span className="truncate">{b.name}</span>
                  {hasChildren && (
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-transform",
                        isExp
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                      )}
                    >
                      {isExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Child Leaf Nodes Column */}
          {layout.branchPositions.map((b, i) => {
            if (!expanded[i]) return null;

            return b.leafPositions.map((leaf, li) => (
              <div
                key={`leaf-${i}-${li}`}
                style={{
                  position: "absolute",
                  left: `${leafX}px`,
                  top: `${leaf.y - 14}px`,
                  maxWidth: "260px",
                }}
                className="z-10 animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <div className="p-1.5 px-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                  {leaf.text}
                </div>
              </div>
            ));
          })}
        </div>

        {/* Floating Toolbar Controls (Bottom-Right matching Image 2) */}
        <div className="sticky bottom-3 float-right flex flex-col items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 gap-1 z-30">
          <button
            onClick={toggleAll}
            title="Expand / Collapse All"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
          <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setZoom(prev => Math.min(1.6, prev + 0.15))}
            title="Zoom In"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer font-bold"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
            title="Zoom Out"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={exportSvgOrText}
            title="Copy / Export"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
