const { drizzle } = require('drizzle-orm/postgres-js');
const { count, eq, sql } = require('drizzle-orm');
const postgres = require('postgres');

// Database schema (simplified for this script)
const migrationMappings = {
  id: 'id',
  category: 'category',
  migrationStatus: 'migration_status',
  priority: 'priority',
  createdAt: 'created_at',
  mappingGroupId: 'mapping_group_id'
};

const migrationMappingSources = {
  mappingId: 'mapping_id'
};

const migrationMappingTargets = {
  mappingId: 'mapping_id'
};

async function countMigrationMappings() {
  // Database connection - update with your database URL
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🔍 Analyzing migration mappings database...\n');

    // Total count of migration mappings
    const totalMappingsResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM "aws-resources_migration_mapping"`
    );
    const totalMappings = parseInt(totalMappingsResult[0]?.count || 0);
    console.log(`📊 Total Migration Mappings: ${totalMappings}`);

    // Count by category
    console.log('\n📈 Mappings by Category:');
    const categoryCountsResult = await db.execute(
      sql`SELECT category, COUNT(*) as count FROM "aws-resources_migration_mapping" GROUP BY category ORDER BY count DESC`
    );
    categoryCountsResult.forEach(({ category, count }) => {
      console.log(`  ${category || 'null'}: ${count}`);
    });

    // Count by status
    console.log('\n🎯 Mappings by Status:');
    const statusCountsResult = await db.execute(
      sql`SELECT migration_status, COUNT(*) as count FROM "aws-resources_migration_mapping" GROUP BY migration_status ORDER BY count DESC`
    );
    statusCountsResult.forEach(({ migration_status, count }) => {
      console.log(`  ${migration_status || 'not_started'}: ${count}`);
    });

    // Count by priority
    console.log('\n⚡ Mappings by Priority:');
    const priorityCountsResult = await db.execute(
      sql`SELECT priority, COUNT(*) as count FROM "aws-resources_migration_mapping" GROUP BY priority ORDER BY count DESC`
    );
    priorityCountsResult.forEach(({ priority, count }) => {
      console.log(`  ${priority || 'null'}: ${count}`);
    });

    // Count source resources
    const totalSourcesResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM "aws-resources_migration_mapping_source"`
    );
    const totalSources = parseInt(totalSourcesResult[0]?.count || 0);
    console.log(`\n🔗 Total Source Resources: ${totalSources}`);

    // Count target resources
    const totalTargetsResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM "aws-resources_migration_mapping_target"`
    );
    const totalTargets = parseInt(totalTargetsResult[0]?.count || 0);
    console.log(`🎯 Total Target Resources: ${totalTargets}`);

    // Count mappings created per day (last 7 days)
    console.log('\n📅 Mappings Created (Last 7 Days):');
    const dailyCountsResult = await db.execute(
      sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "aws-resources_migration_mapping"
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
      `
    );

    if (dailyCountsResult.length > 0) {
      dailyCountsResult.forEach(({ date, count }) => {
        console.log(`  ${date}: ${count} mappings`);
      });
    } else {
      console.log('  No mappings created in the last 7 days');
    }

    // Many-to-many analysis
    console.log('\n🔄 Mapping Type Analysis:');

    // Count mappings with multiple sources
    const multipleSourcesResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM (
          SELECT mapping_id
          FROM "aws-resources_migration_mapping_source"
          GROUP BY mapping_id
          HAVING COUNT(*) > 1
        ) as multi_source
      `
    );
    const multipleSourcesCount = parseInt(multipleSourcesResult[0]?.count || 0);
    console.log(`  Mappings with multiple sources: ${multipleSourcesCount}`);

    // Count mappings with multiple targets
    const multipleTargetsResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM (
          SELECT mapping_id
          FROM "aws-resources_migration_mapping_target"
          GROUP BY mapping_id
          HAVING COUNT(*) > 1
        ) as multi_target
      `
    );
    const multipleTargetsCount = parseInt(multipleTargetsResult[0]?.count || 0);
    console.log(`  Mappings with multiple targets: ${multipleTargetsCount}`);

    // Count mappings with no targets (map to nothing)
    const noTargetsResult = await db.execute(
      sql`
        SELECT COUNT(*) as count
        FROM "aws-resources_migration_mapping" mm
        LEFT JOIN "aws-resources_migration_mapping_target" mmt ON mm.id = mmt.mapping_id
        WHERE mmt.mapping_id IS NULL
      `
    );
    const noTargetsCount = parseInt(noTargetsResult[0]?.count || 0);
    console.log(`  Mappings with no targets (map to nothing): ${noTargetsCount}`);

    // Recent mappings (last 5)
    console.log('\n🕒 Recent Mappings (Last 5):');
    const recentMappingsResult = await db.execute(
      sql`
        SELECT id, category, migration_status, created_at, mapping_group_id
        FROM "aws-resources_migration_mapping"
        ORDER BY created_at DESC
        LIMIT 5
      `
    );

    recentMappingsResult.forEach((mapping, index) => {
      console.log(`  ${index + 1}. ID: ${mapping.id}, Category: ${mapping.category}, Status: ${mapping.migration_status || 'not_started'}`);
      console.log(`     Created: ${new Date(mapping.created_at).toLocaleString()}`);
      console.log(`     Group: ${mapping.mapping_group_id || 'N/A'}`);
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Migration Mappings: ${totalMappings}`);
    console.log(`Total Source Resources: ${totalSources}`);
    console.log(`Total Target Resources: ${totalTargets}`);
    console.log(`Many-to-Many Mappings: ${Math.max(multipleSourcesCount, multipleTargetsCount)}`);
    console.log(`Map-to-Nothing Mappings: ${noTargetsCount}`);

    if (totalMappings > 0) {
      const avgSourcesPerMapping = (totalSources / totalMappings).toFixed(2);
      const avgTargetsPerMapping = (totalTargets / totalMappings).toFixed(2);
      console.log(`Average Sources per Mapping: ${avgSourcesPerMapping}`);
      console.log(`Average Targets per Mapping: ${avgTargetsPerMapping}`);
    }

    await client.end();

  } catch (error) {
    console.error('❌ Error querying migration mappings:', error);
    throw error;
  }
}

// Run the analysis
countMigrationMappings()
  .then(() => {
    console.log('\n✅ Analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });