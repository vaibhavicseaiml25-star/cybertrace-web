const SEVERITY = {
  Critical: "border-[#ff5d5d]/35 bg-[#ff5d5d]/10 text-[#ff9a9a]",
  High: "border-[#ff8a3d]/35 bg-[#ff8a3d]/10 text-[#ffc08a]",
  Medium: "border-[#e7b008]/35 bg-[#e7b008]/10 text-[#f3d36a]",
  Low: "border-[#3ddec0]/30 bg-[#3ddec0]/10 text-[#8ef0d8]",
};

const STATUS = {
  Active: "border-[#e7b008]/40 bg-[#e7b008]/10 text-[#f3d36a]",
  "Under Review": "border-[#7aa2ff]/40 bg-[#7aa2ff]/10 text-[#b7cbff]",
  Resolved: "border-[#3ddec0]/35 bg-[#3ddec0]/10 text-[#8ef0d8]",
};

function Pill({ value, map }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${map[value] || "border-[#24303a] text-[#8b9aa6]"}`}
    >
      {value}
    </span>
  );
}

export function SeverityBadge({ value }) {
  return <Pill value={value} map={SEVERITY} />;
}

export function StatusBadge({ value }) {
  return <Pill value={value} map={STATUS} />;
}

export function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
