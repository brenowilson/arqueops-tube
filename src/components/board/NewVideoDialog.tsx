"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";

interface NewVideoDialogProps {
  onCreated?: (data: NewVideoFormData) => void;
}

export interface NewVideoFormData {
  title: string;
  topic: string;
  language: string;
  recipe_key: string;
}

const INITIAL_STATE: NewVideoFormData = {
  title: "",
  topic: "",
  language: "pt-BR",
  recipe_key: "video-completo",
};

export function NewVideoDialog({ onCreated }: NewVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewVideoFormData>(INITIAL_STATE);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreated?.(form);
    setForm(INITIAL_STATE);
    setOpen(false);
  }

  function update(field: keyof NewVideoFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#D4AF37] text-black hover:bg-[#C4A030] font-semibold gap-1.5">
          <PlusIcon className="size-4" />
          Novo Vídeo
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#111111] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Novo Vídeo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-sm text-zinc-300">
              Título
            </Label>
            <Input
              id="title"
              placeholder="Ex: Como criar um site do zero"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-zinc-600"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic" className="text-sm text-zinc-300">
              Topico / Nicho
            </Label>
            <Textarea
              id="topic"
              placeholder="Descreva o topico principal do video..."
              value={form.topic}
              onChange={(e) => update("topic", e.target.value)}
              className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-zinc-600 resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-zinc-300">Idioma</Label>
              <Select value={form.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  <SelectItem value="pt-BR">pt-BR</SelectItem>
                  <SelectItem value="es-ES">es-ES</SelectItem>
                  <SelectItem value="en-US">en-US</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-zinc-300">Recipe</Label>
              <Select value={form.recipe_key} onValueChange={(v) => update("recipe_key", v)}>
                <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  <SelectItem value="video-completo">video-completo</SelectItem>
                  <SelectItem value="video-curto">video-curto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#D4AF37] text-black hover:bg-[#C4A030] font-semibold mt-2"
          >
            Criar Video
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
