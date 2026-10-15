import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
const id = () => text('id').primaryKey();
const created = () => integer('created_at').notNull(); // UTC epoch milliseconds everywhere.

// Gatherings and defaults
export const gatheringDietary = sqliteTable('gathering_dietary', {
  eventId: text('event_id')
    .primaryKey()
    .references(() => events.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  version: integer('version').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});
export const venues = sqliteTable('venues', {
  id: id(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  createdAt: created(),
});

export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    defaultVenueId: text('default_venue_id').references(() => venues.id),
    defaultCapacity: integer('default_capacity'),
    organizerEmail: text('organizer_email'),
    additionalRecipients: text('additional_recipients', {
      mode: 'json',
    }).$type<string[]>(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    check('singleton_settings', sql`${t.id} = 1`),
    check(
      'positive_default_capacity',
      sql`${t.defaultCapacity} IS NULL OR ${t.defaultCapacity} > 0`,
    ),
  ],
);

export const events = sqliteTable(
  'events',
  {
    id: id(),
    occurrenceKey: text('occurrence_key').notNull().unique(),
    slug: text('slug').notNull().unique(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    timezone: text('timezone').notNull().default('Europe/Amsterdam'),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    description: text('description').notNull().default(''),
    capacity: integer('capacity').notNull(),
    registrationCutoff: integer('registration_cutoff').notNull(),
    mealAllocation: integer('meal_allocation'),
    status: text('status', {
      enum: ['scheduled', 'cancelled'],
    })
      .notNull()
      .default('scheduled'),
    version: integer('version').notNull().default(0),
    createdAt: created(),
  },
  (t) => [
    index('events_starts_status').on(t.startsAt, t.status),
    check(
      'event_values',
      sql`${t.capacity} > 0 AND ${t.endsAt} > ${t.startsAt} AND ${t.registrationCutoff} < ${t.startsAt} AND ${t.timezone} = 'Europe/Amsterdam' AND ${t.status} IN ('scheduled','cancelled') AND (${t.mealAllocation} IS NULL OR (${t.mealAllocation} >= 0 AND ${t.mealAllocation} <= ${t.capacity}))`,
    ),
  ],
);

// Participant registrations and private access
export const registrations = sqliteTable(
  'registrations',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    emailNormalized: text('email_normalized'),
    fullName: text('full_name'),
    role: text('role', {
      enum: ['guest', 'helper_chef', 'chef'],
    }).notNull(),
    status: text('status', {
      enum: ['confirmed', 'undecided', 'waiting_list', 'cancelled'],
    }).notNull(),
    language: text('language', {
      enum: ['en', 'nl'],
    }).notNull(),
    dietaryNotes: text('dietary_notes'),
    dietaryConsentAt: integer('dietary_consent_at'),
    comments: text('comments'),
    previousStatus: text('previous_status'),
    chefCostCents: integer('chef_cost_cents').notNull().default(0),
    chefReimbursedCents: integer('chef_reimbursed_cents').notNull().default(0),
    chefCostRecordedAt: integer('chef_cost_recorded_at'),
    paidAt: integer('paid_at'),
    paidAmountCents: integer('paid_amount_cents').notNull().default(0),
    extraGuests: integer('extra_guests').notNull().default(0),
    anonymizedAt: integer('anonymized_at'),
    version: integer('version').notNull().default(0),
    createdAt: created(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('active_event_email')
      .on(t.eventId, t.emailNormalized)
      .where(sql`${t.status} <> 'cancelled' AND ${t.emailNormalized} IS NOT NULL`),
    index('registrations_event_status_created').on(t.eventId, t.status, t.createdAt, t.id),
    index('registrations_event_email').on(t.eventId, t.emailNormalized),
    check(
      'registration_enums',
      sql`${t.role} IN ('guest','helper_chef','chef') AND ${t.status} IN ('confirmed','undecided','waiting_list','cancelled') AND ${t.language} IN ('en','nl')`,
    ),
    check(
      'normalized_email',
      sql`${t.emailNormalized} IS NULL OR (${t.emailNormalized} = lower(trim(${t.emailNormalized})) AND length(${t.emailNormalized}) > 0)`,
    ),
    check(
      'identity_or_anonymous',
      sql`(${t.anonymizedAt} IS NULL AND ${t.emailNormalized} IS NOT NULL AND ${t.fullName} IS NOT NULL AND length(trim(${t.fullName})) > 0) OR (${t.anonymizedAt} IS NOT NULL AND ${t.emailNormalized} IS NULL AND ${t.fullName} IS NULL AND ${t.comments} IS NULL AND ${t.dietaryNotes} IS NULL AND ${t.dietaryConsentAt} IS NULL)`,
    ),
    check('dietary_consent', sql`${t.dietaryNotes} IS NULL OR ${t.dietaryConsentAt} IS NOT NULL`),
  ],
);

export const registrationTokens = sqliteTable('registration_tokens', {
  id: id(),
  registrationId: text('registration_id')
    .notNull()
    .references(() => registrations.id, {
      onDelete: 'cascade',
    }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  revokedAt: integer('revoked_at'),
  createdAt: created(),
});

export const registrationMutations = sqliteTable(
  'registration_mutations',
  {
    id: id(),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id, {
        onDelete: 'cascade',
      }),
    version: integer('version').notNull(),
    action: text('action').notNull(),
    applied: integer('applied').notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('mutation_version').on(t.registrationId, t.version),
    check('mutation_applied', sql`${t.applied}=1`),
    check('mutation_values', sql`${t.version}>0 AND ${t.action} IN ('cancel','confirm','details')`),
  ],
);

// Organizer authentication
export const adminUsers = sqliteTable('admin_users', {
  id: id(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: created(),
});

export const adminSessions = sqliteTable('admin_sessions', {
  id: id(),
  adminId: text('admin_id')
    .notNull()
    .references(() => adminUsers.id, {
      onDelete: 'cascade',
    }),
  sessionHash: text('session_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: created(),
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: id(),
  adminId: text('admin_id')
    .notNull()
    .references(() => adminUsers.id, {
      onDelete: 'cascade',
    }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
  createdAt: created(),
});

// Published recipes and images
export const recipes = sqliteTable(
  'recipes',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category', {
      enum: ['starter', 'main', 'dessert'],
    }).notNull(),
    chefCredit: text('chef_credit'),
    notes: text('notes').notNull().default('[]'),
    youtubeVideoId: text('youtube_video_id'),
    servingGrams: integer('serving_grams'),
    caloriesKcal: integer('calories_kcal'),
    servings: integer('servings'),
    totalMinutes: integer('total_minutes'),
    allergens: text('allergens').notNull().default('[]'),
    version: integer('version').notNull().default(0),
    createdAt: created(),
    publishedAt: integer('published_at').notNull(),
  },
  (t) => [check('recipe_category', sql`${t.category} IN ('starter','main','dessert')`)],
);

export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    id: id(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, {
        onDelete: 'cascade',
      }),
    quantity: text('quantity').notNull(),
    ingredient: text('ingredient').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    uniqueIndex('ingredient_position').on(t.recipeId, t.position),
    check('ingredient_order', sql`${t.position} >= 0`),
  ],
);

export const recipeSteps = sqliteTable(
  'recipe_steps',
  {
    id: id(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, {
        onDelete: 'cascade',
      }),
    instruction: text('instruction').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    uniqueIndex('step_position').on(t.recipeId, t.position),
    check('step_order', sql`${t.position} >= 0`),
  ],
);

export const dishes = sqliteTable('dishes', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  recipeId: text('recipe_id').references(() => recipes.id, {
    onDelete: 'set null',
  }),
  publishedAt: integer('published_at').notNull(),
});

export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: id(),
    r2Key: text('r2_key').notNull().unique(),
    mimeType: text('mime_type').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    altText: text('alt_text').notNull(),
    createdAt: created(),
  },
  (t) => [check('image_dimensions', sql`${t.width} > 0 AND ${t.height} > 0`)],
);

export const dishMedia = sqliteTable(
  'dish_media',
  {
    dishId: text('dish_id')
      .notNull()
      .references(() => dishes.id, {
        onDelete: 'cascade',
      }),
    mediaId: text('media_id')
      .notNull()
      .references(() => mediaAssets.id),
    position: integer('position').notNull(),
    isCover: integer('is_cover', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
  },
  (t) => [
    primaryKey({
      columns: [t.dishId, t.mediaId],
    }),
    uniqueIndex('dish_media_order').on(t.dishId, t.position),
    uniqueIndex('dish_cover')
      .on(t.dishId)
      .where(sql`${t.isCover} = 1`),
    check('dish_media_values', sql`${t.position} >= 0 AND ${t.isCover} IN (0,1)`),
  ],
);

export const recipeMedia = sqliteTable(
  'recipe_media',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, {
        onDelete: 'cascade',
      }),
    mediaId: text('media_id')
      .notNull()
      .references(() => mediaAssets.id),
    position: integer('position').notNull(),
    isCover: integer('is_cover', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
  },
  (t) => [
    primaryKey({
      columns: [t.recipeId, t.mediaId],
    }),
    uniqueIndex('recipe_media_order').on(t.recipeId, t.position),
    uniqueIndex('recipe_cover')
      .on(t.recipeId)
      .where(sql`${t.isCover} = 1`),
    check('recipe_media_values', sql`${t.position} >= 0 AND ${t.isCover} IN (0,1)`),
  ],
);

// Notifications and operational records
export const emailOutbox = sqliteTable(
  'email_outbox',
  {
    id: id(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    eventId: text('event_id').references(() => events.id),
    registrationId: text('registration_id').references(() => registrations.id, {
      onDelete: 'set null',
    }),
    recipient: text('recipient'),
    template: text('template').notNull(),
    locale: text('locale', {
      enum: ['en', 'nl'],
    }).notNull(),
    status: text('status', {
      enum: ['pending', 'sending', 'sent', 'failed', 'purged'],
    })
      .notNull()
      .default('pending'),
    nextAttemptAt: integer('next_attempt_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    leaseUntil: integer('lease_until'),
    sentAt: integer('sent_at'),
    purgeAt: integer('purge_at').notNull(),
    createdAt: created(),
  },
  (t) => [
    index('outbox_due').on(t.status, t.nextAttemptAt),
    check(
      'outbox_values',
      sql`${t.locale} IN ('en','nl') AND ${t.status} IN ('pending','sending','sent','failed','purged') AND ${t.attempts} >= 0 AND ((${t.status} = 'purged' AND ${t.recipient} IS NULL) OR (${t.status} <> 'purged' AND ${t.recipient} IS NOT NULL))`,
    ),
  ],
);
// No rendered bodies, raw transport responses, tokens or participant text in operational logs.

export const emailAttempts = sqliteTable('email_attempts', {
  id: id(),
  outboxId: text('outbox_id')
    .notNull()
    .references(() => emailOutbox.id, {
      onDelete: 'cascade',
    }),
  attemptedAt: integer('attempted_at').notNull(),
  outcomeCode: text('outcome_code').notNull(),
});

export const auditEvents = sqliteTable('audit_events', {
  id: id(),
  adminId: text('admin_id').references(() => adminUsers.id, {
    onDelete: 'set null',
  }),
  eventId: text('event_id').references(() => events.id),
  action: text('action').notNull(),
  createdAt: created(),
});

export const scheduledJobRuns = sqliteTable(
  'scheduled_job_runs',
  {
    id: id(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    eventId: text('event_id').references(() => events.id),
    operation: text('operation').notNull(),
    dueAt: integer('due_at').notNull(),
    completedAt: integer('completed_at'),
    leaseUntil: integer('lease_until'),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [index('jobs_due').on(t.completedAt, t.dueAt)],
);

export const privacyCleanupRuns = sqliteTable(
  'privacy_cleanup_runs',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    cutoff: integer('cutoff').notNull(),
    kind: text('kind', {
      enum: ['dietary', 'identity'],
    }).notNull(),
    affectedRows: integer('affected_rows').notNull(),
    completedAt: integer('completed_at').notNull(),
  },
  (t) => [
    uniqueIndex('cleanup_once').on(t.eventId, t.kind),
    check('cleanup_kind', sql`${t.kind} IN ('dietary','identity') AND ${t.affectedRows} >= 0`),
  ],
);

// Admin throttling and atomic write receipts
export const adminLoginLimits = sqliteTable('admin_login_limits', {
  id: integer('id').primaryKey(),
  windowStart: integer('window_start').notNull(),
  attempts: integer('attempts').notNull(),
});

export const adminWriteReceipts = sqliteTable(
  'admin_write_receipts',
  {
    id: id(),
    applied: integer('applied').notNull(),
    createdAt: created(),
  },
  (t) => [check('admin_write_applied', sql`${t.applied}=1`)],
);

// Organizer-only guests: no email address, participant token or email outbox.
export const walkInGuests = sqliteTable(
  'walk_in_guests',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    fullName: text('full_name').notNull(),
    status: text('status', { enum: ['confirmed', 'cancelled', 'no_show'] }).notNull(),
    comments: text('comments'),
    previousStatus: text('previous_status'),
    paidAt: integer('paid_at'),
    paidAmountCents: integer('paid_amount_cents').notNull().default(0),
    extraGuests: integer('extra_guests').notNull().default(0),
    limitsOverridden: integer('limits_overridden', { mode: 'boolean' }).notNull().default(false),
    overrideReason: text('override_reason'),
    source: text('source').notNull().default('other'),
    role: text('role', { enum: ['guest', 'helper_chef', 'chef'] })
      .notNull()
      .default('guest'),
    chefCostCents: integer('chef_cost_cents').notNull().default(0),
    chefReimbursedCents: integer('chef_reimbursed_cents').notNull().default(0),
    chefCostRecordedAt: integer('chef_cost_recorded_at'),
    version: integer('version').notNull().default(0),
    createdAt: created(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('walk_ins_event_status').on(t.eventId, t.status),
    check(
      'walk_in_values',
      sql`length(trim(${t.fullName}))>0 AND ${t.status} IN ('confirmed','cancelled','no_show') AND ${t.limitsOverridden} IN (0,1) AND (${t.limitsOverridden}=0 OR (${t.overrideReason} IS NOT NULL AND length(trim(${t.overrideReason}))>0))`,
    ),
  ],
);

// Booking remains cancelled; this marker distinguishes absence from cancellation.
export const registrationNoShows = sqliteTable('registration_no_shows', {
  registrationId: text('registration_id')
    .primaryKey()
    .references(() => registrations.id, { onDelete: 'cascade' }),
  createdAt: created(),
});
