export function TextOutput({
  id,
  label,
  children,
  prose = false,
}: {
  id: string;
  label: string;
  children: string;
  prose?: boolean;
}) {
  return (
    <div className="text-output-group">
      <p id={`${id}-label`} className="output-label">
        {label}
      </p>
      <div
        id={id}
        role="region"
        aria-labelledby={`${id}-label`}
        tabIndex={0}
        className={`text-output${prose ? " text-output-prose" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
