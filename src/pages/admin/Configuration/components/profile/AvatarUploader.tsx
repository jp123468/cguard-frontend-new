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
          <img
            src="https://static-00.iconduck.com/assets.00/user-avatar-generic-icon-512x512-yvvtgpby.png"
            alt="avatar"
            className="w-20 h-20 opacity-70"
          />
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
