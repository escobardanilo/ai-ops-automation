"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icons";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="page"><div className="empty-state error-boundary" role="alert"><span className="empty-state-icon"><Icon name="alert" /></span><h1>Something went wrong</h1><p>The page could not be loaded. No workflow data was changed.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button></div></div>;
}
