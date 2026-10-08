import { useRef } from "react";

interface Props {
  busy: boolean;
  onUpload: (file: File) => void;
  onDemo: () => void;
}

export function UploadControls({ busy, onUpload, onDemo }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="actions">
      <button className="primary" disabled={busy} onClick={() => input.current?.click()}>
        Upload .ibt
      </button>
      <button disabled={busy} onClick={onDemo}>
        Load demo
      </button>
      <input
        ref={input}
        type="file"
        accept=".ibt"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
