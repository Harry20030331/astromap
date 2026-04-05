import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function SessionQueryRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/session/${id}/view?query=1`);
}
