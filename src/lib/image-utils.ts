import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true, // Use web worker for better performance
    fileType: "image/jpeg", // Convert to JPEG for better compression
    initialQuality: 0.8, // Initial quality
  };

  try {
    console.log(
      "Original file size:",
      (file.size / 1024 / 1024).toFixed(2),
      "MB"
    );

    const compressedFile = await imageCompression(file, options);

    console.log(
      "Compressed file size:",
      (compressedFile.size / 1024 / 1024).toFixed(2),
      "MB"
    );

    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    // Return original file if compression fails
    return file;
  }
}

export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function isValidImageType(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return validTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}
