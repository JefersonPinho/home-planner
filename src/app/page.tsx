import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { getRepository, storageMode } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await (await getRepository()).listProjects();
  return <ProjectGallery initialProjects={projects} storage={storageMode()} />;
}
