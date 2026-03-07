import { ImageIcon } from "lucide-react";

type Artifact = {
  step_key: string;
  path: string;
  mime_type: string;
  file_size: number | null;
};

interface Props {
  artifacts: Artifact[];
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function TabImagens({ artifacts }: Props) {
  const images = artifacts.filter((a) => a.mime_type?.startsWith("image/"));

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/5">
          <ImageIcon className="size-6 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-600">Nenhuma imagem gerada ainda</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <p className="text-[10px] text-zinc-600 mb-3">{images.length} imagens geradas</p>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="group relative rounded-lg border border-white/5 bg-[#1A1A1A] overflow-hidden aspect-video flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.path}
              alt={`Imagem ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <div className="text-[10px] text-white/70 font-mono truncate w-full">
                {img.step_key}
                {img.file_size && <span className="ml-1 text-zinc-500">{formatSize(img.file_size)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
