export declare function isWebPushConfigured(): boolean;
export declare function sendWebPushToUsers(userIds: string[], payload: {
    title: string;
    body: string;
    url?: string;
}): Promise<void>;
//# sourceMappingURL=push-send.util.d.ts.map