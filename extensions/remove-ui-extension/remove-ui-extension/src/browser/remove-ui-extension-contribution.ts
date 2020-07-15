import { injectable } from "inversify";
import {
  FrontendApplicationContribution,
  FrontendApplication,
} from "@theia/core/lib/browser";
import { MaybePromise } from "@theia/core/lib/common/types";
import { Widget } from "@theia/core/lib/browser/widgets";

@injectable()
export class ExampleFrontendContribution
  implements FrontendApplicationContribution {
  /**
   * Called after the application shell has been attached in case there is no previous workbench layout state.
   * Should return a promise if it runs asynchronously.
   */
  onDidInitializeLayout(app: FrontendApplication): MaybePromise<void> {
    // Remove unused widgets
    app.shell.widgets.forEach((widget: Widget) => {
      console.log("Widget:");
      console.log(widget);
      console.table(widget);
      console.log(JSON.stringify(widget));
      if (
        [
          "search-in-workspace",
          "explorer-view-container",
          "scm-view-container",
          "scm-view",
        ].includes(widget.id) ||
        widget.id.startsWith("debug")
      ) {
        widget.dispose();
      }
    });
  }
}
