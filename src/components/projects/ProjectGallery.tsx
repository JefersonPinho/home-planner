"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { createProjectSchema, renameProjectSchema } from "@/lib/validation/scene";
import type { ProjectSummary } from "@/types/scene";

type ListResponse = {
  storage: "postgres" | "file";
  projects: ProjectSummary[];
};

export function ProjectGallery({
  initialProjects,
  storage: initialStorage,
}: {
  initialProjects: ProjectSummary[];
  storage: "postgres" | "file";
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [storage, setStorage] = useState(initialStorage);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null);
  const [removing, setRemoving] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      setError("Não foi possível carregar os projetos.");
      return;
    }
    const body = (await response.json()) as ListResponse;
    setProjects(body.projects);
    setStorage(body.storage);
    setError("");
  };

  const duplicate = async (id: string) => {
    const response = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    if (!response.ok) return;
    await load();
  };

  const toggleTemplate = async (project: ProjectSummary) => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isTemplate: !project.isTemplate }),
    });
    await load();
  };

  return (
    <main className="min-h-dvh bg-[#f3f4f6] text-[#111827]">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-8">
        <div>
          <p className="text-sm font-semibold tracking-tight">Planta</p>
          <p className="text-[12px] text-neutral-500">{storage === "postgres" ? "PostgreSQL" : "Salvo neste computador"}</p>
        </div>
        <button type="button" className="h-8 bg-neutral-900 px-3 text-[13px] text-white" onClick={() => setCreating(true)}>
          Novo projeto
        </button>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
        {projects.length === 0 ? (
          <div className="border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-neutral-600">Nenhum projeto ainda.</p>
            <button type="button" className="mt-4 h-8 bg-neutral-900 px-3 text-[13px] text-white" onClick={() => setCreating(true)}>
              Criar Minha Casa
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id} className="border border-neutral-200 bg-white">
                <Link href={`/editor/${project.id}`} className="block">
                  {project.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.thumbnail} alt="" className="aspect-[16/10] w-full bg-[#e7e8ec] object-cover" />
                  ) : (
                    <div className="grid aspect-[16/10] place-items-center bg-[#e7e8ec] text-[12px] text-neutral-400">Sem planta</div>
                  )}
                </Link>
                <div className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/editor/${project.id}`} className="block truncate text-sm font-medium">
                      {project.name}
                    </Link>
                    <p className="text-[11px] text-neutral-500">
                      {project.isTemplate ? "Modelo · " : ""}
                      {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(project.updatedAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className="grid h-8 w-8 place-items-center text-neutral-500" aria-label="Renomear" onClick={() => setRenaming(project)}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="grid h-8 w-8 place-items-center text-neutral-500" aria-label="Duplicar" onClick={() => void duplicate(project.id)}>
                      <Copy size={14} />
                    </button>
                    <button type="button" className="grid h-8 w-8 place-items-center text-neutral-500" aria-label="Excluir" onClick={() => setRemoving(project)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <button type="button" className="w-full border-t border-neutral-100 px-3 py-1.5 text-left text-[12px] text-neutral-500 hover:text-neutral-900" onClick={() => void toggleTemplate(project)}>
                  {project.isTemplate ? "Remover dos modelos" : "Salvar como modelo"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {creating ? (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/editor/${id}`)}
        />
      ) : null}
      {renaming ? (
        <RenameDialog
          project={renaming}
          onClose={() => setRenaming(null)}
          onSaved={() => {
            setRenaming(null);
            void load();
          }}
        />
      ) : null}
      {removing ? (
        <Dialog title="Excluir projeto" onClose={() => setRemoving(null)}>
          <p className="text-sm text-neutral-600">Excluir “{removing.name}”? Esta ação não pode ser desfeita.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="h-8 px-3 text-sm" onClick={() => setRemoving(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="h-8 bg-red-700 px-3 text-sm text-white"
              onClick={async () => {
                await fetch(`/api/projects/${removing.id}`, { method: "DELETE" });
                setRemoving(null);
                await load();
              }}
            >
              Excluir
            </button>
          </div>
        </Dialog>
      ) : null}
    </main>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const form = useForm<{ name: string }>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "Minha Casa" },
  });
  return (
    <Dialog title="Novo projeto" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!response.ok) return;
          const body = (await response.json()) as { project: { id: string } };
          onCreated(body.project.id);
        })}
      >
        <input className="h-9 border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-[12px] text-red-700">{form.formState.errors.name.message}</p> : null}
        <button type="submit" className="h-9 bg-neutral-900 text-sm text-white" disabled={form.formState.isSubmitting}>
          Criar
        </button>
      </form>
    </Dialog>
  );
}

function RenameDialog({ project, onClose, onSaved }: { project: ProjectSummary; onClose: () => void; onSaved: () => void }) {
  const form = useForm<{ name: string }>({
    resolver: zodResolver(renameProjectSchema),
    defaultValues: { name: project.name },
  });
  return (
    <Dialog title="Renomear" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(values),
          });
          if (response.ok) onSaved();
        })}
      >
        <input className="h-9 border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-900" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-[12px] text-red-700">{form.formState.errors.name.message}</p> : null}
        <button type="submit" className="h-9 bg-neutral-900 text-sm text-white">
          Salvar
        </button>
      </form>
    </Dialog>
  );
}
