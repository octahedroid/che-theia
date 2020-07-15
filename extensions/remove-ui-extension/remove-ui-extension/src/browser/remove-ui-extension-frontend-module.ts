/**
 * Generated using theia-extension-generator
 */
import { RemoveUiExtensionCommandContribution, RemoveUiExtensionMenuContribution } from './remove-ui-extension-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { ContainerModule } from "inversify";

export default new ContainerModule(bind => {
    // add your contribution bindings here
    bind(CommandContribution).to(RemoveUiExtensionCommandContribution);
    bind(MenuContribution).to(RemoveUiExtensionMenuContribution);
});
