-- Fix-up migration: Create all missing tables from initial migration (0000) if they don't exist
-- This handles the case where the initial migration didn't create the tables properly

-- Create user table first (referenced by other tables)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
    ) THEN
        CREATE TABLE "user" (
            "id" text PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "email" text NOT NULL,
            "emailVerified" boolean DEFAULT false NOT NULL,
            "image" text,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "user_email_unique" UNIQUE("email")
        );
        CREATE INDEX "user_email_idx" ON "user" USING btree ("email");
    END IF;
END $$;
--> statement-breakpoint
-- Create organization table (referenced by other tables)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization'
    ) THEN
        CREATE TABLE "organization" (
            "id" text PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "slug" text NOT NULL,
            "logo" text,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "organization_slug_unique" UNIQUE("slug")
        );
    END IF;
END $$;
--> statement-breakpoint
-- Create verification table (independent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'verification'
    ) THEN
        CREATE TABLE "verification" (
            "id" text PRIMARY KEY NOT NULL,
            "identifier" text NOT NULL,
            "value" text NOT NULL,
            "expiresAt" timestamp NOT NULL,
            "createdAt" timestamp,
            "updatedAt" timestamp
        );
    END IF;
END $$;
--> statement-breakpoint
-- Create account table (depends on user)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'account'
    ) THEN
        CREATE TABLE "account" (
            "id" text PRIMARY KEY NOT NULL,
            "accountId" text NOT NULL,
            "providerId" text NOT NULL,
            "userId" text NOT NULL,
            "accessToken" text,
            "refreshToken" text,
            "idToken" text,
            "accessTokenExpiresAt" timestamp,
            "refreshTokenExpiresAt" timestamp,
            "scope" text,
            "password" text,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'account_userId_user_id_fk'
    ) THEN
        ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
-- Create session table (depends on user)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
    ) THEN
        CREATE TABLE "session" (
            "id" text PRIMARY KEY NOT NULL,
            "expiresAt" timestamp NOT NULL,
            "token" text NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            "ipAddress" text,
            "userAgent" text,
            "userId" text NOT NULL,
            CONSTRAINT "session_token_unique" UNIQUE("token")
        );
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_userId_user_id_fk'
    ) THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
-- Create invitation table (depends on organization)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitation'
    ) THEN
        CREATE TABLE "invitation" (
            "id" text PRIMARY KEY NOT NULL,
            "email" text NOT NULL,
            "organizationId" text NOT NULL,
            "role" text DEFAULT 'member' NOT NULL,
            "status" text DEFAULT 'pending' NOT NULL,
            "expiresAt" timestamp NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invitation_organizationId_organization_id_fk'
    ) THEN
        ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
-- Create member table (depends on organization and user)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'member'
    ) THEN
        CREATE TABLE "member" (
            "id" text NOT NULL,
            "organizationId" text NOT NULL,
            "userId" text NOT NULL,
            "role" text DEFAULT 'member' NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "member_organizationId_userId_pk" PRIMARY KEY("organizationId","userId")
        );
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'member_organizationId_organization_id_fk'
    ) THEN
        ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'member_userId_user_id_fk'
    ) THEN
        ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
-- Create todos table (independent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'todos'
    ) THEN
        CREATE TABLE "todos" (
            "id" serial PRIMARY KEY NOT NULL,
            "title" text NOT NULL,
            "created_at" timestamp DEFAULT now()
        );
    END IF;
END $$;
