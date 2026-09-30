
import exifr from 'exifr';

export interface ExifData {
    Make?: string;
    Model?: string;
    DateTimeOriginal?: string | Date;
    Software?: string;
    latitude?: number;
    longitude?: number;
    [key: string]: any;
}

export const extractExifAsync = async (fileInput: File | ArrayBuffer | Blob): Promise<ExifData | null> => {
    try {
        const exif = await exifr.parse(fileInput, { gps: true, exif: true, tiff: true });
        if (!exif) return null;
        
        return exif as ExifData;
    } catch (err) {
        console.error("Exifr error:", err);
        return null;
    }
};

// Deprecated fallback for existing sync code if any
export const extractExif = (buffer: ArrayBuffer): ExifData | null => {
    return {
       Status: "EXIF Parsing is now Async",
       Warning: "Use extractExifAsync instead"
    };
};
