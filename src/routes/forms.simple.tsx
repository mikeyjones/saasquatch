import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { useAppForm } from "@/hooks/demo.form";

export const Route = createFileRoute("/forms/simple")({
	component: SimpleForm,
});

const schema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
});

function SimpleForm() {
	const form = useAppForm({
		defaultValues: {
			title: "",
			description: "",
		},
		validators: {
			onBlur: schema,
		},
		onSubmit: ({ value }) => {
			console.log(value);
			// Show success message
			alert("Form submitted successfully!");
		},
	});

	return (
		<div
			className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-white"
			style={{
				backgroundImage:
					"radial-gradient(50% 50% at 5% 40%, #add8e6 0%, #0000ff 70%, #00008b 100%)",
			}}
		>
			<div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
				<Link
					to="/forms"
					className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
				>
					← Back to Forms
				</Link>
				<h1 className="text-3xl font-bold mb-6">Simple Form</h1>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6"
				>
					<form.AppField name="title">
						{(field) => <field.TextField label="Title" />}
					</form.AppField>

					<form.AppField name="description">
						{(field) => <field.TextArea label="Description" />}
					</form.AppField>

					<div className="flex justify-end">
						<form.AppForm>
							<form.SubscribeButton label="Submit" />
						</form.AppForm>
					</div>
				</form>
			</div>
		</div>
	);
}
