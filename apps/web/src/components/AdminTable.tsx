import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

/** Simple responsive admin data table. */
export function AdminTable<T extends { id?: string }>({
  columns,
  rows,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  if (!rows.length) {
    return <p className="px-4 py-10 text-center text-sm text-muted">{empty ?? "—"}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-start text-sm">
        <thead className="border-b border-line bg-canvas">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-3 text-start font-semibold text-muted", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-line transition-colors last:border-0 hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-ink", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
