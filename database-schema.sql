-- Full Brain Database Schema Design
-- Version: 1.0
-- Created: 2025-01-08
-- Description: Complete database schema redesign for Full Brain application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if doing fresh install (comment out for migration)
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS note_associations CASCADE;
-- DROP TABLE IF EXISTS links CASCADE;
-- DROP TABLE IF EXISTS routine_steps CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS routines CASCADE;
-- DROP TABLE IF EXISTS goals CASCADE;
-- DROP TABLE IF EXISTS projects CASCADE;
-- DROP TABLE IF EXISTS notes CASCADE;
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS memories CASCADE; -- Old table

-- Create custom types
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
CREATE TYPE entity_type AS ENUM ('goal', 'routine', 'task', 'event', 'note', 'project');
CREATE TYPE entity_status AS ENUM ('active', 'completed', 'paused', 'archived', 'deleted');
CREATE TYPE priority_level AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');
CREATE TYPE recurrence_pattern AS ENUM (
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly',
    'every_n_days', 'every_n_weeks', 'every_n_months',
    'nth_weekday_of_month', 'custom'
);
CREATE TYPE time_of_day AS ENUM (
    'early_morning', 'mid_morning', 'noon', 
    'early_afternoon', 'late_afternoon', 
    'evening', 'late_evening', 'night', 'late_night'
);
CREATE TYPE link_type AS ENUM ('documentation', 'reference', 'resource', 'other');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'USER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL DEFAULT uuid_generate_v4() -- For future multi-tenancy
);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_preference VARCHAR(50) DEFAULT 'light',
    time_zone VARCHAR(50) DEFAULT 'UTC',
    notification_enabled BOOLEAN DEFAULT true,
    notification_advance_minutes INTEGER DEFAULT 15,
    default_task_duration INTEGER DEFAULT 30, -- minutes
    default_priority_level priority_level DEFAULT '5',
    feed_items_per_page INTEGER DEFAULT 20,
    show_completed_in_feed BOOLEAN DEFAULT false,
    ai_suggestion_frequency VARCHAR(50) DEFAULT 'moderate',
    ai_context_sensitivity INTEGER DEFAULT 5, -- 1-10 scale
    time_of_day_categories JSONB DEFAULT '{
        "early_morning": {"start": "05:00", "end": "07:00"},
        "mid_morning": {"start": "07:00", "end": "10:00"},
        "noon": {"start": "10:00", "end": "13:00"},
        "early_afternoon": {"start": "13:00", "end": "15:00"},
        "late_afternoon": {"start": "15:00", "end": "17:00"},
        "evening": {"start": "17:00", "end": "19:00"},
        "late_evening": {"start": "19:00", "end": "21:00"},
        "night": {"start": "21:00", "end": "23:00"},
        "late_night": {"start": "23:00", "end": "05:00"}
    }'::jsonb,
    custom_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Projects table (top-level container)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status entity_status DEFAULT 'active',
    priority priority_level DEFAULT '5',
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL,
    CONSTRAINT valid_nesting CHECK (
        -- Prevent deep nesting (max 3 levels)
        parent_project_id IS NULL OR 
        NOT EXISTS (
            SELECT 1 FROM projects p2 
            WHERE p2.id = parent_project_id 
            AND p2.parent_project_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM projects p3 
                WHERE p3.id = p2.parent_project_id 
                AND p3.parent_project_id IS NOT NULL
            )
        )
    )
);

-- Goals table
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status entity_status DEFAULT 'active',
    priority priority_level DEFAULT '5',
    frequency_check_pattern recurrence_pattern,
    frequency_check_interval INTEGER, -- For "every N days/weeks" patterns
    frequency_check_details JSONB, -- For complex patterns
    target_date DATE,
    completed_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    tags TEXT[],
    ai_context JSONB DEFAULT '{}',
    ai_context_score INTEGER CHECK (ai_context_score >= 1 AND ai_context_score <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- Goal milestones table
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completed_date DATE,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Routines table
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status entity_status DEFAULT 'active',
    priority priority_level DEFAULT '5',
    recurrence_pattern recurrence_pattern NOT NULL,
    recurrence_interval INTEGER, -- For "every N days/weeks" patterns
    recurrence_details JSONB, -- For complex patterns like "3rd Wednesday"
    time_of_day time_of_day,
    preferred_time TIME,
    duration_minutes INTEGER,
    last_completed TIMESTAMP WITH TIME ZONE,
    next_due TIMESTAMP WITH TIME ZONE,
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    performance_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    total_misses INTEGER DEFAULT 0,
    is_paused BOOLEAN DEFAULT false,
    paused_until DATE,
    tags TEXT[],
    ai_context JSONB DEFAULT '{}',
    ai_context_score INTEGER CHECK (ai_context_score >= 1 AND ai_context_score <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- Routine steps table
CREATE TABLE routine_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    parent_step_id UUID REFERENCES routine_steps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    duration_minutes INTEGER,
    is_completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(routine_id, step_order),
    CONSTRAINT valid_step_nesting CHECK (
        -- Prevent deep nesting (max 3 levels)
        parent_step_id IS NULL OR 
        NOT EXISTS (
            SELECT 1 FROM routine_steps rs2 
            WHERE rs2.id = parent_step_id 
            AND rs2.parent_step_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM routine_steps rs3 
                WHERE rs3.id = rs2.parent_step_id 
                AND rs3.parent_step_id IS NOT NULL
            )
        )
    )
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status entity_status DEFAULT 'active',
    priority priority_level DEFAULT '5',
    event_date DATE NOT NULL,
    event_time TIME,
    end_date DATE,
    end_time TIME,
    location VARCHAR(255),
    location_coordinates POINT, -- PostgreSQL geographic type
    time_zone VARCHAR(50),
    is_all_day BOOLEAN DEFAULT false,
    reminder_minutes INTEGER,
    tags TEXT[],
    ai_context JSONB DEFAULT '{}',
    ai_context_score INTEGER CHECK (ai_context_score >= 1 AND ai_context_score <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL,
    CONSTRAINT valid_event_nesting CHECK (
        -- Prevent deep nesting (max 3 levels)
        parent_event_id IS NULL OR 
        NOT EXISTS (
            SELECT 1 FROM events e2 
            WHERE e2.id = parent_event_id 
            AND e2.parent_event_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM events e3 
                WHERE e3.id = e2.parent_event_id 
                AND e3.parent_event_id IS NOT NULL
            )
        )
    )
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status entity_status DEFAULT 'active',
    priority priority_level DEFAULT '5',
    due_date DATE,
    due_time TIME,
    time_of_day time_of_day,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    completed_date TIMESTAMP WITH TIME ZONE,
    days_overdue INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN due_date IS NOT NULL AND status = 'active' AND CURRENT_DATE > due_date 
            THEN CURRENT_DATE - due_date 
            ELSE 0 
        END
    ) STORED,
    computed_priority INTEGER GENERATED ALWAYS AS (
        CAST(priority AS INTEGER) + 
        CASE 
            WHEN due_date IS NOT NULL AND CURRENT_DATE > due_date 
            THEN LEAST((CURRENT_DATE - due_date), 5) -- Cap overdue bonus at 5
            ELSE 0 
        END +
        COALESCE(ai_context_score, 0)
    ) STORED,
    location VARCHAR(255),
    location_coordinates POINT,
    reminder_minutes INTEGER,
    tags TEXT[],
    ai_context JSONB DEFAULT '{}',
    ai_context_score INTEGER CHECK (ai_context_score >= 1 AND ai_context_score <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_short VARCHAR(255) GENERATED ALWAYS AS (
        CASE 
            WHEN LENGTH(content) <= 255 THEN content 
            ELSE SUBSTRING(content FROM 1 FOR 252) || '...' 
        END
    ) STORED,
    is_hidden BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    tags TEXT[],
    ai_generated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL
);

-- Note associations table (many-to-many)
CREATE TABLE note_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type entity_type NOT NULL,
    association_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(note_id, entity_id, entity_type)
);

-- Links table
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type entity_type NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    link_type link_type DEFAULT 'other',
    click_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    preview_title VARCHAR(255),
    preview_description TEXT,
    preview_image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI conversations table
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id UUID,
    entity_type entity_type,
    messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
    context JSONB DEFAULT '{}',
    total_messages INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_id UUID NOT NULL,
    entity_type entity_type NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, complete, archive
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);

CREATE INDEX idx_projects_user_tenant ON projects(user_id, tenant_id);
CREATE INDEX idx_projects_parent ON projects(parent_project_id);
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_goals_user_tenant ON goals(user_id, tenant_id);
CREATE INDEX idx_goals_project ON goals(project_id);
CREATE INDEX idx_goals_status ON goals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_target_date ON goals(target_date) WHERE status = 'active';

CREATE INDEX idx_routines_user_tenant ON routines(user_id, tenant_id);
CREATE INDEX idx_routines_project ON routines(project_id);
CREATE INDEX idx_routines_next_due ON routines(next_due) WHERE status = 'active' AND is_paused = false;
CREATE INDEX idx_routines_status ON routines(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_routine_steps_routine ON routine_steps(routine_id);
CREATE INDEX idx_routine_steps_order ON routine_steps(routine_id, step_order);

CREATE INDEX idx_events_user_tenant ON events(user_id, tenant_id);
CREATE INDEX idx_events_project ON events(project_id);
CREATE INDEX idx_events_parent ON events(parent_event_id);
CREATE INDEX idx_events_date ON events(event_date) WHERE status = 'active';
CREATE INDEX idx_events_status ON events(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_user_tenant ON tasks(user_id, tenant_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_goal ON tasks(goal_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status = 'active';
CREATE INDEX idx_tasks_computed_priority ON tasks(computed_priority DESC) WHERE status = 'active';
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_notes_user_tenant ON notes(user_id, tenant_id);
CREATE INDEX idx_notes_visible ON notes(user_id) WHERE is_hidden = false AND deleted_at IS NULL;

CREATE INDEX idx_note_associations_note ON note_associations(note_id);
CREATE INDEX idx_note_associations_entity ON note_associations(entity_id, entity_type);

CREATE INDEX idx_links_entity ON links(entity_id, entity_type);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, tenant_id);
CREATE INDEX idx_ai_conversations_entity ON ai_conversations(entity_id, entity_type);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_id, entity_type);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON goal_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_steps_updated_at BEFORE UPDATE ON routine_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update routine completion stats
CREATE OR REPLACE FUNCTION update_routine_completion_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        UPDATE routines 
        SET completed_steps = completed_steps + 1
        WHERE id = NEW.routine_id;
    ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
        UPDATE routines 
        SET completed_steps = completed_steps - 1
        WHERE id = NEW.routine_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_routine_stats AFTER UPDATE OF is_completed ON routine_steps
    FOR EACH ROW EXECUTE FUNCTION update_routine_completion_stats();

-- Create views for common queries

-- Today's items view
CREATE VIEW today_items AS
SELECT 
    'task' as item_type,
    t.id,
    t.user_id,
    t.name,
    t.description,
    t.priority,
    t.computed_priority,
    t.due_date,
    t.due_time,
    t.time_of_day,
    t.status,
    t.tags,
    t.project_id,
    p.name as project_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.status = 'active' 
    AND t.deleted_at IS NULL
    AND (t.due_date = CURRENT_DATE OR t.due_date < CURRENT_DATE)

UNION ALL

SELECT 
    'routine' as item_type,
    r.id,
    r.user_id,
    r.name,
    r.description,
    r.priority,
    CAST(r.priority AS INTEGER) + COALESCE(r.ai_context_score, 0) as computed_priority,
    DATE(r.next_due) as due_date,
    r.preferred_time as due_time,
    r.time_of_day,
    r.status,
    r.tags,
    r.project_id,
    p.name as project_name
FROM routines r
LEFT JOIN projects p ON r.project_id = p.id
WHERE r.status = 'active' 
    AND r.deleted_at IS NULL
    AND r.is_paused = false
    AND DATE(r.next_due) <= CURRENT_DATE

UNION ALL

SELECT 
    'event' as item_type,
    e.id,
    e.user_id,
    e.name,
    e.description,
    e.priority,
    CAST(e.priority AS INTEGER) + COALESCE(e.ai_context_score, 0) as computed_priority,
    e.event_date as due_date,
    e.event_time as due_time,
    NULL as time_of_day,
    e.status,
    e.tags,
    e.project_id,
    p.name as project_name
FROM events e
LEFT JOIN projects p ON e.project_id = p.id
WHERE e.status = 'active' 
    AND e.deleted_at IS NULL
    AND e.event_date = CURRENT_DATE;

-- Feed items view (for main scroll)
CREATE VIEW feed_items AS
SELECT 
    item_type,
    id,
    user_id,
    name,
    description,
    priority,
    computed_priority,
    due_date,
    due_time,
    time_of_day,
    status,
    tags,
    project_id,
    project_name,
    created_at
FROM (
    SELECT 
        'task' as item_type,
        t.id,
        t.user_id,
        t.name,
        t.description,
        t.priority,
        t.computed_priority,
        t.due_date,
        t.due_time,
        t.time_of_day,
        t.status,
        t.tags,
        t.project_id,
        p.name as project_name,
        t.created_at
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        'routine' as item_type,
        r.id,
        r.user_id,
        r.name,
        r.description,
        r.priority,
        CAST(r.priority AS INTEGER) + COALESCE(r.ai_context_score, 0) as computed_priority,
        DATE(r.next_due) as due_date,
        r.preferred_time as due_time,
        r.time_of_day,
        r.status,
        r.tags,
        r.project_id,
        p.name as project_name,
        r.created_at
    FROM routines r
    LEFT JOIN projects p ON r.project_id = p.id
    WHERE r.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        'event' as item_type,
        e.id,
        e.user_id,
        e.name,
        e.description,
        e.priority,
        CAST(e.priority AS INTEGER) + COALESCE(e.ai_context_score, 0) as computed_priority,
        e.event_date as due_date,
        e.event_time as due_time,
        NULL as time_of_day,
        e.status,
        e.tags,
        e.project_id,
        p.name as project_name,
        e.created_at
    FROM events e
    LEFT JOIN projects p ON e.project_id = p.id
    WHERE e.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        'goal' as item_type,
        g.id,
        g.user_id,
        g.name,
        g.description,
        g.priority,
        CAST(g.priority AS INTEGER) + COALESCE(g.ai_context_score, 0) as computed_priority,
        g.target_date as due_date,
        NULL as due_time,
        NULL as time_of_day,
        g.status,
        g.tags,
        g.project_id,
        p.name as project_name,
        g.created_at
    FROM goals g
    LEFT JOIN projects p ON g.project_id = p.id
    WHERE g.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        'note' as item_type,
        n.id,
        n.user_id,
        n.content_short as name,
        n.content as description,
        '5' as priority,
        5 as computed_priority,
        NULL as due_date,
        NULL as due_time,
        NULL as time_of_day,
        'active' as status,
        n.tags,
        NULL as project_id,
        NULL as project_name,
        n.created_at
    FROM notes n
    WHERE n.deleted_at IS NULL 
        AND n.is_hidden = false
        AND NOT EXISTS (
            SELECT 1 FROM note_associations na 
            WHERE na.note_id = n.id
        )
) AS all_items
ORDER BY computed_priority DESC, due_date ASC NULLS LAST, created_at DESC;