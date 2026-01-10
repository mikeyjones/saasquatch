-- Fix member table: Remove id column that shouldn't exist
-- The member table should only have organizationId, userId, role, createdAt, updatedAt
-- with a composite primary key on (organizationId, userId)

DO $$ BEGIN
    -- Check if id column exists and drop it
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'member'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE "member" DROP COLUMN "id";
    END IF;
END $$;
