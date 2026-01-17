import { useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src?: string | null;
  onChange: (file: File) => void;
  size?: number;
};

export default function AvatarUploader({ src, onChange, size = 128 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-md border border-gray-300 overflow-hidden bg-gray-50 grid place-items-center">
        {src ? (
          <img src={src} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-20 h-20 opacity-70 text-gray-400 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor">
              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7 0 .552.448 1 1 1h12c.552 0 1-.448 1-1 0-3.866-3.134-7-7-7z" />
            </svg>
          </div>
        )}
      </div>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -right-2 bottom-2 rounded-full"
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="w-4 h-4" />
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </div>
  );
}
