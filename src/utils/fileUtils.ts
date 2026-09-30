
export const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getHexHeader = async (file: File): Promise<string> => {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
};

export const extractStrings = async (file: File): Promise<string[]> => {
    // Read first 2MB to avoid browser freeze on large files
    const slice = file.slice(0, 2 * 1024 * 1024);
    const text = await slice.text();
    
    // Find printable strings (ASCII) of length >= 4
    const regex = /[ -~]{4,}/g;
    const matches = text.match(regex) || [];
    
    return matches.slice(0, 500); // Return top 500 to keep UI responsive
};
