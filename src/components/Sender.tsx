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
import { sendIceCandidate } from "@/lib/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { DATA_CHANNEL, FLARE_URL } from "astro:env/client";
import { Loader2 } from "lucide-react";
import { useRef, useState, type JSX, type RefObject } from "react";
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
  const channel = useRef<RTCDataChannel | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const rtc = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | undefined>(undefined);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: z.infer<typeof schema>): void {
    setLoading(true);
    setProgress(0);
    setStatus("Connecting...");

    rtc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
    });
    channel.current = rtc.current.createDataChannel(DATA_CHANNEL);
    socket.current = new WebSocket(FLARE_URL);

    socket.current.onopen = () => {
      if (!rtc.current || !socket.current)
        throw Error("rtc and socket have to be set before starting signaling");
      sendOffer(rtc, socket.current, {
        passphraseLength: 6,
      });
      setStatus("Waiting for passphrase...");
    };
    socket.current.onmessage = (event) => {
      if (!rtc.current || !socket.current)
        throw Error("rtc and socket have to be set before starting signaling");
      handleMessage(event, rtc, socket.current, {
        codeSetter: setCode,
        statusSetter: setStatus,
      });
    };

    channel.current.onopen = () => {
      if (!channel.current) throw Error("data channel is null");
      channel.current.binaryType = "arraybuffer";
      sendFile(values.file, channel.current);
      setLoading(false);
      setStatus(undefined);
    };
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

interface OfferConfig {
  passphraseLength: number;
}
async function sendOffer(
  rtc: RefObject<RTCPeerConnection | null>,
  socket: WebSocket,
  config: OfferConfig,
): Promise<void> {
  if (!rtc.current) throw Error("rtc peer connection is null");
  const offer = await rtc.current.createOffer();

  if (!offer.sdp) throw Error("offer sdp is undefined: " + offer);
  rtc.current.setLocalDescription(offer);

  const msg: SignalingMessage = {
    type: "offer",
    passphraseLength: config.passphraseLength,
    sdp: offer.sdp,
  };
  socket.send(JSON.stringify(msg));
}

interface Setters {
  codeSetter: React.Dispatch<React.SetStateAction<string | undefined>>;
  statusSetter: React.Dispatch<React.SetStateAction<string | undefined>>;
}
async function handleMessage(
  event: MessageEvent,
  rtc: RefObject<RTCPeerConnection | null>,
  socket: WebSocket,
  setters: Setters,
): Promise<void> {
  if (!rtc.current) throw Error("rtc peer connection is null");

  const msg: SignalingMessage = JSON.parse(event.data);
  switch (msg.type) {
    case "passphrase":
      setters.codeSetter(msg.passphrase);
      setters.statusSetter("Waiting for receiver...");
      break;
    case "answer":
      setters.codeSetter(undefined);
      setters.statusSetter("Connecting...");

      rtc.current.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: msg.sdp,
        }),
      );
      rtc.current.onicecandidate = (event) => sendIceCandidate(event, socket);
      break;
    case "ice-candidate":
      const candidate: RTCIceCandidateInit | null = msg.candidate
        ? JSON.parse(msg.candidate)
        : null;
      rtc.current.addIceCandidate(candidate);
      break;
    default:
      throw Error("unhandled message: " + msg);
      break;
  }
}

function sendFile(file: File, channel: RTCDataChannel): void {
  channel.send(file.name);
  channel.onmessage = async (event) => {
    if (event.data === "ready") channel.send(await file.arrayBuffer());
  };
}
