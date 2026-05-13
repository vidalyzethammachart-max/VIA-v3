import { useMemo, useRef, useState } from "react";

import MainNavbar from "../components/MainNavbar";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/x-m4v", "video/quicktime", "video/webm"];
const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];
const UPLOAD_VIDEO_API_URL = import.meta.env.VITE_UPLOAD_VIDEO_API_URL || "/api/upload-video";

type UploadResult = {
  fileName: string;
  safeFileName: string;
  mimeType: string;
  fileSize: number;
  receivedAt: string;
  subjectName?: string;
  orderNumber?: string;
  status: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function validateVideoFile(file: File | null) {
  if (!file) return "Choose a video file before uploading.";
  if (file.size > MAX_FILE_SIZE_BYTES) return "Video file must be 100MB or smaller.";

  const hasAllowedType = file.type.startsWith("video/") || ACCEPTED_VIDEO_TYPES.includes(file.type);
  const hasAllowedExtension = ACCEPTED_VIDEO_EXTENSIONS.includes(getExtension(file.name));
  if (!hasAllowedType && !hasAllowedExtension) {
    return "Only video files are allowed.";
  }

  return null;
}

export default function VideoUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const selectedFileError = useMemo(() => validateVideoFile(selectedFile), [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadResult(null);
    setErrorMessage(file ? validateVideoFile(file) : null);
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateVideoFile(selectedFile);
    if (validationError || !selectedFile) {
      setErrorMessage(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("subject_name", subjectName || "");
    formData.append("order_number", orderNumber || "");

    setIsUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    try {
      const uploadResponse = await fetch(UPLOAD_VIDEO_API_URL, {
        method: "POST",
        body: formData,
      });

      let response: { detail?: string; error?: string } & Partial<UploadResult> = {};
      try {
        response = await uploadResponse.json();
      } catch {
        response = {};
      }

      if (uploadResponse.ok) {
        setUploadResult({
          fileName: selectedFile.name,
          safeFileName: selectedFile.name,
          mimeType: selectedFile.type || "video/*",
          fileSize: selectedFile.size,
          receivedAt: new Date().toISOString(),
          subjectName,
          orderNumber,
          status: "sent",
          ...response,
        });
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setErrorMessage(
        response.detail
          ? `${response.error || "Video upload failed."} ${response.detail}`
          : response.error || "Video upload failed.",
      );
    } catch {
      setErrorMessage("Network error while uploading the video.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MainNavbar title="Video Upload" subtitle="Send video file to n8n" />

      <main className="mx-auto max-w-4xl px-4 py-6 md:py-8">
        <section className="ui-hover-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Upload video
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Accepted formats: video files up to 100MB.
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Subject name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  disabled={isUploading}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Order number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  disabled={isUploading}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-[#04418b] focus:ring-2 focus:ring-[#04418b]/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Video file
              </label>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#04418b] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#03326a] disabled:opacity-60 dark:text-slate-300"
              />
              {selectedFile && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/20 dark:text-sky-200">
                Uploading video to n8n...
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/20 dark:text-red-200">
                {errorMessage}
              </div>
            )}

            {uploadResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <p className="font-semibold">Video sent to n8n</p>
                <p className="mt-1 break-all">{uploadResult.fileName}</p>
                <p className="mt-1 text-xs">
                  {formatBytes(uploadResult.fileSize)} | {uploadResult.mimeType} | {uploadResult.status}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading || Boolean(selectedFileError)}
                className="btn-primary"
              >
                {isUploading ? "Uploading..." : "Upload video"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
