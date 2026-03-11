/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Type must be one of these
		"type-enum": [
			2,
			"always",
			[
				"feat", // New feature
				"fix", // Bug fix
				"docs", // Documentation only changes
				"style", // Changes that do not affect the meaning of the code
				"refactor", // A code change that neither fixes a bug nor adds a feature
				"perf", // A code change that improves performance
				"test", // Adding missing tests or correcting existing tests
				"build", // Changes that affect the build system or external dependencies
				"ci", // Changes to CI configuration files and scripts
				"chore", // Other changes that don't modify src or test files
				"revert", // Reverts a previous commit
				"wip", // Work in progress
			],
		],
		// Scope is optional but when used should be a package name
		"scope-enum": [
			1, // Warning level (not error)
			"always",
			[
				// Apps
				"admin",
				"mobile",
				// Packages
				"api",
				"agents",
				"auth",
				"db",
				"e2b",
				"jobs",
				"ui",
				"validators",
				// Tooling
				"eslint",
				"prettier",
				"typescript",
				// Root level
				"deps",
				"release",
				"config",
			],
		],
		// Subject should not be empty
		"subject-empty": [2, "never"],
		// Subject should not end with period
		"subject-full-stop": [2, "never", "."],
		// Subject should be lowercase
		"subject-case": [0],
		// Type should not be empty
		"type-empty": [2, "never"],
		// Type should be lowercase
		"type-case": [0],
		// Header max length
		"header-max-length": [2, "always", 400],
		// Body max line length
		"body-max-line-length": [2, "always", 600],
	},
	prompt: {
		questions: {
			type: {
				description: "Select the type of change you're committing",
				enum: {
					feat: {
						description: "A new feature",
						title: "Features",
						emoji: "✨",
					},
					fix: {
						description: "A bug fix",
						title: "Bug Fixes",
						emoji: "🐛",
					},
					docs: {
						description: "Documentation only changes",
						title: "Documentation",
						emoji: "📚",
					},
					style: {
						description:
							"Changes that do not affect the meaning of the code (white-space, formatting, etc)",
						title: "Styles",
						emoji: "💎",
					},
					refactor: {
						description:
							"A code change that neither fixes a bug nor adds a feature",
						title: "Code Refactoring",
						emoji: "📦",
					},
					perf: {
						description: "A code change that improves performance",
						title: "Performance Improvements",
						emoji: "🚀",
					},
					test: {
						description: "Adding missing tests or correcting existing tests",
						title: "Tests",
						emoji: "🚨",
					},
					build: {
						description:
							"Changes that affect the build system or external dependencies",
						title: "Builds",
						emoji: "🛠",
					},
					ci: {
						description:
							"Changes to our CI configuration files and scripts",
						title: "Continuous Integrations",
						emoji: "⚙️",
					},
					chore: {
						description: "Other changes that don't modify src or test files",
						title: "Chores",
						emoji: "♻️",
					},
					revert: {
						description: "Reverts a previous commit",
						title: "Reverts",
						emoji: "🗑",
					},
				},
			},
			scope: {
				description:
					"What is the scope of this change (e.g. component or file name)",
			},
			subject: {
				description:
					"Write a short, imperative tense description of the change",
			},
			body: {
				description: "Provide a longer description of the change",
			},
			isBreaking: {
				description: "Are there any breaking changes?",
			},
			breakingBody: {
				description:
					"A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself",
			},
			breaking: {
				description: "Describe the breaking changes",
			},
			isIssueAffected: {
				description: "Does this change affect any open issues?",
			},
			issuesBody: {
				description:
					"If issues are closed, the commit requires a body. Please enter a longer description of the commit itself",
			},
			issues: {
				description: 'Add issue references (e.g. "fix #123", "re #123".)',
			},
		},
	},
};
