"use client";

import { ReactNode } from "react";
import { useUIState2 } from "./UIState2Provider";

export function VideoTrigger({
  url,
  className,
  children,
}: {
  url: string;
  className?: string;
  children: ReactNode;
}) {
  const { openVideo } = useUIState2();
  return (
    <a
      href={url}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openVideo(url);
      }}
    >
      {children}
    </a>
  );
}
