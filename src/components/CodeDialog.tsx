import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { JSX } from "react";

export default function CodeDialog({
  code,
}: {
  code: string | undefined;
}): JSX.Element {
  return (
    <Dialog open={code ? true : false}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Transmit Code</DialogTitle>
          <DialogDescription>
            Give this code to the receiver to proceed.
          </DialogDescription>
        </DialogHeader>
        {code}
      </DialogContent>
    </Dialog>
  );
}
