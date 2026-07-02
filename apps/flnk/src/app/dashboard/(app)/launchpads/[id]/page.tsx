import { LaunchpadEditor } from '@/components/dashboard/launchpads/launchpad-editor'

type PageProps = { params: Promise<{ id: string }> }

export default async function LaunchpadEditorPage({ params }: PageProps) {
  const { id } = await params
  return <LaunchpadEditor id={id} />
}
