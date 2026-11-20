import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Shield, LayoutDashboard, AlertTriangle, Network,
  Play, CheckCircle, Activity, Search, ArrowRight,
  Volume2, VolumeX, Zap, Server, Radio, ShieldAlert, X
} from 'lucide-react';
import { socSound } from './soundEngine';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const NODE_COLORS = {
  Firewall: '#38bdf8',
  Server: '#06b6d4',
  Workstation: '#818cf8',
  User: '#a855f7',
  IP: '#f59e0b',
  File: '#ec4899',
  Incident: '#ef4444',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_incidents: 0,
    active_incidents: 0,
    critical_incidents: 0,
    resolved_incidents: 0,
    monitored_assets: 0,
    compromised_assets: 0,
  });
  const [incidents, setIncidents] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [backendConnected, setBackendConnected] = useState(false);

  // Sound & Live Breach Alert States
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [autoMonitor, setAutoMonitor] = useState(true);
  const latestIncidentIdRef = useRef(null);
  const announcedIdsRef = useRef(new Set()); // Taaki ek attack dubara repeat na ho

  // Graph Traversal States
  const [startNode, setStartNode] = useState('IP-185.220.101.4');
  const [endNode, setEndNode] = useState('PROD-DB-01');
  const [algorithm, setAlgorithm] = useState('SHORTEST');
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [highlightedEdges, setHighlightedEdges] = useState([]);
  const [traversalLog, setTraversalLog] = useState('');

  // Turant voice aur alarm rokne ka function (Trace dabane ya banner close karne par)
  const stopAlertVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (typeof socSound.stopAlarm === 'function') {
      socSound.stopAlarm();
    }
  };

  // Toggle SOC Background Audio
  const toggleSound = () => {
    if (!soundEnabled) {
      socSound.startAmbient();
      setSoundEnabled(true);
    } else {
      stopAlertVoice();
      socSound.stopAmbient();
      setSoundEnabled(false);
    }
  };

  // Fetch all enterprise telemetry data
  const fetchTelemetry = async (checkNewBreach = false) => {
    try {
      const [statsRes, incRes, graphRes] = await Promise.all([
        axios.get(`${API_BASE}/api/dashboard/stats`),
        axios.get(`${API_BASE}/api/incidents`),
        axios.get(`${API_BASE}/api/graph`),
      ]);

      setStats(statsRes.data);
      setIncidents(incRes.data);
      setGraph(graphRes.data);
      setBackendConnected(true);

      // Pehli baar load hone par saari existing IDs ko mark kar lein taaki woh repeat na hon
      if (!checkNewBreach) {
        incRes.data.forEach(item => announcedIdsRef.current.add(item.id));
      }

      // Sirf brand-new incident par alert bajayein jo pehle kabhi nahi bola gaya
      if (incRes.data.length > 0) {
        const newest = incRes.data[0];
        if (
          checkNewBreach &&
          latestIncidentIdRef.current &&
          newest.id !== latestIncidentIdRef.current &&
          !announcedIdsRef.current.has(newest.id) &&
          newest.status === 'Active'
        ) {
          announcedIdsRef.current.add(newest.id);
          const msg = `Warning! Cyberattack detected on ${newest.target_node} in ${newest.department} department. ${newest.title}.`;
          setActiveAlert({
            id: newest.id,
            title: newest.title,
            target: newest.target_node,
            department: newest.department,
            description: newest.description,
          });
          if (soundEnabled) {
            stopAlertVoice();
            socSound.triggerCyberAttackAlarm(msg);
          }
        }
        latestIncidentIdRef.current = newest.id;
      }
    } catch {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchTelemetry(false);
  }, []);

  // Poll every 4 seconds for real-time organization agent telemetry
  useEffect(() => {
    if (!autoMonitor) return;
    const timer = setInterval(() => {
      fetchTelemetry(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoMonitor, soundEnabled]);

  // Simulate an Organization Cyberattack on Demand
  const handleSimulateAttack = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/telemetry/simulate-attack`);
      if (res.data?.breach_detected) {
        const inc = res.data.incident;
        announcedIdsRef.current.add(inc.id);
        setActiveAlert({
          id: inc.id,
          title: inc.title,
          target: inc.target_node,
          department: inc.department,
          description: inc.vector,
        });
        stopAlertVoice();
        socSound.triggerCyberAttackAlarm(res.data.alert_message);
        await fetchTelemetry(false);
        latestIncidentIdRef.current = inc.id;
      }
    } catch (err) {
      console.error('Simulation failed', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setIncidents(prev => prev.map(inc => (inc.id === id ? { ...inc, status: newStatus } : inc)));
    try {
      await axios.patch(`${API_BASE}/api/incidents/${id}/status`, { status: newStatus });
      fetchTelemetry(false);
    } catch (err) {
      console.error(err);
    }
  };

  const runTraversal = async () => {
    stopAlertVoice(); // Graph trace chalate hi awaaz band
    setActiveAlert(null);
    try {
      const res = await axios.post(`${API_BASE}/api/graph/traverse`, {
        start_node: startNode,
        end_node: endNode,
        algorithm,
      });
      setHighlightedNodes(res.data.visited_nodes || []);
      setHighlightedEdges(res.data.traversed_edges || []);
      setTraversalLog(`${res.data.algorithm}: ${res.data.path_string}`);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.target_node || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#070b12] text-slate-200">
      {/* EMERGENCY CYBERATTACK FLASHING BANNER */}
      {activeAlert && (
        <div className="bg-rose-600/95 border-b-2 border-rose-300 text-white px-6 py-3 flex items-center justify-between animate-pulse shadow-lg shadow-rose-900/50 z-50">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-yellow-200 shrink-0" />
            <div>
              <div className="font-bold text-sm tracking-wider uppercase">
                CRITICAL CYBERATTACK DETECTED • NODE: {activeAlert.target} ({activeAlert.department})
              </div>
              <div className="text-xs text-rose-100">
                [{activeAlert.id}] {activeAlert.title} — {activeAlert.description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                stopAlertVoice(); // Trace dabate hi awaaz turant band
                setStartNode(activeAlert.target);
                setActiveTab('explorer');
                setActiveAlert(null);
              }}
              className="px-3 py-1.5 bg-white text-rose-700 font-bold text-xs rounded hover:bg-rose-100"
            >
              Trace Node in Graph
            </button>
            <button
              onClick={() => {
                stopAlertVoice(); // Cross dabane par bhi awaaz band
                setActiveAlert(null);
              }}
              className="p-1 hover:bg-rose-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* TOP SOC COMMAND BAR */}
      <header className="bg-[#0c121e] border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/40 rounded-lg">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-wider text-white">CYBERTRACE</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded">
                ENTERPRISE SOC v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Organization Threat Detection & Forensics</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Operations Overview
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${activeTab === 'incidents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
          >
            <AlertTriangle className="w-4 h-4" /> Incident Center ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition ${activeTab === 'explorer' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
          >
            <Network className="w-4 h-4" /> Org Topology & Graph ({graph.nodes.length})
          </button>
        </nav>

        {/* Audio, Live Sensor & Attack Simulation Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition ${soundEnabled
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            title="Enable SOC Background Radar Audio & Voice Alerts"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'SOC Audio: ON' : 'Enable SOC Audio'}
          </button>

          <button
            onClick={handleSimulateAttack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-950 transition"
          >
            <Zap className="w-3.5 h-3.5" /> Simulate Org Attack
          </button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <span className="text-slate-300">{backendConnected ? 'LIVE STREAM' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
        {activeTab === 'dashboard' && (
          <div>
            {/* Top 6 Enterprise Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <StatCard title="Monitored Assets" value={stats.monitored_assets} sub="Servers & PCs" icon={<Server className="text-cyan-400 w-5 h-5" />} />
              <StatCard title="Compromised Nodes" value={stats.compromised_assets} sub="Immediate Action" icon={<ShieldAlert className="text-rose-500 w-5 h-5" />} danger={stats.compromised_assets > 0} />
              <StatCard title="Total Incidents" value={stats.total_incidents} sub="Logged Events" icon={<Activity className="text-blue-400 w-5 h-5" />} />
              <StatCard title="Active Threats" value={stats.active_incidents} sub="Open Cases" icon={<AlertTriangle className="text-amber-400 w-5 h-5" />} />
              <StatCard title="Critical Severity" value={stats.critical_incidents} sub="High Risk" icon={<Radio className="text-rose-400 w-5 h-5" />} />
              <StatCard title="Resolved Cases" value={stats.resolved_incidents} sub="Contained" icon={<CheckCircle className="text-emerald-400 w-5 h-5" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Organization Infrastructure Health */}
              <div className="bg-[#0c121e] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Organization Endpoints & Servers
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono">{graph.nodes.length} Connected</span>
                </div>
                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {graph.nodes
                    .filter(n => ['Server', 'Workstation', 'Firewall'].includes(n.entity_type))
                    .map(node => (
                      <div
                        key={node.id}
                        className={`p-3 rounded-lg border flex items-center justify-between ${node.status === 'Compromised'
                          ? 'bg-rose-950/30 border-rose-500/50'
                          : node.status === 'Warning'
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-900/70 border-slate-800'
                          }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">{node.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {node.department}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {node.label} • IP: {node.ip_address}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${node.status === 'Compromised'
                              ? 'bg-rose-500/20 text-rose-400'
                              : node.status === 'Warning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                          >
                            {node.status.toUpperCase()}
                          </span>
                          <div className="text-[11px] font-mono text-slate-400 mt-1">CPU: {node.cpu_load}%</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent Live SOC Incident Feed */}
              <div className="lg:col-span-2 bg-[#0c121e] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Live Autonomous Threat Feed
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoMonitor}
                      onChange={e => setAutoMonitor(e.target.checked)}
                      className="accent-cyan-500"
                    />
                    Auto-Poll Org Sensors (4s)
                  </label>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {incidents.slice(0, 15).map(inc => (
                    <div
                      key={inc.id}
                      className="p-3.5 bg-slate-900/75 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 bg-cyan-500/15 text-cyan-400 rounded font-bold">
                            {inc.id}
                          </span>
                          <span className="font-semibold text-sm text-white">{inc.title}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-amber-300 rounded">
                            Target: {inc.target_node}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{inc.description}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${inc.severity === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : inc.severity === 'High'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                            }`}
                        >
                          {inc.severity} • Risk {inc.risk_score}
                        </span>
                        <span className="text-[11px] text-slate-400">{inc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
              <h2 className="text-xl font-bold text-white">Enterprise Incident Investigation Center</h2>
              <div className="flex items-center gap-3">
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="bg-[#0c121e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical Only</option>
                  <option value="High">High Only</option>
                  <option value="Medium">Medium Only</option>
                  <option value="Low">Low Only</option>
                </select>

                <div className="relative w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ID, node, department..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0c121e] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0c121e] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400 bg-slate-900/70">
                    <th className="p-3.5">Incident ID</th>
                    <th className="p-3.5">Threat & Vector</th>
                    <th className="p-3.5">Target Asset</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Containment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">{inc.id}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{inc.title}</div>
                        <div className="text-slate-400 mt-0.5">{inc.description}</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-amber-300">{inc.target_node}</div>
                        <div className="text-slate-500">{inc.department}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-1 rounded font-bold ${inc.severity === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : inc.severity === 'High'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                            }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold">{inc.status}</td>
                      <td className="p-3.5">
                        <select
                          value={inc.status}
                          onChange={e => handleStatusChange(inc.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:border-cyan-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Resolved">Resolved (Heal Node)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Organization Network Topology & Evidence Explorer</h2>
                <p className="text-xs text-slate-400">
                  Red pulsing rings indicate compromised servers/workstations. Click any node to set Start Node.
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs bg-[#0c121e] px-3 py-2 rounded-lg border border-slate-800">
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Graph Traversal Controls */}
            <div className="bg-[#0c121e] border border-slate-800 rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Node</label>
                <select
                  value={startNode}
                  onChange={e => setStartNode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {graph.nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({n.entity_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Traversal Algorithm</label>
                <select
                  value={algorithm}
                  onChange={e => setAlgorithm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="BFS">Breadth-First Search (Blast Radius)</option>
                  <option value="DFS">Depth-First Search (Deep Attack Chain)</option>
                  <option value="SHORTEST">Shortest Lateral Movement Path</option>
                </select>
              </div>

              {algorithm === 'SHORTEST' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Node</label>
                  <select
                    value={endNode}
                    onChange={e => setEndNode(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {graph.nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.id} ({n.entity_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={runTraversal}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                <Play className="w-4 h-4" /> Run Graph Trace
              </button>

              <button
                onClick={() => {
                  setHighlightedNodes([]);
                  setHighlightedEdges([]);
                  setTraversalLog('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Clear Path
              </button>
            </div>

            {traversalLog && (
              <div className="mb-4 p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-xs text-cyan-300 font-mono flex items-center gap-2">
                <ArrowRight className="w-4 h-4 shrink-0" /> {traversalLog}
              </div>
            )}

            {/* Full Organization Topology SVG */}
            <div className="bg-[#0c121e] border border-slate-800 rounded-xl p-4 overflow-x-auto">
              <svg width="1020" height="760" className="mx-auto">
                {/* Edges */}
                {graph.edges.map((edge, idx) => {
                  const s = graph.nodes.find(n => n.id === edge.source);
                  const t = graph.nodes.find(n => n.id === edge.target);
                  if (!s || !t) return null;
                  const isHighlighted = highlightedEdges.some(
                    he =>
                      (he.source === s.id && he.target === t.id) ||
                      (he.source === t.id && he.target === s.id)
                  );
                  return (
                    <g key={idx}>
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isHighlighted ? '#22d3ee' : '#1e293b'}
                        strokeWidth={isHighlighted ? 3 : 1.2}
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {graph.nodes.map(node => {
                  const active = highlightedNodes.includes(node.id);
                  const compromised = node.status === 'Compromised';
                  const baseColor = NODE_COLORS[node.entity_type] || '#38bdf8';
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onClick={() => setStartNode(node.id)}
                    >
                      {compromised && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={24}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={active ? 19 : 15}
                        fill="#070b12"
                        stroke={active ? '#22d3ee' : compromised ? '#ef4444' : baseColor}
                        strokeWidth={active ? 3.5 : 2.2}
                      />
                      <text
                        x={node.x}
                        y={node.y + 3}
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {node.entity_type.slice(0, 3).toUpperCase()}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 27}
                        fill={compromised ? '#fca5a5' : '#cbd5e1'}
                        fontSize="9.5"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {node.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, sub, icon, danger }) {
  return (
    <div
      className={`rounded-xl p-4 border flex items-center justify-between ${danger ? 'bg-rose-950/25 border-rose-500/50' : 'bg-[#0c121e] border-slate-800'
        }`}
    >
      <div>
        <p className="text-xs text-slate-400">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${danger ? 'text-rose-400' : 'text-white'}`}>{value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
      </div>
      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">{icon}</div>
    </div>
  );
}