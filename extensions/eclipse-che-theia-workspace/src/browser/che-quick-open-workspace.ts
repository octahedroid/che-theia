/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { inject, injectable } from 'inversify';
import {
    QuickOpenGroupItem,
    QuickOpenItem,
    QuickOpenMode,
    QuickOpenModel
} from '@theia/core/lib/common/quick-open-model';
import { LabelProvider, QuickOpenService } from '@theia/core/lib/browser';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { WorkspaceCommands } from '@theia/workspace/lib/browser/workspace-commands';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';
import { OauthUtils } from '@eclipse-che/theia-plugin-ext/lib/browser/oauth-utils';
import { ConfirmDialog } from '@theia/core/lib/browser/dialogs';
import { MessageService } from '@theia/core/lib/common/message-service';
import * as moment from 'moment';

@injectable()
export class QuickOpenCheWorkspace implements QuickOpenModel, CommandContribution {
    protected items: QuickOpenGroupItem[];
    protected currentWorkspace: cheApi.workspace.Workspace;

    @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService;
    @inject(CommandRegistry) protected readonly commandRegistry: CommandRegistry;
    @inject(CheApiService) protected readonly cheApi: CheApiService;
    @inject(OauthUtils) protected readonly oAuthUtils: OauthUtils;
    @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
    @inject(MessageService) protected readonly messageService: MessageService;

    registerCommands(commands: CommandRegistry): void {
        // VS Code command id
        commands.unregisterCommand('workbench.action.openRecent');

        // Theia command id
        commands.unregisterCommand('workspace:openRecent');

        commands.registerCommand(WorkspaceCommands.OPEN_RECENT_WORKSPACE, {
            execute: () => this.select()
        });
        commands.registerCommand({
            id: 'workspace:openRecent'
        }, {
            execute: () => this.select()
        });
    }

    protected async open(workspaces: cheApi.workspace.Workspace[]): Promise<void> {
        this.items = [];

        if (!workspaces.length) {
            this.items.push(new QuickOpenGroupItem({
                label: 'No Recent Workspaces',
                run: (mode: QuickOpenMode): boolean => false
            }));
            return;
        }

        for (const workspace of workspaces) {
            const icon = this.labelProvider.folderIcon;
            const iconClass = icon + ' file-icon';
            this.items.push(new QuickOpenGroupItem({
                label: this.getWorkspaceName(workspace) + (this.isCurrentWorkspace(workspace) ? ' (Current)' : ''),
                description: this.getWorkspaceStack(workspace),
                groupLabel: `last modified ${moment(this.getWorkspaceModificationTime(workspace)).fromNow()}`,
                iconClass,
                run: (mode: QuickOpenMode): boolean => {
                    if (mode !== QuickOpenMode.OPEN) {
                        return false;
                    }

                    if (this.isCurrentWorkspace(workspace)) {
                        return true;
                    }

                    this.openWorkspace(workspace);

                    return true;
                },
            }));
        }

        this.quickOpenService.open(this, {
            placeholder: 'Type the name of the Che workspace you want to open',
            fuzzyMatchLabel: true,
            fuzzySort: false
        });
    }

    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    async select(): Promise<void> {
        this.items = [];

        const token = await this.oAuthUtils.getUserToken();

        if (!this.currentWorkspace) {
            this.currentWorkspace = await this.cheApi.currentWorkspace();
        }

        if (!this.currentWorkspace.namespace) {
            return;
        }

        const workspaces = await this.cheApi.getAllByNamespace(this.currentWorkspace.namespace, token);

        workspaces.sort((a: cheApi.workspace.Workspace, b: cheApi.workspace.Workspace) => {
            const updatedA: number = this.getWorkspaceModificationTime(a);
            const updatedB: number = this.getWorkspaceModificationTime(b);

            if (isNaN(updatedA) || isNaN(updatedB)) {
                return 0;
            } else {
                return updatedB - updatedA;
            }
        });

        await this.open(workspaces);
    }

    private getWorkspaceName(workspace: cheApi.workspace.Workspace): string | undefined {
        if (workspace.config) {
            return workspace.config.name;
        } else if (workspace.devfile && workspace.devfile.metadata) {
            return workspace.devfile.metadata.name;
        }
    }

    private getWorkspaceStack(workspace: cheApi.workspace.Workspace): string | undefined {
        if (workspace.attributes && workspace.attributes.stackName) {
            return `Stack: ${workspace.attributes.stackName}`;
        } else {
            return 'Stack: Custom';
        }
    }

    private getWorkspaceModificationTime(workspace: cheApi.workspace.Workspace): number {
        if (workspace.attributes) {
            if (workspace.attributes.updated) {
                return parseInt(workspace.attributes.updated);
            } else if (workspace.attributes.created) {
                return parseInt(workspace.attributes.created);
            }
        }

        return NaN;
    }

    private stopCurrentWorkspace(): Promise<boolean | undefined> {
        return new ConfirmDialog({
            title: 'Open Workspace',
            msg: 'Do you want to stop current workspace?'
        }).open();
    }

    private async openWorkspace(workspace: cheApi.workspace.Workspace): Promise<void> {
        // const currentWorkspaceUri = await this.getCurrentWorkspaceUri();
        // if (currentWorkspaceUri === undefined) {
        //     await this.messageService.warn('Failed to get current workspace URL.');
        //     return;
        // }

        if (await this.stopCurrentWorkspace()) {
            await this.cheApi.stop();
        }

        window.parent.postMessage(`open-workspace:${workspace.id}`, '*');

        // window.location.href = currentWorkspaceUri.replace(/^https?:\/\/[^\/]+/, match => `${match}/dashboard/${this.getWorkspaceUri(workspace)}`);
    }

    // private async getCurrentWorkspaceUri(): Promise<string | undefined> {
    //     const workspace = await this.cheApi.currentWorkspace();
    //
    //     if (workspace && workspace.links && workspace.links.ide) {
    //         return workspace.links.ide;
    //     } else {
    //         return undefined;
    //     }
    // }

    // private getWorkspaceUri(workspace: cheApi.workspace.Workspace): string {
    //     return '#/ide/' + (workspace ? (workspace.namespace + '/' + this.getWorkspaceName(workspace)) : 'unknown');
    // }

    private isCurrentWorkspace(workspace: cheApi.workspace.Workspace): boolean {
        return this.currentWorkspace.id === workspace.id;
    }
}
