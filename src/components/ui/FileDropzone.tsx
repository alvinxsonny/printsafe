"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, FileText } from "lucide-react";

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSizeMb?: number;
  className?: string;
  label?: string;
}

export function FileDropzone({
  onFilesSelected,
  acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  maxSizeMb = 15,
  className,
  label = "Upload document for secure printing",
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    const validFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        setErrorMessage(
          "Unsupported file format. Please upload PDF, JPG, PNG or WebP."
        );
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setErrorMessage(`File is too large. Max size is ${maxSizeMb} MB.`);
        return;
      }
      validFiles.push(file);
    }

    onFilesSelected(validFiles);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 rounded-[28px] border-2 border-dashed cursor-pointer",
        "bg-[var(--surface)] transition-all duration-150 text-center select-none extrude-sm",
        isDragOver
          ? "border-[var(--accent)] bg-[var(--surface-2)] scale-[1.01]"
          : "border-[var(--border)] hover:border-[var(--text-muted)]",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptedTypes.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] extrude-sm flex items-center justify-center mb-4 text-[var(--accent)]">
        {isDragOver ? (
          <FileText className="w-7 h-7 animate-bounce" />
        ) : (
          <UploadCloud className="w-7 h-7" />
        )}
      </div>

      <h4 className="text-base font-bold text-[var(--text)] tracking-tight">
        {label}
      </h4>
      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
        Drag & drop or click to browse. Supported: PDF, JPG, PNG, WebP (max{" "}
        {maxSizeMb}MB)
      </p>

      {errorMessage && (
        <p className="text-xs font-semibold text-[var(--danger)] mt-3">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
