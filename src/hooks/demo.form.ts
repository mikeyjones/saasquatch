import { createFormHook } from "@tanstack/react-form";

import {
	NumberField,
	Select,
	SubscribeButton,
	TextArea,
	TextField,
} from "../components/demo.FormComponents";
import { fieldContext, formContext } from "./demo.form-context";

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField,
		NumberField,
		Select,
		TextArea,
	},
	formComponents: {
		SubscribeButton,
	},
	fieldContext,
	formContext,
});
