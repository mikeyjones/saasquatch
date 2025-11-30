import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'

import { useAppForm } from '@/hooks/demo.form'

export const Route = createFileRoute('/forms/address')({
  component: AddressForm,
})

const schema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code must be at least 5 characters'),
  country: z.string().min(1, 'Country is required'),
})

function AddressForm() {
  const form = useAppForm({
    defaultValues: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    validators: {
      onBlur: schema,
    },
    onSubmit: ({ value }) => {
      console.log(value)
      alert('Address form submitted successfully!')
    },
  })

  const countries = [
    { label: 'United States', value: 'US' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Kingdom', value: 'UK' },
    { label: 'Australia', value: 'AU' },
  ]

  const states = [
    { label: 'California', value: 'CA' },
    { label: 'New York', value: 'NY' },
    { label: 'Texas', value: 'TX' },
    { label: 'Florida', value: 'FL' },
  ]

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-white"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 5% 40%, #add8e6 0%, #0000ff 70%, #00008b 100%)',
      }}
    >
      <div className="w-full max-w-2xl p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-xl border-8 border-black/10">
        <Link
          to="/forms"
          className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
        >
          ← Back to Forms
        </Link>
        <h1 className="text-3xl font-bold mb-6">Address Form</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
        >
          <form.AppField name="street">
            {(field) => <field.TextField label="Street Address" />}
          </form.AppField>

          <div className="grid grid-cols-2 gap-4">
            <form.AppField name="city">
              {(field) => <field.TextField label="City" />}
            </form.AppField>

            <form.AppField name="state">
              {(field) => (
                <field.Select
                  label="State"
                  values={states}
                  placeholder="Select a state"
                />
              )}
            </form.AppField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.AppField name="zipCode">
              {(field) => <field.TextField label="Zip Code" />}
            </form.AppField>

            <form.AppField name="country">
              {(field) => (
                <field.Select
                  label="Country"
                  values={countries}
                  placeholder="Select a country"
                />
              )}
            </form.AppField>
          </div>

          <div className="flex justify-end">
            <form.AppForm>
              <form.SubscribeButton label="Submit Address" />
            </form.AppForm>
          </div>
        </form>
      </div>
    </div>
  )
}

