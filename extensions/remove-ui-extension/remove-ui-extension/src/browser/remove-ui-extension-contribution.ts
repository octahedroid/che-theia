import { injectable, inject } from "inversify";
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from "@theia/core/lib/common";
import { CommonMenus } from "@theia/core/lib/browser";

export const RemoveUiExtensionCommand = {
    id: 'RemoveUiExtension.command',
    label: "Say Hello"
};

@injectable()
export class RemoveUiExtensionCommandContribution implements CommandContribution {

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(RemoveUiExtensionCommand, {
            execute: () => this.messageService.info('Hello World!')
        });
    }
}

@injectable()
export class RemoveUiExtensionMenuContribution implements MenuContribution {

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.EDIT_FIND, {
            commandId: RemoveUiExtensionCommand.id,
            label: RemoveUiExtensionCommand.label
        });
    }
}
