import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { z } from "zod";
import { UserPlus, RefreshCw, User } from "lucide-react";

import { useAppForm } from "@/hooks/demo.form";
import { zodFormValidator } from "@/lib/form-utils";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const contactSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address").min(1, "Email is required"),
	phone: z.string().default(""),
	title: z.string().default(""),
	role: z.enum(["owner", "admin", "user", "viewer"]).default("user"),
	avatarUrl: z.string().default(""),
	notes: z.string().default(""),
});

export interface Contact {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	title?: string | null;
	role: string;
	avatarUrl?: string | null;
	notes?: string | null;
	isOwner: boolean;
	status: string;
	lastActivityAt?: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Customer data for contact creation.
 */
interface Customer {
	id: string;
	name: string;
}

/**
 * Props for the CreateContactDialog component.
 */
interface CreateContactDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onContactCreated?: () => void;
	customerId?: string;
	customerName?: string;
	contactId?: string | null; // If provided, dialog is in edit mode
	contact?: Contact | null; // Pre-filled contact data for edit mode
}

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "user", label: "User" },
	{ value: "viewer", label: "Viewer" },
];

/**
 * Dialog component for creating or editing a contact.
 *
 * Supports both create and edit modes. When contactId is provided,
 * the form is pre-populated with existing contact data.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog open state changes
 * @param props.onContactCreated - Callback fired after successful save
 * @param props.customerId - Customer ID to associate contact with (optional)
 * @param props.customerName - Customer name for display (optional)
 * @param props.contactId - Contact ID for edit mode (optional)
 * @param props.contact - Pre-filled contact data for edit mode (optional)
 */
export function CreateContactDialog({
	open,
	onOpenChange,
	onContactCreated,
	customerId,
	customerName,
	contactId,
	contact: initialContact,
}: CreateContactDialogProps) {
	const params = useParams({ strict: false }) as { tenant?: string };
	const tenant = params.tenant || "";
	const isEditMode = !!contactId;

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingContact, setIsLoadingContact] = useState(false);
	const [loadedContact, setLoadedContact] = useState<Contact | null>(null);
	const [selectedRole, setSelectedRole] = useState<string>("user");
	const [customer, setCustomer] = useState<Customer | null>(
		customerId && customerName ? { id: customerId, name: customerName } : null,
	);

	// Fetch contact data when in edit mode
	useEffect(() => {
		if (!open || !tenant || !isEditMode || !contactId) {
			setLoadedContact(null);
			return;
		}

		const loadContact = async () => {
			setIsLoadingContact(true);
			try {
				const response = await fetch(
					`/${tenant}/api/crm/contacts/${contactId}`,
				);
				if (response.ok) {
					const data = await response.json();
					const contact = data.contact;
					setLoadedContact(contact);
					setSelectedRole(contact.role || "user");
					if (data.customer) {
						setCustomer(data.customer);
					}
				}
			} catch (err) {
				console.error("Failed to load contact:", err);
				setError("Failed to load contact data");
			} finally {
				setIsLoadingContact(false);
			}
		};

		loadContact();
	}, [open, tenant, isEditMode, contactId]);

	// Update customer info when props change
	useEffect(() => {
		if (customerId && customerName) {
			setCustomer({ id: customerId, name: customerName });
		}
	}, [customerId, customerName]);

	// Determine which contact data to use (loaded or initial)
	const contactData = loadedContact || initialContact;

	const form = useAppForm({
		defaultValues: {
			name: contactData?.name || "",
			email: contactData?.email || "",
			phone: contactData?.phone || "",
			title: contactData?.title || "",
			role: contactData?.role || "user",
			avatarUrl: contactData?.avatarUrl || "",
			notes: contactData?.notes || "",
		},
		validators: {
			onBlur: zodFormValidator(contactSchema),
		},
		onSubmit: async ({ value }) => {
			if (!tenant) return;
			if (!isEditMode && !customerId) {
				setError("Customer ID is required");
				return;
			}

			setIsSubmitting(true);
			setError(null);

			try {
				const requestBody: Record<string, unknown> = {
					name: value.name,
					email: value.email,
					phone: value.phone || undefined,
					title: value.title || undefined,
					role: selectedRole,
					avatarUrl: value.avatarUrl || undefined,
					notes: value.notes || undefined,
				};

				if (isEditMode && contactId) {
					// Update existing contact
					const response = await fetch(
						`/${tenant}/api/crm/contacts/${contactId}`,
						{
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(requestBody),
						},
					);

					const data = await response.json();

					if (!response.ok) {
						throw new Error(data.error || "Failed to update contact");
					}

					onOpenChange(false);
					onContactCreated?.();
				} else {
					// Create new contact
					const response = await fetch(
						`/${tenant}/api/crm/customers/${customerId}/contacts`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(requestBody),
						},
					);

					const data = await response.json();

					if (!response.ok) {
						throw new Error(data.error || "Failed to create contact");
					}

					// Reset form and close dialog
					form.reset();
					setSelectedRole("user");
					onOpenChange(false);
					onContactCreated?.();
				}
			} catch (err) {
				console.error(
					`Error ${isEditMode ? "updating" : "creating"} contact:`,
					err,
				);
				setError(
					err instanceof Error
						? err.message
						: `Failed to ${isEditMode ? "update" : "create"} contact`,
				);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Update form when contact data is loaded
	useEffect(() => {
		if (contactData && isEditMode && form) {
			form.setFieldValue("name", contactData.name || "");
			form.setFieldValue("email", contactData.email || "");
			form.setFieldValue("phone", contactData.phone || "");
			form.setFieldValue("title", contactData.title || "");
			form.setFieldValue("avatarUrl", contactData.avatarUrl || "");
			form.setFieldValue("notes", contactData.notes || "");
			setSelectedRole(contactData.role || "user");
		}
	}, [contactData, isEditMode, form]);

	const handleDialogClose = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
			setSelectedRole("user");
			setError(null);
			setLoadedContact(null);
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogClose}>
			<DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl flex items-center gap-2">
						<UserPlus className="w-5 h-5 text-indigo-500" />
						{isEditMode ? "Edit Contact" : "Add New Contact"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update contact information and details."
							: customer
								? `Add a new contact for ${customer.name}.`
								: "Create a new contact."}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				)}

				{isLoadingContact ? (
					<div className="flex items-center justify-center py-8">
						<RefreshCw size={24} className="animate-spin text-gray-400" />
						<span className="ml-2 text-gray-500">Loading contact data...</span>
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						{/* Customer Info */}
						{customer && (
							<div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
								<div className="flex items-center gap-2 text-sm text-gray-600">
									<User size={14} />
									<span>Customer:</span>
									<span className="font-medium text-gray-900">
										{customer.name}
									</span>
								</div>
							</div>
						)}

						{/* Name */}
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Full Name *"
									placeholder="e.g., John Smith"
								/>
							)}
						</form.AppField>

						{/* Email */}
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									label="Email *"
									placeholder="john.smith@example.com"
								/>
							)}
						</form.AppField>

						{/* Phone */}
						<form.AppField name="phone">
							{(field) => (
								<field.TextField
									label="Phone"
									placeholder="+1 (555) 123-4567"
								/>
							)}
						</form.AppField>

						{/* Job Title */}
						<form.AppField name="title">
							{(field) => (
								<field.TextField
									label="Job Title"
									placeholder="e.g., VP of Sales, CTO"
								/>
							)}
						</form.AppField>

						{/* Role */}
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Role</Label>
							<Select value={selectedRole} onValueChange={setSelectedRole}>
								<SelectTrigger>
									<SelectValue placeholder="Select role..." />
								</SelectTrigger>
								<SelectContent>
									{ROLES.map((role) => (
										<SelectItem key={role.value} value={role.value}>
											{role.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-gray-500">
								The contact's role within their organization
							</p>
						</div>

						{/* Avatar URL */}
						<form.AppField name="avatarUrl">
							{(field) => (
								<field.TextField
									label="Avatar URL"
									placeholder="https://example.com/avatar.jpg"
								/>
							)}
						</form.AppField>

						{/* Notes */}
						<form.AppField name="notes">
							{(field) => <field.TextArea label="Notes" rows={3} />}
						</form.AppField>

						<DialogFooter className="pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleDialogClose(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								className="bg-indigo-500 hover:bg-indigo-600 text-white"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<>
										<RefreshCw size={16} className="mr-2 animate-spin" />
										{isEditMode ? "Updating..." : "Creating..."}
									</>
								) : isEditMode ? (
									"Update Contact"
								) : (
									"Create Contact"
								)}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
