export interface MediaObjectStore {
  put(storageKey: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  get(storageKey: string): Promise<Uint8Array>;
  createReadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}
