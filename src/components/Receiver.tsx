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
import { sendIceCandidate } from "@/lib/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { FLARE_URL } from "astro:env/client";
import { Loader2 } from "lucide-react";
import { useRef, useState, type JSX, type RefObject } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const schema = z.object({
  code: z.string().nonempty(),
});

export default function Receiver(): JSX.Element {
  const channel = useRef<RTCDataChannel | null>(null);
  const rtc = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>): void {
    setLoading(true);
    setProgress(0);
    setStatus("Connecting...");

    socket.current = new WebSocket(FLARE_URL);

    socket.current.onopen = () => {
      if (!socket.current)
        throw Error("socket has to be set before starting signaling");
      sendRequest(values.code, socket.current);
      setStatus("Negotiating...");
    };
    socket.current.onmessage = (event) => {
      if (!socket.current)
        throw Error("socket has to be set before starting signaling");
      handleMessage(event, rtc, socket.current, {
        statusSetter: setStatus,
      });
    };
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

function sendRequest(code: string, socket: WebSocket): void {
  const msg: SignalingMessage = {
    type: "connection-request",
    passphrase: code,
  };
  socket.send(JSON.stringify(msg));
}

interface Setters {
  statusSetter: React.Dispatch<React.SetStateAction<string | undefined>>;
}
async function handleMessage(
  event: MessageEvent,
  rtc: RefObject<RTCPeerConnection | null>,
  socket: WebSocket,
  setters: Setters,
): Promise<void> {
  const msg: SignalingMessage = JSON.parse(event.data);
  switch (msg.type) {
    case "offer":
      rtc.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });
      rtc.current.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: msg.sdp,
        }),
      );

      rtc.current.ondatachannel = () => console.debug("data channel open");

      const answer = await rtc.current.createAnswer();
      rtc.current.setLocalDescription(answer);
      rtc.current.onicecandidate = (event) => {
        sendIceCandidate(event, socket);
      };

      if (!answer.sdp) throw Error("answer sdp is undefined");
      const answerMsg: SignalingMessage = {
        type: "answer",
        sdp: answer.sdp,
      };
      socket.send(JSON.stringify(answerMsg));

      setters.statusSetter("Connecting...");
      break;
    case "ice-candidate":
      if (!rtc.current) throw Error("rtc peer connection is null");
      const candidate: RTCIceCandidateInit | null = msg.candidate ? JSON.parse(msg.candidate) : null;
      rtc.current.addIceCandidate(candidate);
      break;
    default:
      throw Error("unhandled message: " + msg);
      break;
  }
}
