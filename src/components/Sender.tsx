import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { handleMessage, sendOffer } from "@/lib/sender";
import { zodResolver } from "@hookform/resolvers/zod";
import { DATA_CHANNEL, FLARE_URL } from "astro:env/client";
import { Loader2 } from "lucide-react";
import { useRef, useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CodeDialog from "./CodeDialog";

const schema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => !file || file.size <= 1024 ** 2 * 5000,
      "File must not be larger than 5 GB.",
    ),
});

export default function Sender(): JSX.Element {
  const socket = useRef<WebSocket | null>(null);
  const peerConn = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | undefined>(undefined);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  function onSubmit(values: z.infer<typeof schema>): void {
    setLoading(true);
    setStatus("Connecting...");
    socket.current = new WebSocket(FLARE_URL);
    socket.current.onopen = () => {
      peerConn.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });
      channel.current = peerConn.current.createDataChannel(DATA_CHANNEL);

      sendOffer(socket, peerConn);

      setStatus("Waiting for code...");

      // Wait for channel to open before sending file
      channel.current.onopen = async () => {
        setStatus("Transferring...");
        const file = form.getValues("file");
        if (!file) {
          setStatus("No file selected.");
          setLoading(false);
          return;
        }
        const chunkSize = 64 * 1024; // 64KB
        let offset = 0;
        let sent = 0;
        while (offset < file.size) {
          const slice = file.slice(offset, offset + chunkSize);
          const arrayBuffer = await slice.arrayBuffer();
          channel.current?.send(arrayBuffer);
          offset += chunkSize;
          sent += arrayBuffer.byteLength;
          setProgress(Math.floor((sent / file.size) * 100));
        }
        // Send end-of-file signal with file metadata
        channel.current?.send(
          JSON.stringify({
            done: true,
            name: file.name,
            size: file.size,
            type: file.type,
          }),
        );
        setStatus("Transfer complete!");
        setLoading(false);
      };
    };
    function codeSetter(code: string): void {
      setCode(code);
    }
    function statusSetter(status: string): void {
      setStatus(status);
    }
    if (socket.current) {
      socket.current.onmessage = (event) =>
        handleMessage(
          event,
          channel,
          peerConn,
          socket,
          codeSetter,
          statusSetter,
          setCode,
        );
    }
  }
  return (
    <>
      <CodeDialog code={code} />
      <Card>
        <CardHeader>
          <CardTitle>Send File</CardTitle>
          <CardDescription>
            Select or drop the file or directory to send.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-2"
            >
              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...props } }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="file"
                        onChange={(event) => {
                          onChange(event.target.files && event.target.files[0]);
                        }}
                        disabled={loading}
                        {...props}
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
        {status && (
          <CardFooter className="flex flex-col">
            <div className="inline-flex w-full">
              <span className="flex-1">{status}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardFooter>
        )}
      </Card>
    </>
  );
}
