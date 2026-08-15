"use client";

import { type FormEventHandler, type ReactNode, type RefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  children: ReactNode;
  className?: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  labelledBy: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  variant?: "default" | "setup";
};

export function Modal({
  children,
  className = "edit-sheet",
  describedBy,
  initialFocusRef,
  labelledBy,
  onClose,
  onSubmit,
  variant = "default",
}: ModalProps) {
  const surfaceRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (initialFocusRef?.current || surfaceRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !surfaceRef.current) return;
      const focusable = Array.from(surfaceRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div className={`modal-backdrop modal-backdrop-${variant}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={surfaceRef}
        className={`modal-surface ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {onSubmit ? <form className="modal-form" onSubmit={onSubmit}>{children}</form> : children}
      </section>
    </div>,
    document.body,
  );
}
