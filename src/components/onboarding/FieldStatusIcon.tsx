import { Check, X } from "lucide-react";

export default function FieldStatusIcon(props: { valid: boolean }) {
  return props.valid ? (
    <Check size={14} style={{ color: "var(--green)" }} />
  ) : (
    <X size={14} style={{ color: "var(--red)" }} />
  );
}
