import type { MessageEditor } from "@mariozechner/pi-web-ui";
import {
	completeSlashCommand,
	expandSlashCommand,
	findSlashCommand,
	getSlashCommandSuggestions,
	type SlashCommand,
} from "../slash-commands.js";

export class SlashCommandController {
	private commands: SlashCommand[];
	private activeIndex = 0;
	private overlay?: HTMLElement;

	private readonly handleInput = (event: Event) => {
		const textarea = this.getTextarea(event);
		if (!textarea) return;

		this.activeIndex = 0;
		requestAnimationFrame(() => {
			if (textarea.isConnected) {
				this.renderSuggestions(textarea);
			}
		});
	};

	private readonly handleKeyDown = (event: KeyboardEvent) => {
		const textarea = this.getTextarea(event);
		if (!textarea || event.isComposing || event.key === "Process") return;

		const suggestions = getSlashCommandSuggestions(textarea.value, this.commands);
		if (suggestions.length > 0) {
			const exactCommand = findSlashCommand(textarea.value, this.commands);

			if (event.key === "ArrowDown") {
				event.preventDefault();
				this.activeIndex = (this.activeIndex + 1) % suggestions.length;
				this.renderSuggestions(textarea);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				this.activeIndex = (this.activeIndex - 1 + suggestions.length) % suggestions.length;
				this.renderSuggestions(textarea);
				return;
			}

			if (event.key === "Tab") {
				event.preventDefault();
				this.completeCommand(textarea, suggestions[this.getBoundedActiveIndex(suggestions)]);
				return;
			}

			if (event.key === "Enter" && !event.shiftKey) {
				const activeCommand = suggestions[this.getBoundedActiveIndex(suggestions)];
				if (activeCommand.name !== exactCommand?.name) {
					event.preventDefault();
					event.stopPropagation();
					this.completeCommand(textarea, activeCommand);
					return;
				}
			}
		}

		if (event.key === "Enter" && !event.shiftKey) {
			const expanded = expandSlashCommand(textarea.value, this.commands);
			if (expanded !== textarea.value) {
				this.setEditorValue(textarea, expanded);
				this.hideSuggestions();
			}
		}
	};

	constructor(
		private readonly host: HTMLElement,
		commands: SlashCommand[],
	) {
		this.commands = commands;
		this.host.addEventListener("input", this.handleInput, true);
		this.host.addEventListener("keydown", this.handleKeyDown, true);
	}

	setCommands(commands: SlashCommand[]) {
		this.commands = commands;
		const textarea = this.host.querySelector("message-editor textarea");
		if (textarea instanceof HTMLTextAreaElement) {
			this.renderSuggestions(textarea);
		}
	}

	dispose() {
		this.host.removeEventListener("input", this.handleInput, true);
		this.host.removeEventListener("keydown", this.handleKeyDown, true);
		this.hideSuggestions();
	}

	private getTextarea(event: Event): HTMLTextAreaElement | undefined {
		return event.target instanceof HTMLTextAreaElement && event.target.closest("message-editor")
			? event.target
			: undefined;
	}

	private getBoundedActiveIndex(suggestions: SlashCommand[]): number {
		return Math.min(this.activeIndex, suggestions.length - 1);
	}

	private completeCommand(textarea: HTMLTextAreaElement, command: SlashCommand) {
		this.setEditorValue(textarea, completeSlashCommand(textarea.value, command));
		this.activeIndex = 0;
		this.hideSuggestions();
	}

	private setEditorValue(textarea: HTMLTextAreaElement, value: string) {
		const editor = textarea.closest("message-editor") as MessageEditor | null;
		if (!editor) return;

		editor.value = value;
		textarea.value = value;
		textarea.focus();
		textarea.setSelectionRange(value.length, value.length);
		editor.requestUpdate();
	}

	private renderSuggestions(textarea: HTMLTextAreaElement) {
		const suggestions = getSlashCommandSuggestions(textarea.value, this.commands);
		if (suggestions.length === 0) {
			this.hideSuggestions();
			return;
		}

		const editor = textarea.closest("message-editor");
		const container = editor?.firstElementChild;
		if (!(container instanceof HTMLElement)) return;

		if (!this.overlay) {
			this.overlay = document.createElement("div");
			this.overlay.className =
				"absolute left-2 right-2 bottom-full mb-2 z-20 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg";
			container.insertBefore(this.overlay, container.firstChild);
		}

		this.overlay.replaceChildren(
			...suggestions.map((command, index) => this.createSuggestionButton(textarea, command, index)),
		);
	}

	private createSuggestionButton(
		textarea: HTMLTextAreaElement,
		command: SlashCommand,
		index: number,
	): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.className = `w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
			index === this.activeIndex ? "bg-secondary text-foreground" : "hover:bg-secondary/60"
		}`;
		button.setAttribute("aria-selected", index === this.activeIndex ? "true" : "false");

		const name = document.createElement("span");
		name.className = "shrink-0 text-sm font-medium text-primary";
		name.textContent = `/${command.name}`;

		const prompt = document.createElement("span");
		prompt.className = "min-w-0 flex-1 truncate text-xs text-muted-foreground";
		prompt.textContent = command.prompt;

		button.append(name, prompt);
		button.addEventListener("mousedown", (event) => {
			event.preventDefault();
			this.completeCommand(textarea, command);
		});

		return button;
	}

	private hideSuggestions() {
		this.overlay?.remove();
		this.overlay = undefined;
	}
}
