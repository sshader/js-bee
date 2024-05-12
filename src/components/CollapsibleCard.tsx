import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { useEffect, useState } from "react";
import { Card, CardTitle } from "./ui/card";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Separator } from "@radix-ui/react-separator";

export function CollapsibleCard({
  header,
  startOpen,
  children,
}: {
  header: string;
  startOpen: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(startOpen);
  useEffect(() => {
    setIsOpen(startOpen);
  }, [setIsOpen, startOpen]);
  return (
    <Collapsible open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <Card className="flex flex-col gap-4 p-2">
        <CollapsibleTrigger className="flex flex-col gap-2">
          <CardTitle className="flex gap-2 w-full">
            <div>{header}</div>
            {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </CardTitle>
          {isOpen && (
            <Separator decorative className="w-full h-[1px] bg-secondary" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
