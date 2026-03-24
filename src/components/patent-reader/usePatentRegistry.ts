import { useState, useEffect, useRef, useCallback } from "react";

export interface PatentRegistryEntry {
  patentNumber: string;
  title: string;
}

type RegistryMessage =
  | { type: "announce"; tabId: string; patent: PatentRegistryEntry }
  | { type: "request-announce" }
  | { type: "close"; tabId: string };

const CHANNEL_NAME = "patent-reader-registry";

/**
 * Cross-window patent registry using BroadcastChannel.
 * Each patent reader window announces its current patent and discovers others.
 */
export function usePatentRegistry() {
  const tabId = useRef(crypto.randomUUID());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const currentRef = useRef<PatentRegistryEntry | null>(null);
  const [others, setOthers] = useState<Map<string, PatentRegistryEntry>>(
    new Map()
  );

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (e: MessageEvent<RegistryMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case "announce":
          if (msg.tabId === tabId.current) return;
          setOthers((prev) => {
            const next = new Map(prev);
            next.set(msg.tabId, msg.patent);
            return next;
          });
          break;
        case "close":
          setOthers((prev) => {
            if (!prev.has(msg.tabId)) return prev;
            const next = new Map(prev);
            next.delete(msg.tabId);
            return next;
          });
          break;
        case "request-announce":
          if (currentRef.current) {
            channel.postMessage({
              type: "announce",
              tabId: tabId.current,
              patent: currentRef.current,
            } satisfies RegistryMessage);
          }
          break;
      }
    };

    // Discover existing tabs
    channel.postMessage({ type: "request-announce" } satisfies RegistryMessage);

    const handleUnload = () => {
      channel.postMessage({
        type: "close",
        tabId: tabId.current,
      } satisfies RegistryMessage);
      channel.close();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const announce = useCallback((patent: PatentRegistryEntry | null) => {
    currentRef.current = patent;
    if (patent) {
      channelRef.current?.postMessage({
        type: "announce",
        tabId: tabId.current,
        patent,
      } satisfies RegistryMessage);
    } else {
      channelRef.current?.postMessage({
        type: "close",
        tabId: tabId.current,
      } satisfies RegistryMessage);
    }
  }, []);

  return { others, announce };
}
