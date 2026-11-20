import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { errorMessage, getIncidents, updateIncident } from "../api";
import { SeverityBadge, StatusBadge, formatWhen } from "./badges";

const STATUSES = ["Active", "Under Review", "Resolved"];

export default function IncidentCenter() {
  const [incidents, setIncidents] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getIncidents()
      .then((rows) => {
        if (cancelled) return;
        setIncidents(rows);
        setSelectedId(rows[0]?.id ?? null);
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return incidents;
    return incidents.filter((incident) =>
      [
        incident.code,
        incident.title,
        incident.incident_type,
        incident.severity,
        incident.status,
        incident.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [incidents, query]);

  const selected = incidents.find((incident) => incident.id === selectedId) || null;

  async function changeStatus(status) {
    if (!selected || status === selected.status) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const updated = await updateIncident(selected.id, { status });
      setIncidents((current) =>
        current.map((incident) => (incident.id === updated.id ? updated : incident)),
      );
      setNotice(`${updated.code} marked ${updated.status}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px] sm:px-6">
      <section className="panel min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#24303a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-medium text-[#f2f7fa]">Incident Center</h1>
            <p className="text-xs text-[#6f8794]">Search cases and update investigation status.</p>
          </div>
          <label className="flex items-center gap-2 border border-[#24303a] bg-[#0c1116] px-2 py-1.5 sm:w-64">
            <Search className="h-3.5 w-3.5 text-[#6f8794]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code, title, status"
              className="w-full bg-transparent text-sm text-[#e7eef3] outline-none placeholder:text-[#5d7380]"
            />
          </label>
        </div>
        {error && (
          <p className="border-b border-[#ff5d5d]/30 bg-[#ff5d5d]/10 px-4 py-2 text-sm text-[#ffb4b4]">
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f8794]">
              <tr className="border-b border-[#24303a]">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Incident</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => {
                const active = incident.id === selectedId;
                return (
                  <tr
                    key={incident.id}
                    onClick={() => {
                      setSelectedId(incident.id);
                      setNotice("");
                    }}
                    className={`cursor-pointer border-b border-[#1c262e] last:border-0 ${
                      active ? "bg-[#163038]" : "hover:bg-[#121920]"
                    }`}
                  >
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
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#6f8794]">
                    No incidents match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="panel h-fit p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6f8794]">Case file</p>
        {!selected && (
          <p className="mt-4 text-sm text-[#8b9aa6]">Select an incident to review its details.</p>
        )}
        {selected && (
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <p className="font-mono text-xs text-[#3ddec0]">{selected.code}</p>
              <h2 className="mt-1 text-lg font-medium leading-snug text-[#f2f7fa]">{selected.title}</h2>
              <p className="mt-1 text-xs text-[#8b9aa6]">{selected.incident_type}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SeverityBadge value={selected.severity} />
              <StatusBadge value={selected.status} />
            </div>
            <p className="text-sm leading-relaxed text-[#c5d3dc]">{selected.description}</p>
            <dl className="grid grid-cols-2 gap-3 border-t border-[#24303a] pt-3 text-xs">
              <div>
                <dt className="font-mono uppercase tracking-[0.14em] text-[#6f8794]">Opened</dt>
                <dd className="mt-1 text-[#d5e4ee]">{formatWhen(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase tracking-[0.14em] text-[#6f8794]">Updated</dt>
                <dd className="mt-1 text-[#d5e4ee]">{formatWhen(selected.updated_at)}</dd>
              </div>
            </dl>
            <label className="flex flex-col gap-1.5 text-xs text-[#8b9aa6]">
              Status
              <select
                value={selected.status}
                disabled={saving}
                onChange={(event) => changeStatus(event.target.value)}
                className="border border-[#24303a] bg-[#0c1116] px-2 py-2 text-sm text-[#e7eef3] outline-none focus:border-[#3ddec0]"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <p className="min-h-5 text-xs text-[#8ef0d8]">
              {saving ? "Saving to the investigation record…" : notice}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
