export interface SlashCommand {
	name: string;
	prompt: string;
}

interface SlashCommandTrigger {
	name: string;
	suffix: string;
	hasSuffix: boolean;
}

export const SLASH_COMMANDS_SETTINGS_KEY = "slashCommands";

const SLASH_COMMAND_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function normalizeSlashCommandName(name: string): string {
	return name.trim().replace(/^\/+/, "").toLowerCase();
}

export function isValidSlashCommandName(name: string): boolean {
	return SLASH_COMMAND_NAME_PATTERN.test(normalizeSlashCommandName(name));
}

function parseSlashCommandTrigger(input: string): SlashCommandTrigger | undefined {
	const trimmedInput = input.trimStart();
	if (!trimmedInput.startsWith("/")) return undefined;

	const match = /^\/([a-z0-9_-]*)(?:\s+([\s\S]*))?$/i.exec(trimmedInput);
	if (!match) return undefined;

	return {
		name: normalizeSlashCommandName(match[1]),
		suffix: match[2]?.trimStart() ?? "",
		hasSuffix: match[2] !== undefined,
	};
}

export function findSlashCommand(input: string, commands: SlashCommand[]): SlashCommand | undefined {
	const trigger = parseSlashCommandTrigger(input);
	if (!trigger?.name) return undefined;

	return commands.find((command) => normalizeSlashCommandName(command.name) === trigger.name);
}

export function expandSlashCommand(input: string, commands: SlashCommand[]): string {
	const trigger = parseSlashCommandTrigger(input);
	if (!trigger?.name) return input;

	const command = findSlashCommand(input, commands);
	if (!command) return input;

	const prompt = command.prompt.trimEnd();
	if (!trigger.suffix) return prompt;

	return `${prompt} ${trigger.suffix}`;
}

export function getSlashCommandSuggestions(input: string, commands: SlashCommand[]): SlashCommand[] {
	const trigger = parseSlashCommandTrigger(input);
	if (!trigger || trigger.hasSuffix) return [];

	return commands
		.filter((command) => normalizeSlashCommandName(command.name).startsWith(trigger.name))
		.sort((a, b) => normalizeSlashCommandName(a.name).localeCompare(normalizeSlashCommandName(b.name)));
}

export function completeSlashCommand(input: string, command: SlashCommand): string {
	const trimmedInput = input.trimStart();
	if (!trimmedInput.startsWith("/")) return input;

	const leadingWhitespace = input.slice(0, input.length - trimmedInput.length);
	return `${leadingWhitespace}/${normalizeSlashCommandName(command.name)} `;
}

export function sanitizeSlashCommands(value: unknown): SlashCommand[] {
	if (!Array.isArray(value)) return [];

	const commands = new Map<string, SlashCommand>();
	for (const item of value) {
		if (!isRecord(item) || typeof item.name !== "string" || typeof item.prompt !== "string") continue;

		const name = normalizeSlashCommandName(item.name);
		const prompt = item.prompt.trim();
		if (!isValidSlashCommandName(name) || !prompt) continue;

		commands.set(name, { name, prompt });
	}

	return [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));
}
