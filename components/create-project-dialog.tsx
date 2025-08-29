"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateProjectFormState = {
	name: string
	description: string
	repoUrl: string
	budget: string
	adminId: string
}

export function CreateProjectDialog() {
	const [open, setOpen] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState<CreateProjectFormState>({
		name: "",
		description: "",
		repoUrl: "",
		budget: "",
		adminId: "",
	})

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setSubmitting(true)
		try {
			const payload = {
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				repoUrl: form.repoUrl.trim(),
				budget: Number(form.budget),
				adminId: Number(form.adminId),
			}

			const res = await fetch("/api/v1/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})
			const data = await res.json()
			// Log the API response as requested
			console.log("Create project response:", { status: res.status, data })

			if (res.ok) {
				setOpen(false)
				setForm({ name: "", description: "", repoUrl: "", budget: "", adminId: "" })
			}
		} catch (err) {
			console.error("Create project error:", err)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-9">Create Project</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Create a new project</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							placeholder="Awesome OSS Project"
							value={form.name}
							onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							placeholder="Short summary of the project"
							value={form.description}
							onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="repoUrl">Repository URL</Label>
						<Input
							id="repoUrl"
							placeholder="https://github.com/org/repo"
							type="url"
							value={form.repoUrl}
							onChange={(e) => setForm((s) => ({ ...s, repoUrl: e.target.value }))}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="budget">Budget (USD)</Label>
						<Input
							id="budget"
							type="number"
							min="0"
							step="0.01"
							placeholder="5000"
							value={form.budget}
							onChange={(e) => setForm((s) => ({ ...s, budget: e.target.value }))}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="adminId">Admin ID</Label>
						<Input
							id="adminId"
							type="number"
							min="1"
							placeholder="1"
							value={form.adminId}
							onChange={(e) => setForm((s) => ({ ...s, adminId: e.target.value }))}
							required
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}


