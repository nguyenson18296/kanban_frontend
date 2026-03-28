import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import CommentsSection from "./comments";

export default function Activity({ taskId }: Readonly<{ taskId: string }>) {
  return (
    <Tabs className="w-full mt-12" defaultValue="activity">
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