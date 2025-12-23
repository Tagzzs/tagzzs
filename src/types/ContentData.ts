export type ContentData = {
    createdAt: string;
    tagsId: string[]; 
    link: string;
    title: string;
    description: string;
    contentType: string;
    contentSource: string;
    personalNotes: string;
    readTime: string;
    updatedAt: string;
    thumbnailUrl: string | null | undefined;
    rawContent?: string; 
    embeddingMetadata?: {
        chromaDocIds?: string[];
        summaryDocId?: string;
        chunkCount?: number;
    };
}