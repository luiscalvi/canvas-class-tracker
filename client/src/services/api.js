export async function fetchBackend(path) {
    const res = await fetch(path); // relative, hits Vite dev server
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
        throw new Error(data?.error || data?.raw || `HTTP ${res.status} ${res.statusText}`);
    }

    return data;
}
