import type { FileDetails } from './types';
import { parseComfyMetadata } from './metadata-parser/metadataParser';

export type GallerySearchScope = 'all' | 'filename' | 'metadata' | 'positive' | 'negative' | 'model' | 'seed';

const normalize = (value: unknown) => String(value ?? '').toLowerCase();

export function matchesGallerySearch(image: FileDetails, searchTerm: string, scope: GallerySearchScope) {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const parsed = parseComfyMetadata(image.metadata);
    const metadataText = [
        ...Object.values(parsed),
        JSON.stringify(image.metadata ?? {}),
    ].join(' ');

    const scopedText: Record<GallerySearchScope, string> = {
        all: `${image.name} ${metadataText}`,
        filename: image.name,
        metadata: metadataText,
        positive: parsed['Positive Prompt'] ?? '',
        negative: parsed['Negative Prompt'] ?? '',
        model: parsed.Model ?? '',
        seed: parsed.Seed ?? '',
    };

    return normalize(scopedText[scope]).includes(term);
}
