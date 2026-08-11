import type { MediaObjectStore } from "@/src/application/ports/outcome/media-object-store-port";

export class InMemoryMediaObjectStore implements MediaObjectStore {
  readonly objects = new Map<string, { bytes: Uint8Array; mimeType: string }>();

  async put(storageKey: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    if (this.objects.has(storageKey)) throw new Error(`Storage object already exists: ${storageKey}`);
    this.objects.set(storageKey, { bytes: new Uint8Array(bytes), mimeType });
  }

  async get(storageKey: string): Promise<Uint8Array> {
    const object = this.objects.get(storageKey);
    if (!object) throw new Error(`Storage object not found: ${storageKey}`);
    return new Uint8Array(object.bytes);
  }

  async createReadUrl(storageKey: string): Promise<string> {
    const object = this.objects.get(storageKey);
    if (!object) throw new Error(`Storage object not found: ${storageKey}`);
    return `data:${object.mimeType};base64,${Buffer.from(object.bytes).toString("base64")}`;
  }
}
