"use client";

import { useParams } from "next/navigation";
import { SessionView } from "@/components/session/SessionView";

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  return <SessionView sessionId={id} />;
}
