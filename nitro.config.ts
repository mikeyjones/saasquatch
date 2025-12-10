import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  publicAssets: [
    {
      baseURL: '/invoices',
      dir: 'public/invoices',
    },
  ],
})
