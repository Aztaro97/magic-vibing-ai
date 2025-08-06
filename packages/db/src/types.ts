import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
	fragment,
	llmKey,
	message,
	messageRoleEnum,
	messageTypeEnum,
	project,
	user
} from "./schema";

// Infer types from schema
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type LlmKey = InferSelectModel<typeof llmKey>;
export type NewLlmKey = InferInsertModel<typeof llmKey>;

export type Project = InferSelectModel<typeof project>;
export type NewProject = InferInsertModel<typeof project>;

export type Message = InferSelectModel<typeof message>;
export type NewMessage = InferInsertModel<typeof message>;

export type Fragment = InferSelectModel<typeof fragment>;
export type NewFragment = InferInsertModel<typeof fragment>;

// Export enum values
export type MessageRole = typeof messageRoleEnum.enumValues[number];
export type MessageType = typeof messageTypeEnum.enumValues[number];

// Utility types for relations
export type UserWithRelations = User & {
	llmKeys?: LlmKey[];
	projects?: Project[];
};

export type ProjectWithRelations = Project & {
	user?: User;
	messages?: Message[];
};

export type MessageWithRelations = Message & {
	project?: Project;
	fragment?: Fragment;
};

export type FragmentWithRelations = Fragment & {
	message?: Message;
};