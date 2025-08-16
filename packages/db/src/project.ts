import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const project = pgTable("project", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	userId: text("user_id").notNull(),
	model: text("model").notNull().default("claude-opus-4-0"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
