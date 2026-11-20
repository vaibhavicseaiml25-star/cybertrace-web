import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Radio, Shield } from "lucide-react";
import { errorMessage, getIncidents, getStats } from "../api";
import { SeverityBadge, StatusBadge, formatWhen } from "./badges";

const CARDS = [
  { key: "total", label: "Total", hint: "All incidents", icon: Shield, accent: "text-[#d5e4ee]" },
  { key: "active", label: "Active", hint: "Open investigations", icon: Radio, accent: "text-[#f3d36a]" },
  { key: "critical", label: "Critical", hint: "Severity critical", icon: AlertTriangle, accent: "text-[#ff8d8d]" },
  { key: "resolved", label: "Resolved", hint: "Closed cases", icon: CheckCircle2, accent: "text-[#8ef0d8]" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStats(), getIncidents()])
      .then(([nextStats, nextIncidents]) => {
        if (cancelled) return;
        setStats(nextStats);
        setIncidents(
          [...nextIncidents].sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
          ),
        );
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

  const recent = incidents.slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6f8794]">
          Operations overview
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-[#f2f7fa]">
          Incident posture
        </h1>
      </div>

      {error && (
        <p className="border border-[#ff5d5d]/40 bg-[#ff5d5d]/10 px-3 py-2 text-sm text-[#ffb4b4]">
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.key} className="panel px-4 py-4">
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8b9aa6]">
                  {card.label}
                </p>
                <Icon className={`h-4 w-4 ${card.accent}`} strokeWidth={1.75} />
              </div>
              <p className={`mt-4 font-mono text-4xl tabular-nums ${card.accent}`}>
                {loading || !stats ? "—" : stats[card.key]}
              </p>
              <p className="mt-2 text-xs text-[#6f8794]">{card.hint}</p>
            </article>
          );
        })}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#24303a] px-4 py-3">
          <h2 className="text-sm font-medium text-[#f2f7fa]">Recent incidents</h2>
          <span className="font-mono text-[11px] text-[#6f8794]">
            {loading ? "Loading" : `${recent.length} shown`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f8794]">
              <tr className="border-b border-[#24303a]">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((incident) => (
                <tr key={incident.id} className="border-b border-[#1c262e] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[#3ddec0]">{incident.code}</td>
                  <td className="px-4 py-3">
                    <div className="text-[#e7eef3]">{incident.title}</div>
                    <div className="text-xs text-[#6f8794]">{incident.incident_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge value={incident.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={incident.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#8b9aa6]">
                    {formatWhen(incident.updated_at)}
                  </td>
                </tr>
              ))}
              {!loading && recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#6f8794]">
                    No incidents are loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
