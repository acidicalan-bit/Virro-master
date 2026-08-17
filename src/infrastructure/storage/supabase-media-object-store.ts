import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaObjectStore } from "@/src/application/ports/outcome/media-object-store-port";

export class SupabaseMediaObjectStore implements MediaObjectStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket = "media",
    private readonly ownerTenantId?: string,
  ) {}

  async put(storageKey: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    this.assertTenantKey(storageKey);
    const { error } = await this.client.storage.from(this.bucket).upload(
      storageKey,
      Buffer.from(bytes),
      { contentType: mimeType, upsert: false },
    );
    if (error) throw new Error(`Storage upload failed for ${storageKey}: ${error.message}`);
  }

  async get(storageKey: string): Promise<Uint8Array> {
    this.assertTenantKey(storageKey);
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);
    if (error || !data) throw new Error(`Storage download failed for ${storageKey}: ${error?.message ?? "unknown"}`);
    const blobLike = data as unknown as { arrayBuffer?: () => Promise<ArrayBuffer>; stream?: () => ReadableStream<Uint8Array> };
    if (typeof blobLike.arrayBuffer === "function") return new Uint8Array(await blobLike.arrayBuffer());
    const signed = await this.client.storage.from(this.bucket).createSignedUrl(storageKey, 60);
    if (!signed.error && signed.data?.signedUrl) {
      const response = await fetch(signed.data.signedUrl);
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    }
    if (typeof blobLike.stream === "function") {
      const reader = blobLike.stream().getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) { const next = await reader.read(); if (next.done) break; const chunk = new Uint8Array(next.value); chunks.push(chunk); size += chunk.byteLength; }
      const result = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
      return result;
    }
    if (Buffer.isBuffer(data)) return new Uint8Array(data);
    if (data instanceof Uint8Array) return new Uint8Array(data);
    throw new Error(`Storage download returned an unsupported byte representation for ${storageKey}.`);
  }

  async createReadUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    this.assertTenantKey(storageKey);
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(storageKey, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error(`Could not sign ${storageKey}: ${error?.message ?? "unknown"}`);
    return data.signedUrl;
  }

  private assertTenantKey(storageKey: string): void {
    if (this.ownerTenantId && !storageKey.startsWith(`tenants/${this.ownerTenantId}/`)) {
      throw new Error("Storage object is outside the canonical tenant namespace.");
    }
  }
}
