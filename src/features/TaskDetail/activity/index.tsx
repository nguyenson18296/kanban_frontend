import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import CommentsSection from "./comments";

function getInitialTab() {
  return globalThis.location.hash.startsWith("#comment-") ? "comments" : "activity";
}

export default function Activity({ taskId }: Readonly<{ taskId: string }>) {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const hash = globalThis.location.hash;
    if (!hash.startsWith("#comment-")) return;

    const scrollToComment = () => {
      const el = document.querySelector<HTMLElement>(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("bg-white");
        el.classList.add("bg-indigo-100", "transition-colors", "duration-300");
        setTimeout(() => {
          el.classList.remove("bg-indigo-100");
          el.classList.add("bg-white");
        }, 1500);
        return true;
      }
      return false;
    };

    // Element may already exist
    if (scrollToComment()) return;

    // Otherwise wait for it to appear (comments still loading)
    const observer = new MutationObserver(() => {
      if (scrollToComment()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop watching after 5s if element never appears (stale/deleted comment)
    const timeout = setTimeout(() => observer.disconnect(), 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Tabs className="w-full mt-12" value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        Activity Log
      </TabsContent>
      <TabsContent value="comments">
        <CommentsSection taskId={taskId} />
      </TabsContent>
    </Tabs>
  )
}