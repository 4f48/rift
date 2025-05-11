import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JSX } from "react";
import Receiver from "./Receiver";
import Sender from "./Sender";

export default function AppTabs(): JSX.Element {
  return (
    <Tabs
      defaultValue="send"
      className="w-full px-4 md:w-[50vw] md:px-0 lg:w-[40vw] xl:w-[30vw]"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="send">Send</TabsTrigger>
        <TabsTrigger value="receive">Receive</TabsTrigger>
      </TabsList>
      <TabsContent value="send">
        <Sender />
      </TabsContent>
      <TabsContent value="receive">
        <Receiver />
      </TabsContent>
    </Tabs>
  );
}
