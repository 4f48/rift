import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { handleResponses, requestConnection } from "@/lib/receiver";
import { zodResolver } from "@hookform/resolvers/zod";
import { FLARE_URL } from "astro:env/client";
import { Loader2 } from "lucide-react";
import { useRef, useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const schema = z.object({
  code: z.string().nonempty(),
});

export default function Receiver(): JSX.Element {
  const socket = useRef<WebSocket | null>(null);
  const peerConn = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  function onSubmit(values: z.infer<typeof schema>): void {
    setLoading(true);
    setStatus("Connecting...");
    socket.current = new WebSocket(FLARE_URL);
    socket.current.onopen = () => {
      requestConnection(values.code, socket);
      peerConn.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });

      // Set up ondatachannel to receive file
      peerConn.current.ondatachannel = (event: RTCDataChannelEvent) => {
        channel.current = event.channel;
        setStatus("Receiving file...");
        let receivedBuffers: Array<Uint8Array> = [];
        let receivedBytes = 0;
        let fileMeta: { name: string; size: number; type: string } | null =
          null;

        channel.current.binaryType = "arraybuffer";
        channel.current.onmessage = (msgEvent: MessageEvent) => {
          if (typeof msgEvent.data === "string") {
            // End-of-file or meta message
            try {
              const meta = JSON.parse(msgEvent.data);
              if (meta.done && meta.name && meta.size && meta.type) {
                fileMeta = meta;
                // Reconstruct file
                if (fileMeta) {
                  const blob = new Blob(receivedBuffers, {
                    type: fileMeta.type,
                  });
                  // Offer download
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = fileMeta.name;
                  document.body.appendChild(a);
                  a.click();
                  setStatus("Download ready");
                  setLoading(false);
                  setProgress(100);
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }, 1000);
                }
              }
            } catch (e) {
              // Ignore non-meta string messages
            }
          } else if (msgEvent.data instanceof ArrayBuffer) {
            const chunk = new Uint8Array(msgEvent.data);
            receivedBuffers.push(chunk);
            receivedBytes += chunk.length;
            // Only update progress if fileMeta is set and has a valid size
            if (
              fileMeta !== null &&
              typeof fileMeta.size === "number" &&
              fileMeta.size > 0
            ) {
              setProgress(Math.floor((receivedBytes / fileMeta.size) * 100));
            }
          }
        };
      };
    };
    socket.current.onmessage = (event) =>
      handleResponses(event, peerConn, socket);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive File</CardTitle>
        <CardDescription>Enter transmit code from the sender.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transmit Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="paste-your-transmit-code-here"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Transfer
            </Button>
          </form>
        </Form>
      </CardContent>
      {(status || progress > 0) && (
        <CardFooter className="flex flex-col">
          <div className="inline-flex w-full">
            <span className="flex-1">{status}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardFooter>
      )}
    </Card>
  );
}
