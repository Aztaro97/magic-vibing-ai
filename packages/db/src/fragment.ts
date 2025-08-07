import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const fragment = pgTable("fragment", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	messageId: text("message_id").notNull().unique(),
	sandboxUrl: text("sandbox_url").notNull(),
	title: text("title").notNull(),
	files: json("files").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

