import React, { ReactNode, useCallback } from "react";
import { Link, LinkProps } from "react-router-dom";

interface PrefetchLinkProps extends LinkProps {
  children: ReactNode;
  prefetchFn?: () => void;
}

export function PrefetchLink({ children, prefetchFn, onMouseEnter, ...props }: PrefetchLinkProps) {
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchFn) {
        prefetchFn();
      }
      if (onMouseEnter) {
        onMouseEnter(e);
      }
    },
    [prefetchFn, onMouseEnter]
  );

  return (
    <Link onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
}
