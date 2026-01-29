import { useState } from "react";

export default function AssignmentsPage() {
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const [mode, setMode] = useState("window"); // window | future | all
    const [days, setDays] = useState(21);

    async function load() {
        try {
            setLoading(true);
            setErr("");
            setData(null);

            const qs =
                mode === "window"
                    ? `/api/assignments?mode=window&days=${encodeURIComponent(days)}`
                    : `/api/assignments?mode=${encodeURIComponent(mode)}`;

            const res = await fetch(qs);

            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch {
                json = { error: text };
            }

            if (!res.ok) {
                throw new Error(json?.error || `HTTP ${res.status} ${res.statusText}`);
            }

            setData(json);
        } catch (e) {
            setErr(e.message || "Load failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 16, fontFamily: "Arial" }}>
            <h1 style={{ marginBottom: 12 }}>Assignments</h1>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label>
                    Mode:{" "}
                    <select value={mode} onChange={(e) => setMode(e.target.value)}>
                        <option value="window">Next N days</option>
                        <option value="future">Future only</option>
                        <option value="all">All due dates</option>
                    </select>
                </label>

                {mode === "window" && (
                    <label>
                        Days:{" "}
                        <input
                            type="number"
                            min="1"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            style={{ width: 80 }}
                        />
                    </label>
                )}

                <button onClick={load} disabled={loading}>
                    {loading ? "Loading..." : "Load Assignments"}
                </button>
            </div>

            {err && (
                <pre style={{ marginTop: 12, color: "salmon", whiteSpace: "pre-wrap" }}>
          {err}
        </pre>
            )}

            {data && (
                <div style={{ marginTop: 16 }}>
                    <p>
                        Welcome, <b>{data.userName}</b>
                        {data.mode === "window" ? ` (next ${data.windowDays} days)` : ""}
                    </p>

                    {Array.isArray(data.assignments) && data.assignments.length === 0 ? (
                        <p>No assignments found for this filter.</p>
                    ) : (
                        <ul style={{ marginTop: 12, lineHeight: 1.6 }}>
                            {data.assignments.map((a) => (
                                <li key={a.id}>
                                    <b>{a.name}</b> — {new Date(a.due_at).toLocaleString()} —{" "}
                                    {a.daysLeft} day{a.daysLeft === 1 ? "" : "s"} left
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
