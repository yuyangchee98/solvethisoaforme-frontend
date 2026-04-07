"use client";

import { useEffect, useState } from "react";
import { Loader2, Bot } from "lucide-react";

import { getMe, getToken, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getMode } from "./modes";
import { UploadDropZone } from "./UploadDropZone";
import { SessionLoader } from "./SessionLoader";

interface ReviewerProps {
  modeId: string;
}

type AuthState =
  | "loading"
  | "authenticated"
  | "no-subscription"
  | "not-logged-in";

export function Reviewer({ modeId }: ReviewerProps): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthState("not-logged-in");
      return;
    }
    getMe()
      .then((u) => {
        setUser(u);
        if (
          u.subscription_status === "active" ||
          u.subscription_status === "trialing"
        ) {
          setAuthState("authenticated");
        } else {
          setAuthState("no-subscription");
        }
      })
      .catch(() => {
        setAuthState("not-logged-in");
      });
  }, []);

  const mode = getMode(modeId);

  // ── Loading ───────────────────────────────────────────────────────
  if (authState === "loading" || query === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-stone-400" />
      </div>
    );
  }

  // ── Auth gates (mirror the OA response pattern) ─────────────────
  if (authState === "not-logged-in") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-5">
          <Bot className="size-14 mx-auto text-amber-500" />
          <h2 className="text-2xl font-bold text-stone-900">Reviewer</h2>
          <p className="text-stone-600">
            Side-by-side reader for patent documents. Open a strategy doc
            alongside the prior art it references, with citations linked
            across both panes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="/login">Log in to get started</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/login?tab=register">Sign up</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "no-subscription") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-5">
          <Bot className="size-14 mx-auto text-amber-500" />
          <h2 className="text-2xl font-bold text-stone-900">Reviewer</h2>
          <p className="text-stone-600">
            An active subscription is required to use the Reviewer.
          </p>
          <Button asChild>
            <a href="/subscribe">Subscribe</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-lg font-medium">Unknown mode</h2>
          <p className="text-sm text-stone-500">
            The mode &quot;{modeId}&quot; is not registered.
          </p>
        </div>
      </div>
    );
  }

  const sessionId = query.get("session") ?? null;
  const primaryDocOverride = query.get("strategy") ?? undefined;

  if (!sessionId) {
    return <UploadDropZone mode={mode} />;
  }

  return (
    <SessionLoader
      mode={mode}
      sessionId={sessionId}
      primaryDocOverride={primaryDocOverride}
    />
  );
}
