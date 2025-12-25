import React, { useRef, useState, useEffect } from "react";

type Props = {
  initialPreview?: string | null;
  onFileSelected?: (file: File | null) => void;
  accept?: string;
  square?: boolean;
  tall?: boolean;
};

export default function ImageUploader({ initialPreview, onFileSelected, accept = "image/*", square, tall }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview ?? null);

  useEffect(() => {
    setPreview(initialPreview ?? null);
  }, [initialPreview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setPreview(initialPreview ?? null);
      onFileSelected?.(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelected?.(file);
  }

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: square ? 120 : tall ? 120 : 96,
          background: "#f6f6f6",
          border: "1px dashed #ccc",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ color: "#666" }}>Click to upload</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: "none" }} />
    </div>
  );
}
