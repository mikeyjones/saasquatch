-- Migration: Make subscriptionId nullable in invoices table
-- This allows creation of standalone invoices not tied to subscriptions

ALTER TABLE "invoice" DROP CONSTRAINT "invoice_subscriptionId_subscription_id_fk";

ALTER TABLE "invoice" ALTER COLUMN "subscriptionId" DROP NOT NULL;

ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscriptionId_subscription_id_fk"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE cascade ON UPDATE no action;
