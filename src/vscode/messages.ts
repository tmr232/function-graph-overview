/**
 * Defines the message types VSCode uses to communicate with the WebView.
 */
import type { Language } from "../control-flow/cfg.ts";
import type { ColorList } from "../control-flow/colors.ts";

export type NavigateTo = {
  tag: "navigateTo";
  offset: number;
};

export type UpdateCode = {
  tag: "updateCode";
  offset: number;
  language: Language;
  code: string;
};

export type UpdateSettings = {
  tag: "updateSettings";
  flatSwitch: boolean;
  simplify: boolean;
  highlightCurrentNode: boolean;
  colorList: ColorList;
};

export type MessageToWebview = UpdateCode | UpdateSettings;
export type MessageToVscode = NavigateTo;

type Message = MessageToVscode | MessageToWebview;

// Create a type that extracts the tag literal type from the Message union
type MessageTagOf<Msg extends Message> = Msg["tag"];
// Create a type that maps a tag to its corresponding message type
type MessageMapOf<Msg extends Message> = {
  [T in MessageTagOf<Msg>]: Extract<Msg, { tag: T }>;
};
// Finally, create the type for the message handlers object
export type MessageHandlersOf<Msg extends Message> = {
  [T in MessageTagOf<Msg>]: (message: MessageMapOf<Msg>[T]) => void;
};

/**
 * Handles messages in a type-safe manner.
 */
export class MessageHandler<Msg extends Message> {
  constructor(private messageHandlers: MessageHandlersOf<Msg>) {}

  public handleMessage<T extends MessageTagOf<Msg>>(
    message: MessageMapOf<Msg>[T],
  ) {
    const handler = this.messageHandlers[message.tag];
    handler(message);
  }
}
