export async function getAssignments({ mode = "window", days = 21 } = {}) {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (mode === "window") params.set("days", String(days));

    const res = await fetch(`/api/assignments?${params.toString()}`);
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) throw new Error(data?.error || data?.raw || `HTTP ${res.status}`);
    return data;
}
