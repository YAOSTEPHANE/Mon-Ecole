"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRequestMetric = recordRequestMetric;
exports.getSlowEndpoints = getSlowEndpoints;
exports.getMetricsSummary = getMetricsSummary;
const MAX_SAMPLES = 300;
const endpoints = new Map();
function sanitizePath(path) {
    return path
        .replace(/[0-9a-fA-F]{24}/g, ':id')
        .replace(/\b\d+\b/g, ':n');
}
function recordRequestMetric(input) {
    const key = `${input.method.toUpperCase()} ${sanitizePath(input.path)}`;
    const prev = endpoints.get(key) ?? {
        count: 0,
        errors: 0,
        totalMs: 0,
        maxMs: 0,
        samples: [],
        lastStatus: 200,
        lastAt: new Date().toISOString(),
    };
    prev.count += 1;
    prev.totalMs += input.durationMs;
    prev.maxMs = Math.max(prev.maxMs, input.durationMs);
    if (input.statusCode >= 400)
        prev.errors += 1;
    prev.lastStatus = input.statusCode;
    prev.lastAt = new Date().toISOString();
    prev.samples.push(input.durationMs);
    if (prev.samples.length > MAX_SAMPLES)
        prev.samples.shift();
    endpoints.set(key, prev);
}
function percentile(values, p) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
}
function getSlowEndpoints(limit = 5) {
    return [...endpoints.entries()]
        .map(([endpoint, s]) => ({
        endpoint,
        count: s.count,
        avgMs: s.count > 0 ? Number((s.totalMs / s.count).toFixed(2)) : 0,
        p95Ms: Number(percentile(s.samples, 95).toFixed(2)),
        maxMs: Number(s.maxMs.toFixed(2)),
        errorRate: s.count > 0 ? Number(((s.errors / s.count) * 100).toFixed(2)) : 0,
        lastStatus: s.lastStatus,
        lastAt: s.lastAt,
    }))
        .sort((a, b) => b.p95Ms - a.p95Ms || b.avgMs - a.avgMs || b.count - a.count)
        .slice(0, Math.max(1, limit));
}
function getMetricsSummary() {
    let requestsTracked = 0;
    for (const s of endpoints.values())
        requestsTracked += s.count;
    return { endpointsTracked: endpoints.size, requestsTracked };
}
//# sourceMappingURL=performance-metrics.util.js.map