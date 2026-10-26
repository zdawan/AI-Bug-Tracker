import { Layers3, Clock3, CheckCircle2, ShieldAlert } from "lucide-react";

const accents = {
  violet: {
    icon: "bg-violet-100 text-violet-700",
    glow: "from-violet-50/80",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    glow: "from-amber-50/80",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    glow: "from-emerald-50/80",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    glow: "from-rose-50/80",
  },
};

function StatCard({ label, value, icon: Icon, description, accent }) {
  const theme = accents[accent] || accents.violet;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${theme.glow} via-white to-white p-5 shadow-[0_4px_24px_rgba(74,58,130,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(74,58,130,0.09)] sm:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.icon} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export default function ReportOverview({ bugs, loadedEmail }) {
  const openCount = bugs.filter((bug) => bug.status === "Open").length;
  const closedCount = bugs.filter((bug) => bug.status === "Closed").length;

  const highSeverityCount = bugs.filter(
    (bug) => bug.severity === "High",
  ).length;

  const cards = [
    {
      label: "Total reports",
      value: bugs.length,
      icon: Layers3,
      description: "All reports associated with this email",
      accent: "violet",
    },
    {
      label: "Open reports",
      value: openCount,
      icon: Clock3,
      description: "Reports currently marked open",
      accent: "amber",
    },
    {
      label: "Resolved reports",
      value: closedCount,
      icon: CheckCircle2,
      description: "Reports currently marked closed",
      accent: "emerald",
    },
    {
      label: "High severity",
      value: highSeverityCount,
      icon: ShieldAlert,
      description: "Reports marked with high severity",
      accent: "rose",
    },
  ];

  return (
    <section className="mt-8 sm:mt-10">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 size={17} className="text-violet-600" />

        <h2 className="text-sm font-semibold text-slate-800">
          Report overview
        </h2>

        {loadedEmail && (
          <span className="ml-auto max-w-[60%] truncate text-xs text-slate-500">
            {loadedEmail}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
