import { useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Play, RotateCcw } from "lucide-react";
import { errorMessage, getGraph, traverseGraph } from "../api";

const TYPE_META = {
  account: { label: "User", color: "#3ddec0" },
  device: { label: "Device", color: "#7aa2ff" },
  ip: { label: "IP", color: "#e7b008" },
  file: { label: "File", color: "#c084fc" },
  event: { label: "Event", color: "#ff7a59" },
  incident: { label: "Incident", color: "#93a4b0" },
};

const ALGORITHMS = [
  { value: "bfs", label: "BFS" },
  { value: "dfs", label: "DFS" },
  { value: "shortest_path", label: "Shortest Path" },
];

const layout = {
  name: "cose",
  animate: false,
  padding: 36,
  nodeRepulsion: 9000,
  idealEdgeLength: 110,
  nodeDimensionsIncludeLabels: true,
};

const stylesheet = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "data(color)",
      color: "#e7eef3",
      "font-size": 10,
      "font-family": "IBM Plex Sans, sans-serif",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 7,
      "text-outline-width": 2,
      "text-outline-color": "#090c10",
      width: 26,
      height: 26,
      "border-width": 2,
      "border-color": "#090c10",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.25,
      "line-color": "#31414c",
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "target-arrow-color": "#31414c",
      "arrow-scale": 0.7,
      label: "data(relation)",
      "font-size": 8,
      color: "#7f93a0",
      "font-family": "IBM Plex Mono, monospace",
      "text-rotation": "autorotate",
      "text-background-color": "#10151b",
      "text-background-opacity": 0.9,
      "text-background-padding": "2px",
    },
  },
  {
    selector: ".dim",
    style: { opacity: 0.18 },
  },
  {
    selector: "node.visited",
    style: {
      opacity: 1,
      "border-width": 3,
      "border-color": "#9ec0ff",
    },
  },
  {
    selector: "node.onpath",
    style: {
      opacity: 1,
      width: 34,
      height: 34,
      "border-width": 3,
      "border-color": "#f4f7f8",
      "z-index": 20,
    },
  },
  {
    selector: "edge.onpath",
    style: {
      opacity: 1,
      width: 3.5,
      "line-color": "#3ddec0",
      "target-arrow-color": "#3ddec0",
      "z-index": 20,
    },
  },
  {
    selector: "node.start",
    style: {
      "border-color": "#e7b008",
      "border-width": 4,
    },
  },
  {
    selector: "node.target",
    style: {
      "border-color": "#ff7a59",
      "border-width": 4,
    },
  },
];

function edgeKey(source, target) {
  return [source, target].sort().join("|");
}

export default function EvidenceExplorer() {
  const cyRef = useRef(null);
  const [graph, setGraph] = useState(null);
  const [start, setStart] = useState("");
  const [goal, setGoal] = useState("");
  const [algorithm, setAlgorithm] = useState("bfs");
  const [result, setResult] = useState(null);
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGraph()
      .then((payload) => {
        if (cancelled) return;
        setGraph(payload);
        const codes = payload.nodes.map((node) => node.code);
        setStart(codes.includes("USER-204") ? "USER-204" : codes[0] || "");
        setGoal(codes.includes("FILE-008") ? "FILE-008" : codes[codes.length - 1] || "");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const elements = useMemo(() => {
    if (!graph) return [];
    return [
      ...graph.nodes.map((node) => ({
        data: {
          id: node.code,
          label: node.label,
          type: node.node_type,
          color: TYPE_META[node.node_type]?.color || "#93a4b0",
          details: node.details,
        },
      })),
      ...graph.edges.map((edge) => ({
        data: {
          id: `e-${edge.id}`,
          source: edge.source,
          target: edge.target,
          relation: edge.relation.replaceAll("_", " "),
        },
      })),
    ];
  }, [graph]);

  const nodeByCode = useMemo(() => {
    const map = new Map();
    graph?.nodes.forEach((node) => map.set(node.code, node));
    return map;
  }, [graph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass("onpath visited dim start target");
      if (!result) return;
      const path = result.path_found ? result.path || [] : [];
      const pathNodes = new Set(path);
      const visited = new Set(result.order || []);
      const pathEdges = new Set();
      for (let index = 0; index < path.length - 1; index += 1) {
        pathEdges.add(edgeKey(path[index], path[index + 1]));
      }
      cy.nodes().forEach((node) => {
        const id = node.id();
        if (id === result.start) node.addClass("start");
        if (result.goal && id === result.goal) node.addClass("target");
        if (pathNodes.has(id)) node.addClass("onpath");
        else if (visited.has(id)) node.addClass("visited");
        else node.addClass("dim");
      });
      cy.edges().forEach((edge) => {
        const key = edgeKey(edge.source().id(), edge.target().id());
        if (pathEdges.has(key)) edge.addClass("onpath");
        else edge.addClass("dim");
      });
    });
  }, [result, elements]);

  function bindCy(cy) {
    cyRef.current = cy;
    cy.off("tap", "node");
    cy.on("tap", "node", (event) => {
      const data = event.target.data();
      setFocus({
        code: data.id,
        label: data.label,
        type: data.type,
        details: data.details,
      });
    });
    cy.once("layoutstop", () => cy.fit(undefined, 32));
  }

  async function runTraversal() {
    if (!start || !goal) {
      setError("Choose both a start node and a target node.");
      return;
    }
    setRunning(true);
    setError("");
    try {
      const payload = await traverseGraph({
        algorithm,
        start,
        goal,
      });
      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  function resetView() {
    setResult(null);
    cyRef.current?.fit(undefined, 32);
  }

  const steps = result?.visited_nodes || [];
  const path = result?.path_found ? result.path || [] : [];

  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-auto border-b border-[#24303a] p-4 lg:border-r lg:border-b-0">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6f8794]">
            Evidence graph
          </p>
          <h1 className="mt-1 text-lg font-medium text-[#f2f7fa]">Traversal controls</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-[#c5d3dc]">
              <span className="h-2.5 w-2.5" style={{ background: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-xs text-[#8b9aa6]">
          Start node
          <select
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="border border-[#24303a] bg-[#0c1116] px-2 py-2 text-sm text-[#e7eef3] outline-none focus:border-[#3ddec0]"
          >
            {graph?.nodes.map((node) => (
              <option key={node.code} value={node.code}>
                {node.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#8b9aa6]">
          Target node
          <select
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="border border-[#24303a] bg-[#0c1116] px-2 py-2 text-sm text-[#e7eef3] outline-none focus:border-[#3ddec0]"
          >
            {graph?.nodes.map((node) => (
              <option key={node.code} value={node.code}>
                {node.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#8b9aa6]">
          Algorithm
          <select
            value={algorithm}
            onChange={(event) => setAlgorithm(event.target.value)}
            className="border border-[#24303a] bg-[#0c1116] px-2 py-2 text-sm text-[#e7eef3] outline-none focus:border-[#3ddec0]"
          >
            {ALGORITHMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={runTraversal}
            disabled={running || loading}
            className="inline-flex flex-1 items-center justify-center gap-2 bg-[#3ddec0] px-3 py-2 text-sm font-medium text-[#06221c] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? "Running" : "Run path"}
          </button>
          <button
            type="button"
            onClick={resetView}
            className="inline-flex items-center justify-center border border-[#24303a] px-3 py-2 text-[#c5d3dc]"
            aria-label="Clear highlight"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {error && <p className="text-sm text-[#ffb4b4]">{error}</p>}

        {result && (
          <div className="border border-[#24303a] bg-[#0c1116] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f8794]">
              {ALGORITHMS.find((item) => item.value === result.algorithm)?.label || result.algorithm}
              {result.hops != null ? ` · ${result.hops} hops` : ""}
            </p>
            {path.length > 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-[#d5e4ee]">
                {path.map((code, index) => (
                  <span key={`${code}-${index}`}>
                    {index > 0 && <span className="text-[#3ddec0]"> → </span>}
                    {nodeByCode.get(code)?.label || code}
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#f3d36a]">
                {result.message || "No connecting path was found for that pair."}
              </p>
            )}
          </div>
        )}

        {focus && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f8794]">Selected node</p>
            <p className="mt-1 text-sm text-[#f2f7fa]">{focus.label}</p>
            <p className="text-xs text-[#8b9aa6]">
              {TYPE_META[focus.type]?.label || focus.type} · {focus.code}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#c5d3dc]">{focus.details}</p>
          </div>
        )}

        <div className="min-h-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f8794]">
            Traversal steps {steps.length ? `(${steps.length})` : ""}
          </p>
          <ol className="mt-2 flex flex-col">
            {steps.map((step, index) => (
              <li
                key={`${step.id}-${index}`}
                className="grid grid-cols-[28px_1fr] gap-2 border-t border-[#1c262e] py-2 text-xs"
              >
                <span className="font-mono text-[#3ddec0]">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="text-[#e7eef3]">{nodeByCode.get(step.id)?.label || step.id}</span>
                  <span className="mt-0.5 block text-[#6f8794]">
                    depth {step.depth}
                    {step.parent ? ` · from ${nodeByCode.get(step.parent)?.label || step.parent}` : " · origin"}
                  </span>
                </span>
              </li>
            ))}
            {!steps.length && (
              <li className="py-2 text-xs text-[#6f8794]">
                Run a traversal to list the visit order, parent, and depth of each node.
              </li>
            )}
          </ol>
        </div>
      </aside>

      <div className="relative min-h-[420px] bg-[#070a0d] lg:min-h-0">
        {elements.length > 0 && (
          <CytoscapeComponent
            elements={elements}
            stylesheet={stylesheet}
            layout={layout}
            cy={bindCy}
            wheelSensitivity={0.18}
            minZoom={0.35}
            maxZoom={2.6}
            style={{ width: "100%", height: "100%" }}
          />
        )}
        {loading && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[#8b9aa6]">
            Loading evidence graph…
          </p>
        )}
      </div>
    </div>
  );
}
