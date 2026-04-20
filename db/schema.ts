import { relations } from "drizzle-orm/relations";
import {
  pgTable,
  text, pgEnum, uuid, uniqueIndex,
  timestamp,
  boolean,
  index,
  integer,
} from "drizzle-orm/pg-core";


/* =========================
   Better Auth Tables
========================= */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));


/* =========================
   ENUMS
========================= */

export const nodeTypeEnum = pgEnum("node_type", ["file", "folder"]);

export const permissionRoleEnum = pgEnum("permission_role", [
  "viewer",
  "editor",
]);

export const shareRoleEnum = pgEnum("share_role", [
  "viewer",
  "editor",
]);

/* =========================
   NODES TABLE
========================= */

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    type: nodeTypeEnum("type").notNull(),

    parentId: uuid("parent_id"),

    // materialized path using UUIDs
    path: text("path").notNull(),
    depth: integer("depth").notNull().default(0),

    // file-specific
    s3Key: text("s3_key"),
    mimeType: text("mime_type"),
    size: integer("size"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("nodes_path_idx").on(table.path),
    index("nodes_parent_idx").on(table.parentId),

    uniqueIndex("nodes_parent_name_idx").on(
      table.parentId,
      table.name
    ),
  ],
);

/* =========================
   PERMISSIONS TABLE
========================= */

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    role: permissionRoleEnum("role").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("permissions_unique_idx").on(
      table.nodeId,
      table.userId
    ),
    index("permissions_user_idx").on(table.userId),
    index("permissions_node_idx").on(table.nodeId),
  ],
);

/* =========================
   SHARES TABLE
========================= */

export const shares = pgTable(
  "shares",
  {
    id: text("id").primaryKey(), // nanoid / random token

    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    role: shareRoleEnum("role").notNull(),

    isPublic: boolean("is_public").default(true).notNull(),

    password: text("password"), // hashed (optional)

    expiresAt: timestamp("expires_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("shares_node_idx").on(table.nodeId),
    index("shares_creator_idx").on(table.createdBy),
  ],
);

/* =========================
   RELATIONS (optional but useful)
========================= */

export const nodeRelations = relations(nodes, ({ one, many }) => ({
  parent: one(nodes, {
    fields: [nodes.parentId],
    references: [nodes.id],
  }),
  children: many(nodes),

  permissions: many(permissions),
  shares: many(shares),
}));

export const permissionRelations = relations(permissions, ({ one }) => ({
  node: one(nodes, {
    fields: [permissions.nodeId],
    references: [nodes.id],
  }),
  user: one(user, {
    fields: [permissions.userId],
    references: [user.id],
  }),
}));

export const shareRelations = relations(shares, ({ one }) => ({
  node: one(nodes, {
    fields: [shares.nodeId],
    references: [nodes.id],
  }),
  creator: one(user, {
    fields: [shares.createdBy],
    references: [user.id],
  }),
}));