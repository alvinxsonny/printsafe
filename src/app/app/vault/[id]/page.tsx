import { DocumentInspectorClient } from "./DocumentInspectorClient";

export const instant = false;

export default async function DocumentInspectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentInspectorClient documentId={id} />;
}
