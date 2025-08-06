import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const llmKey = pgTable("llm_key", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	llm: text("llm").notNull(),
	key: text("key").notNull(),
	model: text("model").notNull(),
	inUse: boolean("in_use").notNull().default(false),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});