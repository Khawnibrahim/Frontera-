/**
 * Frontera Scheduling — public schema (aligned with Lovable / Frontera_Database_Schema.pdf).
 * RLS policies and SECURITY DEFINER functions live in Supabase SQL migrations (see drizzle/*.sql).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const auth = pgSchema('auth');
export const authUsers = auth.table('users', {
  id: uuid('id').primaryKey(),
});

// --- Enums (Lovable / Supabase) ---

export const appRoleEnum = pgEnum('app_role', [
  'admin',
  'internal_staff',
  'provider_user',
  'client_user',
]);

export const timeOffChangeTypeEnum = pgEnum('time_off_change_type', [
  'remove_day',
  'add_day',
  'swap',
  'modify_shift',
]);

export const timeOffStatusEnum = pgEnum('time_off_status', [
  'pending_review',
  'approved',
  'denied',
  'cancelled',
]);

export const monthlyAvailStatusEnum = pgEnum('monthly_avail_status', [
  'requested',
  'submitted',
  'approved',
  'denied',
]);

export const ptoStatusEnum = pgEnum('pto_status', [
  'submitted',
  'approved',
  'denied',
  'cancelled',
]);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'active',
  'inactive',
  'ended',
]);

export const orgTypeEnum = pgEnum('org_type', ['client', 'vendor']);

export const docCategoryEnum = pgEnum('doc_category', [
  'general',
  'pacr',
  'credential',
  'contract',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'approve',
  'deny',
  'invite',
  'submit',
  'finalize',
  'export',
  'login',
]);

export const scheduleFinalizationStatusEnum = pgEnum('schedule_finalization_status', [
  'draft',
  'finalized',
  'reopened',
]);

// --- Tables ---

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    email: text('email'),
    fullName: text('full_name'),
    phone: text('phone'),
    specialty: text('specialty'),
    state: text('state'),
    statesLicensed: text('states_licensed'),
    employmentType: text('employment_type'),
    scheduleType: text('schedule_type').notNull().default('set'),
    company: text('company').notNull().default('Frontera'),
    region: text('region'),
    facilityName: text('facility_name'),
    facilityLocation: text('facility_location'),
    primaryFacilityId: uuid('primary_facility_id').references(() => workSites.id, {
      onDelete: 'set null',
    }),
    workSchedule: text('work_schedule'),
    providerId: text('provider_id'),
    recruiterId: uuid('recruiter_id'),
    recruiterName: text('recruiter_name'),
    recruiterEmail: text('recruiter_email'),
    recruiterPhone: text('recruiter_phone'),
    liaisonId: uuid('liaison_id'),
    liaisonName: text('liaison_name'),
    liaisonEmail: text('liaison_email'),
    liaisonPhone: text('liaison_phone'),
    portalType: text('portal_type'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('profiles_user_id_key').on(table.userId),
    recruiterIdx: index('profiles_recruiter_id_idx').on(table.recruiterId),
    liaisonIdx: index('profiles_liaison_id_idx').on(table.liaisonId),
    primaryFacilityIdx: index('profiles_primary_facility_id_idx').on(table.primaryFacilityId),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: appRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userRoleUnique: uniqueIndex('user_roles_user_id_role_key').on(table.userId, table.role),
  }),
);

export const workSites = pgTable('work_sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  facilityName: text('facility_name').notNull(),
  clientName: text('client_name').notNull().default('Optum'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  region: text('region'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const providerWorkSites = pgTable(
  'provider_work_sites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    workSiteId: uuid('work_site_id')
      .notNull()
      .references(() => workSites.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    weeklySchedule: jsonb('weekly_schedule')
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerWorkSiteUnique: uniqueIndex('provider_work_sites_provider_work_site_key').on(
      table.providerId,
      table.workSiteId,
    ),
    providerIdx: index('provider_work_sites_provider_id_idx').on(table.providerId),
    workSiteIdx: index('provider_work_sites_work_site_id_idx').on(table.workSiteId),
  }),
);

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileName: text('file_name').notNull(),
  originalFilename: text('original_filename').notNull(),
  storagePath: text('storage_path').notNull(),
  bucket: text('bucket').notNull().default('secure-documents'),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  category: docCategoryEnum('category').notNull().default('general'),
  roleVisibility: appRoleEnum('role_visibility').array().notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  uploaderId: uuid('uploader_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const timeOffRequests = pgTable(
  'time_off_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    recruiterId: uuid('recruiter_id'),
    liaisonId: uuid('liaison_id'),
    workSiteId: uuid('work_site_id').references(() => workSites.id, { onDelete: 'set null' }),
    requestDate: date('request_date').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    isUnavailable: boolean('is_unavailable').notNull().default(true),
    changeType: timeOffChangeTypeEnum('change_type').notNull().default('remove_day'),
    status: timeOffStatusEnum('status').notNull().default('pending_review'),
    clientName: text('client_name').notNull().default('Optum'),
    specialty: text('specialty'),
    notes: text('notes'),
    submissionGroupId: uuid('submission_group_id'),
    pacrDocumentId: uuid('pacr_document_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerDateIdx: index('time_off_requests_provider_id_request_date_idx').on(
      table.providerId,
      table.requestDate,
    ),
    statusDateIdx: index('time_off_requests_status_request_date_idx').on(
      table.status,
      table.requestDate,
    ),
    recruiterIdx: index('time_off_requests_recruiter_id_idx').on(table.recruiterId),
    liaisonIdx: index('time_off_requests_liaison_id_idx').on(table.liaisonId),
  }),
);

export const monthlyAvailabilityRequests = pgTable(
  'monthly_availability_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    monthYear: date('month_year').notNull(),
    deadline: date('deadline').notNull(),
    status: monthlyAvailStatusEnum('status').notNull().default('requested'),
    noChanges: boolean('no_changes').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submissionGroupId: uuid('submission_group_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerMonthUnique: uniqueIndex('monthly_availability_requests_provider_month_key').on(
      table.providerId,
      table.monthYear,
    ),
  }),
);

export const ptoRequests = pgTable('pto_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerId: uuid('provider_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  recruiterId: uuid('recruiter_id'),
  orgId: uuid('org_id'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  status: ptoStatusEnum('status').notNull().default('submitted'),
  notes: text('notes'),
  specialty: text('specialty'),
  statesLicensed: text('states_licensed'),
  clientName: text('client_name'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: orgTypeEnum('type').notNull().default('client'),
  domain: text('domain'),
  settings: jsonb('settings').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMemberships = pgTable(
  'org_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userOrgUnique: uniqueIndex('org_memberships_user_id_org_id_key').on(table.userId, table.orgId),
  }),
);

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    recruiterId: uuid('recruiter_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    clientOrgId: uuid('client_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    specialty: text('specialty'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    status: assignmentStatusEnum('status').notNull().default('active'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    recruiterIdx: index('assignments_recruiter_id_idx').on(table.recruiterId),
    providerIdx: index('assignments_provider_id_idx').on(table.providerId),
    clientOrgIdx: index('assignments_client_org_id_idx').on(table.clientOrgId),
  }),
);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: jsonb('details').default(sql`'{}'::jsonb`),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message'),
    link: text('link'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userReadCreatedIdx: index('notifications_user_id_read_created_at_idx').on(
      table.userId,
      table.read,
      table.createdAt,
    ),
  }),
);

export const scheduledEmails = pgTable(
  'scheduled_emails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientEmail: text('recipient_email').notNull(),
    recipientUserId: uuid('recipient_user_id'),
    templateName: text('template_name').notNull(),
    templateData: jsonb('template_data')
      .notNull()
      .default(sql`'{}'::jsonb`),
    sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: text('status').notNull().default('scheduled'),
    relatedTable: text('related_table'),
    relatedId: text('related_id'),
    cancelIfField: text('cancel_if_field'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusSendAtIdx: index('scheduled_emails_status_send_at_idx').on(table.status, table.sendAt),
  }),
);

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull().default('general'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const announcementRecipients = pgTable(
  'announcement_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    announcementUserUnique: uniqueIndex('announcement_recipients_announcement_user_key').on(
      table.announcementId,
      table.userId,
    ),
  }),
);

export const providerInvites = pgTable('provider_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  specialty: text('specialty'),
  state: text('state'),
  employmentType: text('employment_type'),
  workSchedule: text('work_schedule'),
  region: text('region'),
  company: text('company'),
  providerIdExternal: text('provider_id_external'),
  recruiterId: uuid('recruiter_id'),
  liaisonId: uuid('liaison_id'),
  workSiteAssignments: jsonb('work_site_assignments')
    .notNull()
    .default(sql`'[]'::jsonb`),
  invitedBy: uuid('invited_by'),
  createdUserId: uuid('created_user_id'),
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    holidayDate: date('holiday_date').notNull(),
    year: integer('year').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    holidayDateUnique: uniqueIndex('holidays_holiday_date_key').on(table.holidayDate),
  }),
);

export const hrContacts = pgTable('hr_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().default('HR Support'),
  email: text('email'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const optumPocs = pgTable('optum_pocs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workSiteId: uuid('work_site_id').references(() => workSites.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: text('role'),
  email: text('email'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Q4 deliverable: per-facility month finalization (Nest API — not in Lovable PDF table list). */
export const scheduleFinalizations = pgTable(
  'schedule_finalizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workSiteId: uuid('work_site_id')
      .notNull()
      .references(() => workSites.id, { onDelete: 'cascade' }),
    monthYear: date('month_year').notNull(),
    status: scheduleFinalizationStatusEnum('status').notNull().default('draft'),
    finalizedBy: uuid('finalized_by').references(() => authUsers.id, { onDelete: 'set null' }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    siteMonthUnique: uniqueIndex('schedule_finalizations_work_site_month_key').on(
      table.workSiteId,
      table.monthYear,
    ),
  }),
);
