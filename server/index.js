const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// rate limit only API routes
app.use(
    "/api",
    rateLimit({
        windowMs: 60 * 1000,
        max: 30,
    })
);

app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET"],
    })
);

app.use(express.json());

const PORT = process.env.PORT || 3001;
const CANVAS_BASE = process.env.CANVAS_BASE;
const TOKEN = process.env.CANVAS_TOKEN;

// ✅ simple in-memory cache (server only)
let cache = { ts: 0, key: "", data: null };
const CACHE_MS = 30 * 1000;

if (!CANVAS_BASE || !TOKEN) {
    console.error("Missing CANVAS_BASE or CANVAS_TOKEN in server/.env");
    process.exit(1);
}

async function canvasGet(path) {
    const url = `${CANVAS_BASE}${path}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${TOKEN}` },
    });

    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    if (!res.ok) {
        const msg = typeof data === "string" ? data : JSON.stringify(data);
        throw new Error(`Canvas ${res.status} ${res.statusText}: ${msg}`);
    }

    return data;
}

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

app.get("/", (req, res) => {
    res.send("Server running. Try /api/me or /api/assignments?mode=all|future|window&days=21");
});

app.get("/api/me", async (req, res) => {
    try {
        const user = await canvasGet("/api/v1/users/self");
        res.json({ name: user?.name ?? "Unknown" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/assignments", async (req, res) => {
    try {
        const cacheKey = req.originalUrl;

        // ✅ cache hit
        if (cache.key === cacheKey && Date.now() - cache.ts < CACHE_MS && cache.data) {
            return res.json(cache.data);
        }

        const mode = (req.query.mode || "window").toLowerCase(); // all | future | window
        const days = Number(req.query.days || 21);
        const windowDays = Number.isFinite(days) ? days : 21;

        const user = await canvasGet("/api/v1/users/self");
        const courses = await canvasGet("/api/v1/courses?enrollment_state=active");

        if (!Array.isArray(courses)) {
            return res.status(500).json({ error: "Courses response was not an array." });
        }

        let allAssignments = [];
        for (const course of courses) {
            const assigns = await canvasGet(`/api/v1/courses/${course.id}/assignments`);
            if (Array.isArray(assigns)) allAssignments.push(...assigns);
        }

        const today = new Date();
        const windowStart = startOfDay(today);
        const windowEnd = endOfDay(new Date(windowStart.getTime() + windowDays * 86400000));

        const dueAssignments = allAssignments
            .filter((a) => typeof a.due_at === "string" && a.due_at.trim().length > 0)
            .map((a) => {
                const dueDate = new Date(a.due_at);
                return {
                    id: a.id,
                    name: a.name,
                    courseId: a.course_id,
                    due_at: a.due_at,
                    daysLeft: Math.round((startOfDay(dueDate) - windowStart) / 86400000),
                };
            })
            .filter((a) => {
                const d = new Date(a.due_at);
                if (mode === "all") return true;
                if (mode === "future") return d >= windowStart;
                return d >= windowStart && d <= windowEnd;
            })
            .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

        const payload = {
            userName: user?.name ?? "Unknown",
            mode,
            windowDays: mode === "window" ? windowDays : null,
            assignments: dueAssignments,
        };

        // ✅ save cache
        cache = { ts: Date.now(), key: cacheKey, data: payload };

        res.json(payload);
    } catch (e) {
        console.error("assignments error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
