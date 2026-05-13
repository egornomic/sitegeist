import { Button } from "@mariozechner/mini-lit/dist/Button.js";
import { Input } from "@mariozechner/mini-lit/dist/Input.js";
import { SettingsTab } from "@mariozechner/pi-web-ui";
import { html, type TemplateResult } from "lit";
import { Toast } from "../components/Toast.js";
import {
	isValidSlashCommandName,
	normalizeSlashCommandName,
	SLASH_COMMANDS_SETTINGS_KEY,
	type SlashCommand,
	sanitizeSlashCommands,
} from "../slash-commands.js";
import { getSitegeistStorage } from "../storage/app-storage.js";

export class SlashCommandsTab extends SettingsTab {
	private commands: SlashCommand[] = [];
	private editingName: string | null = null;
	private commandName = "";
	private commandPrompt = "";
	private error = "";

	constructor(private readonly onCommandsChanged?: (commands: SlashCommand[]) => void) {
		super();
	}

	getTabName(): string {
		return "Commands";
	}

	override async connectedCallback() {
		super.connectedCallback();
		await this.loadCommands();
	}

	private async loadCommands() {
		const storage = getSitegeistStorage();
		this.commands = sanitizeSlashCommands(await storage.settings.get<SlashCommand[]>(SLASH_COMMANDS_SETTINGS_KEY));
		this.requestUpdate();
	}

	private async saveCommands(commands: SlashCommand[]) {
		const storage = getSitegeistStorage();
		this.commands = [...commands].sort((a, b) => a.name.localeCompare(b.name));
		await storage.settings.set(SLASH_COMMANDS_SETTINGS_KEY, this.commands);
		this.onCommandsChanged?.(this.commands);
		this.requestUpdate();
	}

	private resetForm() {
		this.editingName = null;
		this.commandName = "";
		this.commandPrompt = "";
		this.error = "";
		this.requestUpdate();
	}

	private editCommand(command: SlashCommand) {
		this.editingName = command.name;
		this.commandName = command.name;
		this.commandPrompt = command.prompt;
		this.error = "";
		this.requestUpdate();
	}

	private async deleteCommand(command: SlashCommand) {
		if (!confirm(`Delete /${command.name}?`)) return;

		await this.saveCommands(this.commands.filter((item) => item.name !== command.name));
		if (this.editingName === command.name) {
			this.resetForm();
		}
	}

	private async saveForm() {
		const name = normalizeSlashCommandName(this.commandName);
		const prompt = this.commandPrompt.trim();

		if (!isValidSlashCommandName(name)) {
			this.error = "Use letters, numbers, dashes, or underscores. Start with a letter or number.";
			this.requestUpdate();
			return;
		}

		if (!prompt) {
			this.error = "Prompt is required.";
			this.requestUpdate();
			return;
		}

		const duplicate = this.commands.some((command) => command.name === name && command.name !== this.editingName);
		if (duplicate) {
			this.error = `/${name} already exists.`;
			this.requestUpdate();
			return;
		}

		const nextCommand: SlashCommand = { name, prompt };
		const nextCommands = this.editingName
			? this.commands.map((command) => (command.name === this.editingName ? nextCommand : command))
			: [...this.commands, nextCommand];

		await this.saveCommands(nextCommands);
		this.resetForm();
		Toast.success(`Saved /${name}`);
	}

	private renderCommand(command: SlashCommand): TemplateResult {
		return html`
			<div class="border border-border rounded-lg p-4 bg-card">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1 space-y-1">
						<div class="text-sm font-semibold text-foreground">/${command.name}</div>
						<p class="text-sm text-muted-foreground break-words">${command.prompt}</p>
					</div>
					<div class="flex shrink-0 gap-2">
						${Button({
							variant: "outline",
							size: "sm",
							onClick: () => this.editCommand(command),
							children: "Edit",
						})}
						${Button({
							variant: "destructive",
							size: "sm",
							onClick: () => void this.deleteCommand(command),
							children: "Delete",
						})}
					</div>
				</div>
			</div>
		`;
	}

	render(): TemplateResult {
		return html`
			<div class="flex flex-col gap-6">
				<p class="text-sm text-muted-foreground">
					Create shortcuts that expand when a message starts with a matching slash command.
				</p>

				<div class="border border-border rounded-lg p-4 bg-card space-y-4">
					<h3 class="text-sm font-semibold text-foreground">
						${this.editingName ? `Edit /${this.editingName}` : "New slash command"}
					</h3>

					${Input({
						label: "Command",
						type: "text",
						placeholder: "summarize",
						value: this.commandName,
						onInput: (event) => {
							this.commandName = (event.target as HTMLInputElement).value;
							this.error = "";
							this.requestUpdate();
						},
					})}

					<div class="space-y-2">
						<label class="text-sm font-medium text-foreground">Prompt</label>
						<textarea
							class="w-full min-h-[120px] px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Summarize the current tab's article"
							.value=${this.commandPrompt}
							@input=${(event: Event) => {
								this.commandPrompt = (event.target as HTMLTextAreaElement).value;
								this.error = "";
								this.requestUpdate();
							}}
						></textarea>
					</div>

					${this.error ? html`<p class="text-sm text-destructive">${this.error}</p>` : ""}

					<div class="flex justify-end gap-2">
						${
							this.editingName
								? Button({
										variant: "outline",
										onClick: () => this.resetForm(),
										children: "Cancel",
									})
								: ""
						}
						${Button({
							variant: "default",
							onClick: () => void this.saveForm(),
							children: this.editingName ? "Save" : "Add Command",
						})}
					</div>
				</div>

				${
					this.commands.length === 0
						? html`<div class="text-center text-muted-foreground py-8">No slash commands yet</div>`
						: html`<div class="flex flex-col gap-3">${this.commands.map((command) => this.renderCommand(command))}</div>`
				}
			</div>
		`;
	}
}

customElements.define("slash-commands-tab", SlashCommandsTab);
