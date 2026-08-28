"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function fileToWebp(file: File, quality = 0.6) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("webp"))), "image/webp", quality),
  );
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

export function ImageUpload({ examId, images }: { examId: string; images: { id: string; image_url: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const webp = await fileToWebp(file, 0.6);
      const fd = new FormData();
      fd.set("examId", examId);
      fd.set("file", webp);
      await fetch("/api/images", { method: "POST", body: fd });
    }
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/images?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="stack">
      <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
      {busy ? <p className="muted">压缩上传中…</p> : null}
      <div className="row">
        {images.map((img) => (
          <div key={img.id}>
            {/* user-uploaded remote URLs; next/image needs per-project storage host */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.image_url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12 }} />
            <button className="btn ghost" type="button" onClick={() => remove(img.id)}>
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
