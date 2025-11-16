export interface ScrapedData {
    url: string;
    title: string;
    html: string;
    text: string;
    metadata: {
        description?: string;
        author?: string;
    };
    _images?: Array<{
        src: string;
        alt?: string;
        srcset?: string | null;
    }>;
    _bytes?: number;
    _isPlaywright?: boolean;
}

export interface ActorInput {
    url?: string;
    urls?: string[];
    vaultPath: string;
    noteName?: string;
    folderPath?: string;
    addMetadata?: boolean;
    tags?: string[];
    // ... etc
}
