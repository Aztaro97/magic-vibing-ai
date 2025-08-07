import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Define enums
export const messageRoleEnum = pgEnum("message_role", ["USER", "ASSISTANT"]);
export const messageTypeEnum = pgEnum("message_type", ["RESULT", "ERROR"]);

export const message = pgTable("message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  role: messageRoleEnum("role").notNull(),
  type: messageTypeEnum("type").notNull(),
  projectId: text("project_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
