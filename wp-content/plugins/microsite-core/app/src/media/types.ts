export interface MediaAsset {
  id: number;
  name: string;
  sizes: Record<string, { url: string; width: number; height: number }>;
}

export interface MediaList {
  items: MediaAsset[];
  pagination: { page: number; totalPages: number; total: number };
  limits: { maxBytes: number; maxPixels: number; maxFiles: number };
}

export interface PhotoReference {
  attachmentId: number;
  alt: string;
}
