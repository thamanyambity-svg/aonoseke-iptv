export const RELAY_PATH: string;
export const MAX_MANIFEST_BYTES: number;
export const MAX_SEGMENT_BYTES: number;
export function allowedOriginsFrom(playlist: unknown): Set<string>;
export function parseTarget(raw: unknown, allowedOrigins: Set<string>): URL | null;
export function relayUrl(absolute: string): string;
export function rewriteManifest(text: string, baseUrl: string): string;
export function isManifest(contentType: string | null | undefined, url: string, bodyStart?: string): boolean;
