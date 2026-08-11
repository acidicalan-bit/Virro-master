import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaObjectStore } from "@/src/application/ports/outcome/media-object-store-port";

export class SupabaseMediaObjectStore implements MediaObjectStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket = "media",
  ) {}

  async put(storageKey: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).upload(
      storageKey,
      Buffer.from(bytes),
      { contentType: mimeType, upsert: false },
    );
    if (error) throw new Error(`Storage upload failed for ${storageKey}: ${error.message}`);
  }

  async get(storageKey: string): Promise<Uint8Array> {
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);
    if (error || !data) throw new Error(`Storage download failed for ${storageKey}: ${error?.message ?? "unknown"}`);
    return new Uint8Array(await data.arrayBuffer());
  }

  async createReadUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(storageKey, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error(`Could not sign ${storageKey}: ${error?.message ?? "unknown"}`);
    return data.signedUrl;
  }
}
