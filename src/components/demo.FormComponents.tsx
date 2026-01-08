import { useStore } from "@tanstack/react-form";

import { useFieldContext, useFormContext } from "@/hooks/demo.form-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import * as ShadcnSelect from "@/components/ui/select";
import { Slider as ShadcnSlider } from "@/components/ui/slider";
import { Switch as ShadcnSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SubscribeButton({ label }: { label: string }) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type="submit" disabled={isSubmitting}>
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

function ErrorMessages({
	errors,
}: {
	errors: Array<string | { message: string }>;
}) {
	return (
		<>
			{errors.map((error) => (
				<div
					key={typeof error === "string" ? error : error.message}
					className="text-red-500 mt-1 font-bold"
				>
					{typeof error === "string" ? error : error.message}
				</div>
			))}
		</>
	);
}

export function TextField({
	label,
	placeholder,
	type,
	disabled,
	helperText,
}: {
	label: string;
	placeholder?: string;
	type?: string;
	disabled?: boolean;
	helperText?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<Label htmlFor={label} className="mb-2 text-sm font-medium text-gray-700">
				{label}
			</Label>
			<Input
				id={label}
				type={type || "text"}
				value={field.state.value || ""}
				placeholder={placeholder}
				disabled={disabled}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				className="mt-1"
			/>
			{helperText && !field.state.meta.isTouched && (
				<p className="mt-1 text-xs text-gray-500">{helperText}</p>
			)}
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}

export function TextArea({
	label,
	rows = 3,
}: {
	label: string;
	rows?: number;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<Label htmlFor={label} className="mb-2 text-xl font-bold">
				{label}
			</Label>
			<ShadcnTextarea
				id={label}
				value={field.state.value}
				onBlur={field.handleBlur}
				rows={rows}
				onChange={(e) => field.handleChange(e.target.value)}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}

export function Select({
	label,
	values,
	placeholder,
}: {
	label: string;
	values: Array<{ label: string; value: string }>;
	placeholder?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<Label
				htmlFor={field.name}
				className="mb-2 text-sm font-medium text-gray-700"
			>
				{label}
			</Label>
			<ShadcnSelect.Select
				name={field.name}
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
			>
				<ShadcnSelect.SelectTrigger className="w-full mt-1">
					<ShadcnSelect.SelectValue placeholder={placeholder} />
				</ShadcnSelect.SelectTrigger>
				<ShadcnSelect.SelectContent>
					<ShadcnSelect.SelectGroup>
						{values.map((value) => (
							<ShadcnSelect.SelectItem key={value.value} value={value.value}>
								{value.label}
							</ShadcnSelect.SelectItem>
						))}
					</ShadcnSelect.SelectGroup>
				</ShadcnSelect.SelectContent>
			</ShadcnSelect.Select>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}

export function NumberField({
	label,
	placeholder,
	min,
	max,
	helperText,
}: {
	label: string;
	placeholder?: string;
	min?: number;
	max?: number;
	helperText?: string;
}) {
	const field = useFieldContext<number>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<Label htmlFor={label} className="mb-2 text-sm font-medium text-gray-700">
				{label}
			</Label>
			<Input
				id={label}
				type="number"
				value={
					field.state.value === undefined || field.state.value === null
						? ""
						: String(field.state.value)
				}
				placeholder={placeholder}
				min={min}
				max={max}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const inputValue = e.target.value;
					console.log(
						"NumberField onChange - input:",
						inputValue,
						"current field value:",
						field.state.value,
					);

					if (
						inputValue === "" ||
						inputValue === null ||
						inputValue === undefined
					) {
						// Set to undefined when cleared so validation can catch it
						field.handleChange(undefined as unknown as number);
					} else {
						const numValue = Number.parseFloat(inputValue);
						console.log(
							"NumberField parsed value:",
							numValue,
							"isNaN:",
							Number.isNaN(numValue),
						);
						if (!Number.isNaN(numValue)) {
							console.log("NumberField calling handleChange with:", numValue);
							field.handleChange(numValue);
							console.log(
								"NumberField after handleChange - new value:",
								field.state.value,
							);
						} else {
							// If parsing fails, don't update the field (keep current value)
							// This prevents clearing the field when user is typing invalid characters
						}
					}
				}}
				className="mt-1"
			/>
			{helperText && !field.state.meta.isTouched && (
				<p className="mt-1 text-xs text-gray-500">{helperText}</p>
			)}
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}

export function Slider({ label }: { label: string }) {
	const field = useFieldContext<number>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<Label htmlFor={label} className="mb-2 text-xl font-bold">
				{label}
			</Label>
			<ShadcnSlider
				id={label}
				onBlur={field.handleBlur}
				value={[field.state.value]}
				onValueChange={(value) => field.handleChange(value[0])}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}

export function Switch({ label }: { label: string }) {
	const field = useFieldContext<boolean>();
	const errors = useStore(field.store, (state) => state.meta.errors);

	return (
		<div>
			<div className="flex items-center gap-2">
				<ShadcnSwitch
					id={label}
					onBlur={field.handleBlur}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
				/>
				<Label htmlFor={label}>{label}</Label>
			</div>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	);
}
