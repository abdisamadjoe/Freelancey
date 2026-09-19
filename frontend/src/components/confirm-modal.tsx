"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  variant?: "danger" | "default";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setInputValue("");
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
    setInputValue("");
  }, []);

  const needsTextConfirm = !!options?.confirmText;
  const textMatches = !needsTextConfirm || inputValue === options?.confirmText;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal open={!!options} onClose={() => handleClose(false)} size="sm" hideCloseButton>
        {options ? (
          <>
            <ModalHeader title={options.title} description={options.message} />
            {needsTextConfirm ? (
              <ModalBody className="space-y-2">
                <Label htmlFor="confirm-text-input">
                  Type{" "}
                  <span className="font-semibold text-text-primary">{options.confirmText}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-text-input"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </ModalBody>
            ) : null}
            <ModalFooter className={needsTextConfirm ? undefined : "border-t-0 bg-transparent"}>
              <Button appearance="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                variant={options.variant === "danger" ? "danger" : "primary"}
                disabled={!textMatches}
                onClick={() => handleClose(true)}
              >
                {options.confirmLabel || "Confirm"}
              </Button>
            </ModalFooter>
          </>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
