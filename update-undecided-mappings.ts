import { db } from "@/server/db";
import { migrationMappings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

async function updateUndecidedMappings() {
  try {
    console.log("Checking for undecided mappings...");

    // First, count how many records we'll update
    const undecidedMappings = await db
      .select()
      .from(migrationMappings)
      .where(eq(migrationMappings.category, "undecided"));

    console.log(`Found ${undecidedMappings.length} undecided mappings`);

    if (undecidedMappings.length === 0) {
      console.log("No undecided mappings found. Nothing to update.");
      return;
    }

    // Show the mappings that will be updated
    console.log("Mappings to be updated:");
    undecidedMappings.forEach((mapping, index) => {
      console.log(`${index + 1}. ID: ${mapping.id}, Name: ${mapping.mappingName || 'N/A'}, Created: ${mapping.createdAt}`);
    });

    // Update all undecided mappings to replacement
    const result = await db
      .update(migrationMappings)
      .set({
        category: "replacement",
        updatedAt: new Date()
      })
      .where(eq(migrationMappings.category, "undecided"))
      .returning({ id: migrationMappings.id, mappingName: migrationMappings.mappingName });

    console.log(`Successfully updated ${result.length} mappings from 'undecided' to 'replacement'`);

    // Verify the update
    const remainingUndecided = await db
      .select()
      .from(migrationMappings)
      .where(eq(migrationMappings.category, "undecided"));

    console.log(`Remaining undecided mappings: ${remainingUndecided.length}`);

  } catch (error) {
    console.error("Error updating mappings:", error);
    throw error;
  }
}

// Run the update
updateUndecidedMappings()
  .then(() => {
    console.log("Update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Update failed:", error);
    process.exit(1);
  });