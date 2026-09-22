import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Textarea } from "./input";

function shorten(value: string, length: number) {
  if (length < 4 || value.length <= length) return value;
  const start = Math.ceil((length - 1) / 2);
  return `${value.slice(0, start)}…${value.slice(-(length - start - 1))}`;
}

export function CopyableField({
  label,
  value,
  length = 24,
  mdLength = 36,
}: {
  label: string;
  value: string;
  length?: number;
  mdLength?: number;
}) {
  const id = useId();
  const [result, setResult] = useState<{
    value: string;
    status: "copied" | "error";
  } | null>(null);
  const mounted = useRef(true);
  const copied = result?.value === value && result.status === "copied";
  const failed = result?.value === value && result.status === "error";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setResult(null), 1500);
    return () => clearTimeout(timer);
  }, [copied, result]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      if (mounted.current) setResult({ value, status: "copied" });
    } catch {
      if (mounted.current) setResult({ value, status: "error" });
    }
  }
  return (
    <div className="copyable-field-group">
      <p id={`${id}-label`} className="output-label">
        {label}
      </p>
      <button
        type="button"
        className="copyable-field"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        title={value}
        onClick={() => void copy()}
      >
        <span className="copyable-field-value" aria-hidden="true">
          {copied ? (
            "Copied!"
          ) : (
            <>
              <span className="copyable-field-mobile">
                {shorten(value, length)}
              </span>
              <span className="copyable-field-desktop">
                {shorten(value, mdLength)}
              </span>
            </>
          )}
        </span>
        {copied ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
      </button>
      <span id={`${id}-hint`} className="sr-only">
        Click to copy the full value.
      </span>
      <span className="sr-only" role="status">
        {copied ? `${label} copied.` : ""}
      </span>
      {failed && (
        <div className="copyable-field-fallback">
          <p role="alert" className="small">
            Copy unavailable. Select and copy the full value below.
          </p>
          <Textarea
            readOnly
            rows={3}
            className="recipient-field"
            aria-label={`Full ${label}`}
            value={value}
            onFocus={(event) => event.target.select()}
          />
        </div>
      )}
    </div>
  );
}
