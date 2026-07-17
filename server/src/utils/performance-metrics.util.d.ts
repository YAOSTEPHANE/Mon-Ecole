export declare function recordRequestMetric(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
}): void;
export declare function getSlowEndpoints(limit?: number): Array<{
    endpoint: string;
    count: number;
    avgMs: number;
    p95Ms: number;
    maxMs: number;
    errorRate: number;
    lastStatus: number;
    lastAt: string;
}>;
export declare function getMetricsSummary(): {
    endpointsTracked: number;
    requestsTracked: number;
};
//# sourceMappingURL=performance-metrics.util.d.ts.map