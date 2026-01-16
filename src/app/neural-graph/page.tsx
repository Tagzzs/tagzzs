"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./neural.css";

// Hooks
import { useGraphData, GraphNode as HookGraphNode } from "@/hooks/useGraphData";
import { useChat } from "@/contexts/ChatContext";

// Components
import LibraryPanel from "./components/LibraryPanel";
import GraphCanvasContainer from "./components/GraphCanvasContainer";
import DetailViewLayer from "./components/DetailViewLayer";
import NeuralRightPanel from "./components/NeuralRightPanel";
import FloatingControls from "./components/FloatingControls";
import { QuickCaptureModal } from "@/components/modals/QuickCaptureModal";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Backend URL for AI chat
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const COLORS = {
  root: "#FFFFFF",
  cat: "#A78BFA",
  sub: "#3B82F6",
  content: "#22D3EE",
  dust: "rgba(167, 139, 250, 0.4)",
};

// --- TYPES ---
interface GraphNode {
  id: string | number;
  label?: string;
  type: "root" | "category" | "sub" | "content" | "dust";
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  parent?: string | number;
  data?: {
    name: string;
    desc: string;
    image: string;
    content: string;
    contentId?: string;
  };
}

interface Link {
  source: string | number;
  target: string | number;
}

export default function NeuralGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const detailLayerRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const miniGraphRef = useRef<SVGSVGElement>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // -- STATE FOR SIDEBAR --
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const [quickCaptureModalOpen, setQuickCaptureModalOpen] = useState(false);

  // Use shared chat context
  const {
    messages: chatMessages,
    sendMessage,
    isSending: isChatLoading,
  } = useChat();

  // Fetch real data from backend
  const { graphData, loading: graphLoading, isEmpty } = useGraphData();
  const deepData = graphData.deepData;

  // Keep ref in sync with state
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Store graph data in refs for canvas access
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<Link[]>([]);
  const cameraRef = useRef({ x: 0, y: 0, z: 1200 });
  const rotationRef = useRef({ x: 0.2, y: 0.3 });
  const targetRotationRef = useRef({ x: 0.2, y: 0.3 });
  const focusPosRef = useRef({ x: 0, y: 0, z: 0 });
  const targetFocusPosRef = useRef({ x: 0, y: 0, z: 0 });
  const zoomRef = useRef(1.0);
  const isFocusedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const toggleGroup = (id: string, forceOpen: boolean = false) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      const isCategory = id.startsWith("cat-");
      const isSub = id.startsWith("sub-");

      // If already open and not forcing, just close it
      if (!forceOpen && next.has(id)) {
        next.delete(id);
        // If closing a category, also close its subs
        if (isCategory) {
          const catIdx = id.split("-")[1];
          Array.from(next).forEach((key) => {
            if (key.startsWith(`sub-${catIdx}-`)) next.delete(key);
          });
        }
        return next;
      }

      // Opening (or forcing open) -> Close siblings
      if (isCategory) {
        // Close all other categories and their subs
        Array.from(next).forEach((key) => {
          if (key.startsWith("cat-") || key.startsWith("sub-")) {
            next.delete(key);
          }
        });
        next.add(id);
      } else if (isSub) {
        const parts = id.split("-");
        const catIdx = parts[1];

        // Close other subs in this category
        Array.from(next).forEach((key) => {
          if (key.startsWith(`sub-${catIdx}-`) && key !== id) {
            next.delete(key);
          }
        });
        next.add(id);
        // Ensure parent is open
        next.add(`cat-${catIdx}`);
      }

      return next;
    });
  };

  // --- PANEL TOGGLE FUNCTIONS ---
  const toggleLeftPanel = () => {
    leftPanelRef.current?.classList.toggle("active");
    const isActive = leftPanelRef.current?.classList.contains("active");
    if (isActive) {
      detailLayerRef.current?.classList.add("push-left");
      containerRef.current?.classList.add("push-left");
      floatingRef.current?.classList.add("push-left");
    } else {
      detailLayerRef.current?.classList.remove("push-left");
      containerRef.current?.classList.remove("push-left");
      floatingRef.current?.classList.remove("push-left");
    }
  };

  const selectNode = (node: GraphNode) => {
    setSelectedNode(node);
    isFocusedRef.current = true;
    zoomRef.current = 2.0;
    targetFocusPosRef.current = { x: node.x, y: node.y, z: node.z };
    targetRotationRef.current.x = 0;

    leftPanelRef.current?.classList.add("active");
    rightPanelRef.current?.classList.add("active");
    // floatingRef.current?.classList.add('docked'); // Removed to prefer shifting
    detailLayerRef.current?.classList.add("push-right");
    detailLayerRef.current?.classList.add("push-left");
    containerRef.current?.classList.add("push-right");
    containerRef.current?.classList.add("push-left");
    floatingRef.current?.classList.add("push-left");
    floatingRef.current?.classList.add("push-right");

    renderMiniGraph(node);

    if (node.type === "category") {
      const idx = deepData.findIndex((c) => c.name === node.label);
      if (idx >= 0) toggleGroup(`cat-${idx}`, true);
    } else if (node.type === "content") {
      openDetailView(node);

      // Auto-expand tree to show item
      let catIdx = -1,
        subIdx = -1;
      deepData.forEach((cat, i) => {
        cat.subs.forEach((sub, j) => {
          if (sub.items.some((item) => item.name === node.label)) {
            catIdx = i;
            subIdx = j;
          }
        });
      });

      if (catIdx !== -1) {
        // Exclusively expand the path to this node
        setExpandedGroups(
          new Set([
            `cat-${catIdx}`,
            ...(subIdx !== -1 ? [`sub-${catIdx}-${subIdx}`] : []),
          ])
        );
      }
    }
  };

  const openDetailView = (node: GraphNode) => {
    detailLayerRef.current?.classList.add("active");
  };

  const handleChatSubmit = async (
    text: string,
    source: "floating" | "sidebar"
  ) => {
    if (!text.trim()) return;

    // Open right panel if not open
    if (!rightPanelRef.current?.classList.contains("active")) {
      rightPanelRef.current?.classList.add("active");
      detailLayerRef.current?.classList.add("push-right"); // Should push right when chat opens panel
      containerRef.current?.classList.add("push-right");
    }

    if (source === "floating") {
      // Search for node
      const searchTerm = text.toLowerCase();
      const foundNode = nodesRef.current.find(
        (n) => n.label?.toLowerCase() === searchTerm
      );

      if (foundNode) {
        selectNode(foundNode);
      } else {
        // If no match, just show Root context in mini-map
        if (nodesRef.current.length > 0) {
          renderMiniGraph(nodesRef.current[0]); // 0 is always root
        }
      }

      // Dock the floating bar into the sidebar -> Changed to Shift
      // floatingRef.current?.classList.add('docked');
      floatingRef.current?.classList.add("push-right");
    }

    // Send via shared chat context
    await sendMessage(text);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleChatSubmit(inputValue, "floating");
      setInputValue("");
    }
  };

  const closeDetailView = () => {
    detailLayerRef.current?.classList.remove("active");
    resetCamera();
  };

  const resetCamera = () => {
    targetFocusPosRef.current = { x: 0, y: 0, z: 0 };
    targetRotationRef.current = { x: 0.2, y: 0.3 };
    zoomRef.current = 1;
    setSelectedNode(null);
    isFocusedRef.current = false;

    rightPanelRef.current?.classList.remove("active");
    leftPanelRef.current?.classList.remove("active");
    floatingRef.current?.classList.remove("docked");
    detailLayerRef.current?.classList.remove("active");
    detailLayerRef.current?.classList.remove("push-left");
    detailLayerRef.current?.classList.remove("push-right");
    containerRef.current?.classList.remove("push-left");
    containerRef.current?.classList.remove("push-right");
    floatingRef.current?.classList.remove("push-left");
    floatingRef.current?.classList.remove("push-right");
    // floatingRef.current?.classList.remove('docked');
    setShowSummary(false);
  };

  // --- MINI GRAPH RENDERER ---
  const renderMiniGraph = (centerNode: GraphNode) => {
    const svg = miniGraphRef.current;
    if (!svg) return;
    svg.innerHTML = "";
    const w = svg.clientWidth || 320;
    const h = svg.clientHeight || 200;
    const cx = w / 2;
    const cy = h / 2;

    let neighbors: string[] = [];
    if (centerNode.type === "root") {
      neighbors = deepData.slice(0, 3).map((c: { name: string }) => c.name);
    } else if (centerNode.type === "category") {
      // Find adjacent tags (siblings)
      const catName = centerNode.label;
      const catIndex = deepData.findIndex(
        (c: { name: string }) => c.name === catName
      );
      const prevCat = deepData[catIndex - 1]?.name;
      const nextCat = deepData[catIndex + 1]?.name;
      neighbors = [prevCat, nextCat, "Root"].filter(Boolean) as string[];
    } else if (centerNode.type === "sub") {
      // Show parent and siblings
      neighbors = ["Parent Tag", "Sibling Sub", "Content Items"];
    } else {
      // Content node - show parent sub and siblings
      neighbors = ["Parent Sub", "Related Content", "Source"];
    }

    const rad = 80;
    neighbors.forEach((n, i) => {
      const angle = (i / neighbors.length) * 2 * Math.PI;
      const x2 = cx + Math.cos(angle) * rad;
      const y2 = cy + Math.sin(angle) * rad;

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", cx.toString());
      line.setAttribute("y1", cy.toString());
      line.setAttribute("x2", x2.toString());
      line.setAttribute("y2", y2.toString());
      line.setAttribute("stroke", "#3f3f46");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", x2.toString());
      circle.setAttribute("cy", y2.toString());
      circle.setAttribute("r", "6");
      circle.setAttribute("fill", "#d4d4d8");
      svg.appendChild(circle);

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", x2.toString());
      text.setAttribute("y", (y2 + 14).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#d4d4d8");
      text.setAttribute("font-size", "8");
      text.textContent = n.length > 10 ? n.substring(0, 8) + ".." : n;
      svg.appendChild(text);
    });

    // Center node with pulse
    const centerGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    const centerCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    centerCircle.setAttribute("cx", cx.toString());
    centerCircle.setAttribute("cy", cy.toString());
    centerCircle.setAttribute("r", "14");
    centerCircle.setAttribute("fill", "#ffffff");
    centerCircle.classList.add("center-pulse");

    const centerText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    centerText.setAttribute("x", cx.toString());
    centerText.setAttribute("y", (cy + 4).toString());
    centerText.setAttribute("text-anchor", "middle");
    centerText.setAttribute("fill", "#000");
    centerText.setAttribute("font-size", "10");
    centerText.setAttribute("font-weight", "bold");
    centerText.textContent = centerNode.label
      ? centerNode.label.substring(0, 4).toUpperCase()
      : "NODE";

    centerGroup.appendChild(centerCircle);
    centerGroup.appendChild(centerText);
    svg.appendChild(centerGroup);
  };

  // --- GRAPH INITIALIZATION ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Projection function - Moved up to avoid ReferenceError
    const project = (x: number, y: number, z: number) => {
      const rx = x - focusPosRef.current.x;
      const ry = y - focusPosRef.current.y;
      const rz = z - focusPosRef.current.z;
      const cosY = Math.cos(rotationRef.current.y),
        sinY = Math.sin(rotationRef.current.y);
      const x1 = rx * cosY - rz * sinY;
      const z1 = rz * cosY + rx * sinY;
      const cosX = Math.cos(rotationRef.current.x),
        sinX = Math.sin(rotationRef.current.x);
      const y2 = ry * cosX - z1 * sinX;
      const z2 = z1 * cosX + ry * sinX;
      const perspective = cameraRef.current.z / (cameraRef.current.z - z2);
      return {
        x: width / 2 + x1 * perspective * zoomRef.current,
        y: height / 2 + y2 * perspective * zoomRef.current,
        scale: perspective * zoomRef.current,
        z: z2,
      };
    };

    // Separate Update and Render logic
    const update = () => {
      // Lerp focus and rotation
      focusPosRef.current.x +=
        (targetFocusPosRef.current.x - focusPosRef.current.x) * 0.1;
      focusPosRef.current.y +=
        (targetFocusPosRef.current.y - focusPosRef.current.y) * 0.1;
      focusPosRef.current.z +=
        (targetFocusPosRef.current.z - focusPosRef.current.z) * 0.1;

      // Auto-rotate when not dragging and not focused
      if (!isDraggingRef.current && !isFocusedRef.current) {
        rotationRef.current.y += 0.001;
      }

      rotationRef.current.x +=
        (targetRotationRef.current.x - rotationRef.current.x) * 0.1;
      rotationRef.current.y +=
        (targetRotationRef.current.y - rotationRef.current.y) * 0.1;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const projected = nodesRef.current.map((n) => {
        const p = project(n.x, n.y, n.z);
        return { ...n, px: p.x, py: p.y, scale: p.scale, pz: p.z };
      });

      projected.sort((a, b) => a.pz - b.pz);

      const nodeMap = new Map(projected.map((p) => [p.id, p]));

      // Draw links
      linksRef.current.forEach((link) => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t && s.pz < cameraRef.current.z) {
          ctx.beginPath();
          ctx.moveTo(s.px, s.py);
          ctx.lineTo(t.px, t.py);
          const isLeaf = s.type === "content" || t.type === "content";
          ctx.strokeStyle = `rgba(167, 139, 250, ${
            isLeaf ? 0.05 : 0.15 * s.scale
          })`;
          ctx.stroke();
        }
      });

      // Draw nodes
      projected.forEach((p) => {
        if (p.pz >= cameraRef.current.z - 50) return;
        const alpha = Math.max(0, Math.min(1, p.scale));

        ctx.beginPath();
        if (p.type === "dust") {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.3;
          ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = alpha;
          // Halo for selected
          if (selectedNodeRef.current && selectedNodeRef.current.id === p.id) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.arc(p.px, p.py, p.radius * p.scale + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
          }
          ctx.fillStyle = p.color;
          ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
          ctx.fill();

          // Labels
          let showLabel = false;
          if (p.type === "root" || p.type === "category") {
            showLabel = true;
          } else if (p.type === "sub") {
            if (
              selectedNodeRef.current &&
              (selectedNodeRef.current.id === p.id ||
                selectedNodeRef.current.id === p.parent)
            )
              showLabel = true;
            else if (p.scale > 1.8) showLabel = true;
          } else if (p.type === "content") {
            if (
              selectedNodeRef.current &&
              (selectedNodeRef.current.id === p.id ||
                selectedNodeRef.current.id === p.parent)
            )
              showLabel = true;
          }

          if (showLabel && p.label) {
            ctx.fillStyle = "#fff";
            const fontSize = p.type === "category" ? 12 : 10;
            ctx.font = `${p.type === "category" ? 600 : 400} ${Math.max(
              9,
              fontSize * p.scale
            )}px Inter`;
            ctx.textAlign = "center";
            ctx.fillText(p.label, p.px, p.py - p.radius * p.scale - 6);
          }
        }
        ctx.globalAlpha = 1;
      });
    };

    // Main Loop
    let animationId: number;
    const loop = () => {
      update();
      render();
      animationId = requestAnimationFrame(loop);
    };

    const resize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      // Force immediate render after resize to prevent flicker
      render();
    };

    // Use ResizeObserver for robust size detection
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);

    // Initial resize
    resize();

    // Create graph data from hook or build manually
    const createContentGraph = () => {
      // If we have hook data, use it directly
      if (graphData.nodes.length > 0) {
        const nodeList: GraphNode[] = graphData.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type as GraphNode["type"],
          x: n.x,
          y: n.y,
          z: n.z,
          radius: n.radius,
          color: n.color,
          parent: n.parent,
          data: n.data
            ? {
                name: n.data.title || "Untitled",
                desc: n.data.description || "",
                image:
                  n.data.thumbnailUrl ||
                  "https://picsum.photos/seed/default/800/400",
                content: n.data.description || "",
                contentId: n.data.id,
              }
            : undefined,
        }));

        const linkList: Link[] = graphData.links.map((l) => ({
          source: l.source,
          target: l.target,
        }));

        // Add dust particles
        for (let i = 0; i < 200; i++) {
          const r = 450 + Math.random() * 200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          nodeList.push({
            id: "d" + i,
            type: "dust",
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            radius: Math.random() * 1.5,
            color: COLORS.dust,
          });
        }

        return { nodes: nodeList, links: linkList };
      }

      // Fallback: create empty graph with just root
      const nodeList: GraphNode[] = [
        {
          id: "root",
          label: "Root",
          type: "root",
          x: 0,
          y: 0,
          z: 0,
          radius: 12,
          color: COLORS.root,
        },
      ];
      const linkList: Link[] = [];

      // Add dust particles
      for (let i = 0; i < 200; i++) {
        const r = 450 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        nodeList.push({
          id: "d" + i,
          type: "dust",
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          radius: Math.random() * 1.5,
          color: COLORS.dust,
        });
      }

      return { nodes: nodeList, links: linkList };
    };

    const data = createContentGraph();
    nodesRef.current = data.nodes;
    linksRef.current = data.links;

    // Get node at position
    const getNodeAt = (x: number, y: number) => {
      const projected = nodesRef.current
        .map((n) => {
          const p = project(n.x, n.y, n.z);
          return { ...n, px: p.x, py: p.y, scale: p.scale, pz: p.z };
        })
        .sort((a, b) => b.pz - a.pz);

      for (const p of projected) {
        if (p.pz >= cameraRef.current.z - 50) continue;
        if (p.type === "dust") continue;
        const hitR = Math.max(15, p.radius * p.scale * 2);
        if ((x - p.px) ** 2 + (y - p.py) ** 2 < hitR ** 2) return p;
      }
      return null;
    };

    // Event handlers
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (node) {
        selectNode(node);
      } else {
        // Click on empty canvas - reset if selected and detail overlay is NOT active
        if (
          selectedNodeRef.current &&
          !detailLayerRef.current?.classList.contains("active")
        ) {
          resetCamera();
        }
        isDraggingRef.current = true;
        canvas.style.cursor = "grabbing";
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        targetRotationRef.current.y +=
          (e.clientX - lastMouseRef.current.x) * 0.005;
        targetRotationRef.current.x +=
          (e.clientY - lastMouseRef.current.y) * 0.005;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = node ? "pointer" : "grab";
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      canvas.style.cursor = "grab";
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current -= e.deltaY * 0.001;
      zoomRef.current = Math.max(0.5, Math.min(2.5, zoomRef.current));
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [graphData]);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Header with toggle button */}

      <header className="h-14 bg-transparent pointer-events-none z-[100] flex items-start pt-4 px-4 shrink-0 absolute top-0 left-0 right-0">
        <div className="md:hidden pointer-events-auto mr-2">
          <SidebarTrigger />
        </div>
        <button
          onClick={toggleLeftPanel}
          className="group pointer-events-auto text-white transition bg-black/50 backdrop-blur-md rounded-full p-2.5 border border-white/10 shadow-xl hover:border-white/20 hover:bg-black/80 flex flex-col justify-center gap-[3px] items-center w-9 h-9 box-border"
          title="Toggle Library"
        >
          <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors rounded-full"></div>
          <div className="w-4 h-0.5 bg-white/60 group-hover:bg-white transition-colors rounded-full"></div>
        </button>
      </header>

      <main className="flex-1 relative w-full h-full bg-black">
        {/* Left Panel */}
        <LibraryPanel
          leftPanelRef={leftPanelRef}
          deepData={deepData}
          expandedGroups={expandedGroups}
          selectedNode={selectedNode}
          nodesRef={nodesRef}
          onToggleGroup={toggleGroup}
          onSelectNode={selectNode}
          onToggle={toggleLeftPanel}
        />

        {/* Canvas Container */}
        <GraphCanvasContainer
          containerRef={containerRef}
          canvasRef={canvasRef}
          onResetCamera={resetCamera}
        />

        {/* Detail View Layer */}
        <DetailViewLayer
          detailLayerRef={detailLayerRef}
          selectedNode={selectedNode}
          showSummary={showSummary}
          onClose={closeDetailView}
          onToggleSummary={() => setShowSummary(!showSummary)}
        />

        {/* Right Panel */}
        <NeuralRightPanel
          rightPanelRef={rightPanelRef}
          onResetCamera={resetCamera}
        />

        {/* Floating Controls */}
        <FloatingControls
          floatingRef={floatingRef}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onInputKeyDown={handleInputKeyDown}
          onOpenAddModal={() => setQuickCaptureModalOpen(true)}
        />
      </main>

      <QuickCaptureModal
        isOpen={quickCaptureModalOpen}
        onClose={() => setQuickCaptureModalOpen(false)}
      />
    </div>
  );
}
