interface Props {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="error" role="alert">
      {message}
      <button onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
