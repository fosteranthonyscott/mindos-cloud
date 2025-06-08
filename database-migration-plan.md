# Full Brain Database Migration Plan

## Overview
This document outlines the migration strategy from the current single "memories" table structure to the new normalized database schema.

## Migration Phases

### Phase 1: Preparation (Day 1)
1. **Backup Current Data**
   ```sql
   pg_dump -t memories -t users > fullbrain_backup_$(date +%Y%m%d).sql
   ```

2. **Create Migration Tracking Table**
   ```sql
   CREATE TABLE migration_status (
       id SERIAL PRIMARY KEY,
       phase VARCHAR(50),
       status VARCHAR(20),
       started_at TIMESTAMP,
       completed_at TIMESTAMP,
       error_message TEXT
   );
   ```

3. **Analyze Current Data**
   - Count records by type
   - Identify any data quality issues
   - Document custom fields in use

### Phase 2: Schema Creation (Day 1)
1. **Run New Schema Script**
   - Execute `database-schema.sql`
   - Verify all tables, types, and indexes created

2. **Keep Old Table**
   - DO NOT drop memories table yet
   - Will run parallel for verification

### Phase 3: Data Migration (Day 2)
Execute migration scripts in order:

#### 3.1 Migrate Users
```sql
-- Users should already exist, just ensure tenant_id is set
UPDATE users SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;

-- Create default preferences for all users
INSERT INTO user_preferences (user_id, tenant_id)
SELECT id, tenant_id FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_preferences.user_id = users.id
);
```

#### 3.2 Migrate Projects
```sql
-- Projects don't exist in old schema, will be created as needed
-- during entity migration
```

#### 3.3 Migrate Goals
```sql
INSERT INTO goals (
    id, user_id, name, description, status, priority,
    frequency_check_pattern, frequency_check_interval,
    target_date, completed_date, tags, metadata,
    created_at, updated_at, tenant_id
)
SELECT 
    id,
    user_id,
    COALESCE(content_short, LEFT(content, 255)) as name,
    content as description,
    CASE 
        WHEN status IN ('active', 'completed', 'paused', 'archived') THEN status::entity_status
        ELSE 'active'::entity_status
    END as status,
    CASE 
        WHEN priority BETWEEN 1 AND 10 THEN priority::text::priority_level
        ELSE '5'::priority_level
    END as priority,
    CASE frequency
        WHEN 'daily' THEN 'daily'::recurrence_pattern
        WHEN 'weekly' THEN 'weekly'::recurrence_pattern
        WHEN 'monthly' THEN 'monthly'::recurrence_pattern
        ELSE NULL
    END as frequency_check_pattern,
    CASE 
        WHEN frequency LIKE 'every % days' THEN 
            CAST(SUBSTRING(frequency FROM 'every (\d+) days') AS INTEGER)
        ELSE NULL
    END as frequency_check_interval,
    due as target_date,
    completed_date,
    string_to_array(tags, ',') as tags,
    jsonb_build_object(
        'migrated_from', 'memories',
        'original_type', type,
        'original_notes', notes
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE type = 'goal'
    AND (active IS NULL OR active = true)
    AND (archived IS NULL OR archived = false);
```

#### 3.4 Migrate Routines
```sql
INSERT INTO routines (
    id, user_id, name, description, status, priority,
    recurrence_pattern, recurrence_interval, recurrence_details,
    time_of_day, preferred_time, duration_minutes,
    last_completed, next_due, performance_streak,
    tags, metadata, created_at, updated_at, tenant_id
)
SELECT 
    id,
    user_id,
    COALESCE(content_short, LEFT(content, 255)) as name,
    content as description,
    CASE 
        WHEN status IN ('active', 'completed', 'paused', 'archived') THEN status::entity_status
        ELSE 'active'::entity_status
    END as status,
    CASE 
        WHEN priority BETWEEN 1 AND 10 THEN priority::text::priority_level
        ELSE '5'::priority_level
    END as priority,
    CASE 
        WHEN frequency = 'daily' THEN 'daily'::recurrence_pattern
        WHEN frequency = 'weekly' THEN 'weekly'::recurrence_pattern
        WHEN frequency = 'monthly' THEN 'monthly'::recurrence_pattern
        WHEN frequency LIKE 'every % days' THEN 'every_n_days'::recurrence_pattern
        WHEN frequency LIKE 'every % weeks' THEN 'every_n_weeks'::recurrence_pattern
        ELSE 'daily'::recurrence_pattern
    END as recurrence_pattern,
    CASE 
        WHEN frequency LIKE 'every % days' THEN 
            CAST(SUBSTRING(frequency FROM 'every (\d+) days') AS INTEGER)
        WHEN frequency LIKE 'every % weeks' THEN 
            CAST(SUBSTRING(frequency FROM 'every (\d+) weeks') AS INTEGER)
        ELSE NULL
    END as recurrence_interval,
    CASE 
        WHEN frequency LIKE '%Wednesday%' OR frequency LIKE '%Monday%' THEN
            jsonb_build_object('pattern_text', frequency)
        ELSE NULL
    END as recurrence_details,
    CASE routine_type
        WHEN 'morning' THEN 'early_morning'::time_of_day
        WHEN 'evening' THEN 'evening'::time_of_day
        ELSE NULL
    END as time_of_day,
    NULL as preferred_time, -- Will need to be set manually
    required_time_minutes as duration_minutes,
    last_recurring_update as last_completed,
    due as next_due,
    COALESCE(performance_streak, 0) as performance_streak,
    string_to_array(tags, ',') as tags,
    jsonb_build_object(
        'migrated_from', 'memories',
        'original_type', type,
        'original_notes', notes,
        'trigger', trigger,
        'success_criteria', success_criteria
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE type = 'routine'
    AND (active IS NULL OR active = true)
    AND (archived IS NULL OR archived = false);
```

#### 3.5 Migrate Events
```sql
INSERT INTO events (
    id, user_id, name, description, status, priority,
    event_date, event_time, location, tags, metadata,
    created_at, updated_at, tenant_id
)
SELECT 
    id,
    user_id,
    COALESCE(content_short, LEFT(content, 255)) as name,
    content as description,
    CASE 
        WHEN status IN ('active', 'completed', 'paused', 'archived') THEN status::entity_status
        ELSE 'active'::entity_status
    END as status,
    CASE 
        WHEN priority BETWEEN 1 AND 10 THEN priority::text::priority_level
        ELSE '5'::priority_level
    END as priority,
    COALESCE(due, CURRENT_DATE) as event_date,
    NULL as event_time, -- Will need to be extracted if stored in content
    location,
    string_to_array(tags, ',') as tags,
    jsonb_build_object(
        'migrated_from', 'memories',
        'original_type', type,
        'original_notes', notes
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE type = 'event'
    AND (active IS NULL OR active = true)
    AND (archived IS NULL OR archived = false);
```

#### 3.6 Migrate Tasks
```sql
INSERT INTO tasks (
    id, user_id, name, description, status, priority,
    due_date, due_time, estimated_duration_minutes,
    completed_date, location, tags, metadata,
    created_at, updated_at, tenant_id
)
SELECT 
    id,
    user_id,
    COALESCE(content_short, LEFT(content, 255)) as name,
    content as description,
    CASE 
        WHEN status IN ('active', 'completed', 'paused', 'archived') THEN status::entity_status
        ELSE 'active'::entity_status
    END as status,
    CASE 
        WHEN priority BETWEEN 1 AND 10 THEN priority::text::priority_level
        ELSE '5'::priority_level
    END as priority,
    due as due_date,
    NULL as due_time,
    required_time_minutes as estimated_duration_minutes,
    completed_date,
    location,
    string_to_array(tags, ',') as tags,
    jsonb_build_object(
        'migrated_from', 'memories',
        'original_type', type,
        'original_notes', notes
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE type = 'task'
    AND (active IS NULL OR active = true)
    AND (archived IS NULL OR archived = false);
```

#### 3.7 Migrate Notes
```sql
-- First migrate standalone notes from memories
INSERT INTO notes (
    id, user_id, content, is_hidden, tags, metadata,
    created_at, updated_at, tenant_id
)
SELECT 
    id,
    user_id,
    content,
    false as is_hidden,
    string_to_array(tags, ',') as tags,
    jsonb_build_object(
        'migrated_from', 'memories',
        'original_type', type
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE type IN ('note', 'insight', 'preference')
    AND (active IS NULL OR active = true)
    AND (archived IS NULL OR archived = false);

-- Then create notes from the notes field of other entities
INSERT INTO notes (
    user_id, content, metadata, created_at, updated_at, tenant_id
)
SELECT 
    user_id,
    notes as content,
    jsonb_build_object(
        'migrated_from', 'memories_notes_field',
        'original_entity_id', id,
        'original_entity_type', type
    ) as metadata,
    created_at,
    COALESCE(modified, created_at) as updated_at,
    (SELECT tenant_id FROM users WHERE users.id = memories.user_id) as tenant_id
FROM memories
WHERE notes IS NOT NULL 
    AND notes != ''
    AND type IN ('goal', 'routine', 'task', 'event');

-- Create associations for notes that came from notes fields
INSERT INTO note_associations (note_id, entity_id, entity_type)
SELECT 
    n.id as note_id,
    (n.metadata->>'original_entity_id')::uuid as entity_id,
    CASE n.metadata->>'original_entity_type'
        WHEN 'goal' THEN 'goal'::entity_type
        WHEN 'routine' THEN 'routine'::entity_type
        WHEN 'task' THEN 'task'::entity_type
        WHEN 'event' THEN 'event'::entity_type
    END as entity_type
FROM notes n
WHERE n.metadata->>'migrated_from' = 'memories_notes_field';
```

### Phase 4: Verification (Day 3)
1. **Data Integrity Checks**
   ```sql
   -- Check record counts
   SELECT 'Original memories' as source, type, COUNT(*) 
   FROM memories 
   WHERE (active IS NULL OR active = true) 
   GROUP BY type
   
   UNION ALL
   
   SELECT 'New tables' as source, 'goal', COUNT(*) FROM goals
   UNION ALL
   SELECT 'New tables' as source, 'routine', COUNT(*) FROM routines
   UNION ALL
   SELECT 'New tables' as source, 'task', COUNT(*) FROM tasks
   UNION ALL
   SELECT 'New tables' as source, 'event', COUNT(*) FROM events
   UNION ALL
   SELECT 'New tables' as source, 'note', COUNT(*) FROM notes;
   ```

2. **Test New Views**
   ```sql
   -- Test today_items view
   SELECT * FROM today_items WHERE user_id = ? LIMIT 10;
   
   -- Test feed_items view
   SELECT * FROM feed_items WHERE user_id = ? LIMIT 10;
   ```

3. **Application Testing**
   - Deploy new backend code in parallel
   - Test all CRUD operations
   - Verify feed displays correctly

### Phase 5: Cutover (Day 4)
1. **Final Data Sync**
   - Re-run migration for any new records
   - Verify counts match

2. **Switch Application**
   - Deploy new backend code
   - Update environment variables if needed
   - Monitor for errors

3. **Rollback Plan**
   - Keep old memories table for 30 days
   - Can revert by switching code back

### Phase 6: Cleanup (Day 30)
1. **Archive Old Table**
   ```sql
   -- Create archive
   CREATE TABLE memories_archive_20250108 AS SELECT * FROM memories;
   
   -- Drop original
   DROP TABLE memories CASCADE;
   ```

2. **Remove Migration Code**
   - Remove old database access code
   - Clean up migration scripts

## Handling Special Cases

### Recurring Patterns
- Simple patterns (daily, weekly) map directly
- Complex patterns stored in JSONB for manual processing
- Missing patterns default to 'daily'

### Orphaned Data
- Items without users are skipped
- Items with invalid types are logged but skipped
- Corrupted JSON fields are set to empty objects

### Performance Optimization
- Run migrations during off-peak hours
- Use COPY commands for bulk inserts if over 10k records
- Create indexes after data load

## Monitoring
- Log all migration steps to migration_status table
- Monitor application logs for errors
- Set up alerts for failed queries

## Success Criteria
- [ ] All active records migrated
- [ ] No data loss reported
- [ ] Application functions normally
- [ ] Performance equal or better
- [ ] Users report no issues

## Rollback Procedure
1. Stop application
2. Rename tables: `memories_backup` -> `memories`
3. Deploy old code version
4. Investigate issues
5. Fix and retry migration