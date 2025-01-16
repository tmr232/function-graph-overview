import type { Language } from "../control-flow/cfg.ts";

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

export type MessageToWebview = UpdateCode;
export type MessageToVscode = NavigateTo;

export type Message = MessageToVscode | MessageToWebview;

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

export class MessageHandler<Msg extends Message> {
  constructor(private messageHandlers: MessageHandlersOf<Msg>) {}

  public handleMessage<T extends MessageTagOf<Msg>>(
    message: MessageMapOf<Msg>[T],
  ) {
    const handler = this.messageHandlers[message.tag];
    handler(message);
  }
}
