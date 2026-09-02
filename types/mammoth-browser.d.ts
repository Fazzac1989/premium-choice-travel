/**
 * mammoth ships a browser build alongside its Node one but types only the Node
 * entry. The proposal importer reads Word files in the browser — a 9MB file is
 * more than a serverless request body can carry — so the shape it actually
 * uses is declared here.
 */
declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string;
    messages: { type: string; message: string }[];
  }>;
}
