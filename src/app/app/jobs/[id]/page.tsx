import { JobTrackerClient } from "./JobTrackerClient";

export const instant = false;

export default async function JobTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobTrackerClient jobId={id} />;
}
