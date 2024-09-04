// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License.
//  *  See https://github.com/microsoft/vscode/blob/main/LICENSE.txt for license information.
//  *--------------------------------------------------------------------------------------------*/

// declare module "vscode" {
//   export const version: string;
//   export interface Command {
//     title: string;
//     command: string;
//     tooltip?: string;
//     arguments?: any[];
//   }
//   export interface TextLine {
//     readonly lineNumber: number;
//     readonly text: string;
//     readonly range: Range;
//     readonly rangeIncludingLineBreak: Range;
//     readonly firstNonWhitespaceCharacterIndex: number;
//     readonly isEmptyOrWhitespace: boolean;
//   }
//   export interface TextDocument {
//     readonly uri: Uri;
//     readonly fileName: string;
//     readonly isUntitled: boolean;
//     readonly languageId: string;
//     readonly version: number;
//     readonly isDirty: boolean;
//     readonly isClosed: boolean;
//     save(): Thenable<boolean>;
//     readonly eol: EndOfLine;
//     readonly lineCount: number;
//     lineAt(line: number): TextLine;
//     lineAt(position: Position): TextLine;
//     offsetAt(position: Position): number;
//     positionAt(offset: number): Position;
//     getText(range?: Range): string;
//     getWordRangeAtPosition(
//       position: Position,
//       regex?: RegExp
//     ): Range | undefined;
//     validateRange(range: Range): Range;
//     validatePosition(position: Position): Position;
//   }
//   export class Position {
//     readonly line: number;
//     readonly character: number;
//     constructor(line: number, character: number);
//     isBefore(other: Position): boolean;
//     isBeforeOrEqual(other: Position): boolean;
//     isAfter(other: Position): boolean;
//     isAfterOrEqual(other: Position): boolean;
//     isEqual(other: Position): boolean;
//     compareTo(other: Position): number;
//     translate(lineDelta?: number, characterDelta?: number): Position;
//     translate(change: {
//       lineDelta?: number;
//       characterDelta?: number;
//     }): Position;
//     with(line?: number, character?: number): Position;
//     with(change: { line?: number; character?: number }): Position;
//   }
//   export class Range {
//     readonly start: Position;
//     readonly end: Position;
//     constructor(start: Position, end: Position);
//     constructor(
//       startLine: number,
//       startCharacter: number,
//       endLine: number,
//       endCharacter: number
//     );
//     isEmpty: boolean;
//     isSingleLine: boolean;
//     contains(positionOrRange: Position | Range): boolean;
//     isEqual(other: Range): boolean;
//     intersection(range: Range): Range | undefined;
//     union(other: Range): Range;
//     with(start?: Position, end?: Position): Range;
//     with(change: { start?: Position; end?: Position }): Range;
//   }
//   export class Selection extends Range {
//     anchor: Position;
//     active: Position;
//     constructor(anchor: Position, active: Position);
//     constructor(
//       anchorLine: number,
//       anchorCharacter: number,
//       activeLine: number,
//       activeCharacter: number
//     );
//     isReversed: boolean;
//   }
//   export enum TextEditorSelectionChangeKind {
//     Keyboard = 1,
//     Mouse = 2,
//     Command = 3,
//   }
//   export interface TextEditorSelectionChangeEvent {
//     readonly textEditor: TextEditor;
//     readonly selections: readonly Selection[];
//     readonly kind: TextEditorSelectionChangeKind | undefined;
//   }
//   export interface TextEditorVisibleRangesChangeEvent {
//     readonly textEditor: TextEditor;
//     readonly visibleRanges: readonly Range[];
//   }
//   export interface TextEditorOptionsChangeEvent {
//     readonly textEditor: TextEditor;
//     readonly options: TextEditorOptions;
//   }
//   export interface TextEditorViewColumnChangeEvent {
//     readonly textEditor: TextEditor;
//     readonly viewColumn: ViewColumn;
//   }
//   export enum TextEditorCursorStyle {
//     Line = 1,
//     Block = 2,
//     Underline = 3,
//     LineThin = 4,
//     BlockOutline = 5,
//     UnderlineThin = 6,
//   }
//   export enum TextEditorLineNumbersStyle {
//     Off = 0,
//     On = 1,
//     Relative = 2,
//   }
//   export interface TextEditorOptions {
//     tabSize?: number | string;
//     indentSize?: number | string;
//     insertSpaces?: boolean | string;
//     cursorStyle?: TextEditorCursorStyle;
//     lineNumbers?: TextEditorLineNumbersStyle;
//   }
//   export interface TextEditorDecorationType {
//     readonly key: string;
//     dispose(): void;
//   }
//   export enum TextEditorRevealType {
//     Default = 0,
//     InCenter = 1,
//     InCenterIfOutsideViewport = 2,
//     AtTop = 3,
//   }
//   export enum OverviewRulerLane {
//     Left = 1,
//     Center = 2,
//     Right = 4,
//     Full = 7,
//   }
//   export enum DecorationRangeBehavior {
//     OpenOpen = 0,
//     ClosedClosed = 1,
//     OpenClosed = 2,
//     ClosedOpen = 3,
//   }
//   export interface TextDocumentShowOptions {
//     viewColumn?: ViewColumn;
//     preserveFocus?: boolean;
//     preview?: boolean;
//     selection?: Range;
//   }
//   export interface NotebookEditorSelectionChangeEvent {
//     readonly notebookEditor: NotebookEditor;
//     readonly selections: readonly NotebookRange[];
//   }
//   export interface NotebookEditorVisibleRangesChangeEvent {
//     readonly notebookEditor: NotebookEditor;
//     readonly visibleRanges: readonly NotebookRange[];
//   }
//   export interface NotebookDocumentShowOptions {
//     readonly viewColumn?: ViewColumn;
//     readonly preserveFocus?: boolean;
//     readonly preview?: boolean;
//     readonly selections?: readonly NotebookRange[];
//   }
//   export class ThemeColor {
//     constructor(id: string);
//   }
//   export class ThemeIcon {
//     static readonly File: ThemeIcon;
//     static readonly Folder: ThemeIcon;
//     readonly id: string;
//     readonly color?: ThemeColor | undefined;
//     constructor(id: string, color?: ThemeColor);
//   }
//   export interface ThemableDecorationRenderOptions {
//     backgroundColor?: string | ThemeColor;
//     outline?: string;
//     outlineColor?: string | ThemeColor;
//     outlineStyle?: string;
//     outlineWidth?: string;
//     border?: string;
//     borderColor?: string | ThemeColor;
//     borderRadius?: string;
//     borderSpacing?: string;
//     borderStyle?: string;
//     borderWidth?: string;
//     fontStyle?: string;
//     fontWeight?: string;
//     textDecoration?: string;
//     cursor?: string;
//     color?: string | ThemeColor;
//     opacity?: string;
//     letterSpacing?: string;
//     gutterIconPath?: string | Uri;
//     gutterIconSize?: string;
//     overviewRulerColor?: string | ThemeColor;
//     before?: ThemableDecorationAttachmentRenderOptions;
//     after?: ThemableDecorationAttachmentRenderOptions;
//   }
//   export interface ThemableDecorationAttachmentRenderOptions {
//     contentText?: string;
//     contentIconPath?: string | Uri;
//     border?: string;
//     borderColor?: string | ThemeColor;
//     fontStyle?: string;
//     fontWeight?: string;
//     textDecoration?: string;
//     color?: string | ThemeColor;
//     backgroundColor?: string | ThemeColor;
//     margin?: string;
//     width?: string;
//     height?: string;
//   }
//   export interface DecorationRenderOptions
//     extends ThemableDecorationRenderOptions {
//     isWholeLine?: boolean;
//     rangeBehavior?: DecorationRangeBehavior;
//     overviewRulerLane?: OverviewRulerLane;
//     light?: ThemableDecorationRenderOptions;
//     dark?: ThemableDecorationRenderOptions;
//   }
//   export interface DecorationOptions {
//     range: Range;
//     hoverMessage?:
//       | MarkdownString
//       | MarkedString
//       | Array<MarkdownString | MarkedString>;
//     renderOptions?: DecorationInstanceRenderOptions;
//   }
//   export interface ThemableDecorationInstanceRenderOptions {
//     before?: ThemableDecorationAttachmentRenderOptions;
//     after?: ThemableDecorationAttachmentRenderOptions;
//   }
//   export interface DecorationInstanceRenderOptions
//     extends ThemableDecorationInstanceRenderOptions {
//     light?: ThemableDecorationInstanceRenderOptions;
//     dark?: ThemableDecorationInstanceRenderOptions;
//   }
//   export interface TextEditor {
//     readonly document: TextDocument;
//     selection: Selection;
//     selections: readonly Selection[];
//     readonly visibleRanges: readonly Range[];
//     options: TextEditorOptions;
//     readonly viewColumn: ViewColumn | undefined;
//     edit(
//       callback: (editBuilder: TextEditorEdit) => void,
//       options?: {
//         readonly undoStopBefore: boolean;
//         readonly undoStopAfter: boolean;
//       }
//     ): Thenable<boolean>;
//     insertSnippet(
//       snippet: SnippetString,
//       location?: Position | Range | readonly Position[] | readonly Range[],
//       options?: {
//         readonly undoStopBefore: boolean;
//         readonly undoStopAfter: boolean;
//       }
//     ): Thenable<boolean>;
//     setDecorations(
//       decorationType: TextEditorDecorationType,
//       rangesOrOptions: readonly Range[] | readonly DecorationOptions[]
//     ): void;
//     revealRange(range: Range, revealType?: TextEditorRevealType): void;
//     show(column?: ViewColumn): void;
//     hide(): void;
//   }
//   export enum EndOfLine {
//     LF = 1,
//     CRLF = 2,
//   }
//   export interface TextEditorEdit {
//     replace(location: Position | Range | Selection, value: string): void;
//     insert(location: Position, value: string): void;
//     delete(location: Range | Selection): void;
//     setEndOfLine(endOfLine: EndOfLine): void;
//   }
//   export class Uri {
//     static parse(value: string, strict?: boolean): Uri;
//     static file(path: string): Uri;
//     static joinPath(base: Uri, ...pathSegments: string[]): Uri;
//     static from(components: {
//       readonly scheme: string;
//       readonly authority?: string;
//       readonly path?: string;
//       readonly query?: string;
//       readonly fragment?: string;
//     }): Uri;
//     private constructor(
//       scheme: string,
//       authority: string,
//       path: string,
//       query: string,
//       fragment: string
//     );
//     readonly scheme: string;
//     readonly authority: string;
//     readonly path: string;
//     readonly query: string;
//     readonly fragment: string;
//     readonly fsPath: string;
//     with(change: {
//       scheme?: string;
//       authority?: string;
//       path?: string;
//       query?: string;
//       fragment?: string;
//     }): Uri;
//     toString(skipEncoding?: boolean): string;
//     toJSON(): any;
//   }
//   export interface CancellationToken {
//     isCancellationRequested: boolean;
//     onCancellationRequested: Event<any>;
//   }
//   export class CancellationTokenSource {
//     token: CancellationToken;
//     cancel(): void;
//     dispose(): void;
//   }
//   export class CancellationError extends Error {
//     constructor();
//   }
//   export class Disposable {
//     static from(
//       ...disposableLikes: {
//         dispose: () => any;
//       }[]
//     ): Disposable;
//     constructor(callOnDispose: () => any);
//     dispose(): any;
//   }
//   export interface Event<T> {
//     (
//       listener: (e: T) => any,
//       thisArgs?: any,
//       disposables?: Disposable[]
//     ): Disposable;
//   }
//   export class EventEmitter<T> {
//     event: Event<T>;
//     fire(data: T): void;
//     dispose(): void;
//   }
//   export interface FileSystemWatcher extends Disposable {
//     readonly ignoreCreateEvents: boolean;
//     readonly ignoreChangeEvents: boolean;
//     readonly ignoreDeleteEvents: boolean;
//     readonly onDidCreate: Event<Uri>;
//     readonly onDidChange: Event<Uri>;
//     readonly onDidDelete: Event<Uri>;
//   }
//   export interface TextDocumentContentProvider {
//     onDidChange?: Event<Uri>;
//     provideTextDocumentContent(
//       uri: Uri,
//       token: CancellationToken
//     ): ProviderResult<string>;
//   }
//   export enum QuickPickItemKind {
//     Separator = -1,
//     Default = 0,
//   }
//   export interface QuickPickItem {
//     label: string;
//     kind?: QuickPickItemKind;
//     iconPath?:
//       | Uri
//       | {
//           light: Uri;
//           dark: Uri;
//         }
//       | ThemeIcon;
//     description?: string;
//     detail?: string;
//     picked?: boolean;
//     alwaysShow?: boolean;
//     buttons?: readonly QuickInputButton[];
//   }
//   export interface QuickPickOptions {
//     title?: string;
//     matchOnDescription?: boolean;
//     matchOnDetail?: boolean;
//     placeHolder?: string;
//     ignoreFocusOut?: boolean;
//     canPickMany?: boolean;
//     onDidSelectItem?(item: QuickPickItem | string): any;
//   }
//   export interface WorkspaceFolderPickOptions {
//     placeHolder?: string;
//     ignoreFocusOut?: boolean;
//   }
//   export interface OpenDialogOptions {
//     defaultUri?: Uri;
//     openLabel?: string;
//     canSelectFiles?: boolean;
//     canSelectFolders?: boolean;
//     canSelectMany?: boolean;
//     filters?: { [name: string]: string[] };
//     title?: string;
//   }
//   export interface SaveDialogOptions {
//     defaultUri?: Uri;
//     saveLabel?: string;
//     filters?: { [name: string]: string[] };
//     title?: string;
//   }
//   export interface MessageItem {
//     title: string;
//     isCloseAffordance?: boolean;
//   }
//   export interface MessageOptions {
//     modal?: boolean;
//     detail?: string;
//   }
//   export enum InputBoxValidationSeverity {
//     Info = 1,
//     Warning = 2,
//     Error = 3,
//   }
//   export interface InputBoxValidationMessage {
//     readonly message: string;
//     readonly severity: InputBoxValidationSeverity;
//   }
//   export interface InputBoxOptions {
//     title?: string;
//     value?: string;
//     valueSelection?: [number, number];
//     prompt?: string;
//     placeHolder?: string;
//     password?: boolean;
//     ignoreFocusOut?: boolean;
//     validateInput?(
//       value: string
//     ):
//       | string
//       | InputBoxValidationMessage
//       | undefined
//       | null
//       | Thenable<string | InputBoxValidationMessage | undefined | null>;
//   }
//   export class RelativePattern {
//     baseUri: Uri;
//     base: string;
//     pattern: string;
//     constructor(base: WorkspaceFolder | Uri | string, pattern: string);
//   }
//   export type GlobPattern = string | RelativePattern;
//   export interface DocumentFilter {
//     readonly language?: string;
//     readonly notebookType?: string;
//     readonly scheme?: string;
//     readonly pattern?: GlobPattern;
//   }
//   export type DocumentSelector =
//     | DocumentFilter
//     | string
//     | ReadonlyArray<DocumentFilter | string>;
//   export type ProviderResult<T> =
//     | T
//     | undefined
//     | null
//     | Thenable<T | undefined | null>;
//   export class CodeActionKind {
//     static readonly Empty: CodeActionKind;
//     static readonly QuickFix: CodeActionKind;
//     static readonly Refactor: CodeActionKind;
//     static readonly RefactorExtract: CodeActionKind;
//     static readonly RefactorInline: CodeActionKind;
//     static readonly RefactorMove: CodeActionKind;
//     static readonly RefactorRewrite: CodeActionKind;
//     static readonly Source: CodeActionKind;
//     static readonly SourceOrganizeImports: CodeActionKind;
//     static readonly SourceFixAll: CodeActionKind;
//     static readonly Notebook: CodeActionKind;
//     private constructor(value: string);
//     readonly value: string;
//     append(parts: string): CodeActionKind;
//     intersects(other: CodeActionKind): boolean;
//     contains(other: CodeActionKind): boolean;
//   }
//   export enum CodeActionTriggerKind {
//     Invoke = 1,
//     Automatic = 2,
//   }
//   export interface CodeActionContext {
//     readonly triggerKind: CodeActionTriggerKind;
//     readonly diagnostics: readonly Diagnostic[];
//     readonly only: CodeActionKind | undefined;
//   }
//   export class CodeAction {
//     title: string;
//     edit?: WorkspaceEdit;
//     diagnostics?: Diagnostic[];
//     command?: Command;
//     kind?: CodeActionKind;
//     isPreferred?: boolean;
//     disabled?: {
//       readonly reason: string;
//     };
//     constructor(title: string, kind?: CodeActionKind);
//   }
//   export interface CodeActionProvider<T extends CodeAction = CodeAction> {
//     provideCodeActions(
//       document: TextDocument,
//       range: Range | Selection,
//       context: CodeActionContext,
//       token: CancellationToken
//     ): ProviderResult<(Command | T)[]>;
//     resolveCodeAction?(
//       codeAction: T,
//       token: CancellationToken
//     ): ProviderResult<T>;
//   }
//   export interface CodeActionProviderMetadata {
//     readonly providedCodeActionKinds?: readonly CodeActionKind[];
//     readonly documentation?: ReadonlyArray<{
//       readonly kind: CodeActionKind;
//       readonly command: Command;
//     }>;
//   }
//   export class CodeLens {
//     range: Range;
//     command?: Command;
//     readonly isResolved: boolean;
//     constructor(range: Range, command?: Command);
//   }
//   export interface CodeLensProvider<T extends CodeLens = CodeLens> {
//     onDidChangeCodeLenses?: Event<void>;
//     provideCodeLenses(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<T[]>;
//     resolveCodeLens?(codeLens: T, token: CancellationToken): ProviderResult<T>;
//   }
//   export type DefinitionLink = LocationLink;
//   export type Definition = Location | Location[];
//   export interface DefinitionProvider {
//     provideDefinition(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<Definition | DefinitionLink[]>;
//   }
//   export interface ImplementationProvider {
//     provideImplementation(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<Definition | DefinitionLink[]>;
//   }
//   export interface TypeDefinitionProvider {
//     provideTypeDefinition(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<Definition | DefinitionLink[]>;
//   }
//   export type Declaration = Location | Location[] | LocationLink[];
//   export interface DeclarationProvider {
//     provideDeclaration(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<Declaration>;
//   }
//   export class MarkdownString {
//     value: string;
//     isTrusted?:
//       | boolean
//       | {
//           readonly enabledCommands: readonly string[];
//         };
//     supportThemeIcons?: boolean;
//     supportHtml?: boolean;
//     baseUri?: Uri;
//     constructor(value?: string, supportThemeIcons?: boolean);
//     appendText(value: string): MarkdownString;
//     appendMarkdown(value: string): MarkdownString;
//     appendCodeblock(value: string, language?: string): MarkdownString;
//   }
//   export type MarkedString =
//     | string
//     | {
//         language: string;
//         value: string;
//       };
//   export class Hover {
//     contents: Array<MarkdownString | MarkedString>;
//     range?: Range;
//     constructor(
//       contents:
//         | MarkdownString
//         | MarkedString
//         | Array<MarkdownString | MarkedString>,
//       range?: Range
//     );
//   }
//   export interface HoverProvider {
//     provideHover(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<Hover>;
//   }
//   export class EvaluatableExpression {
//     /*
//      * The range is used to extract the evaluatable expression from the underlying document and to highlight it.
//      */
//     readonly range: Range;

//     /*
//      * If specified the expression overrides the extracted expression.
//      */
//     readonly expression?: string | undefined;
//     constructor(range: Range, expression?: string);
//   }
//   export interface EvaluatableExpressionProvider {
//     provideEvaluatableExpression(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<EvaluatableExpression>;
//   }
//   export class InlineValueText {
//     readonly range: Range;
//     readonly text: string;
//     constructor(range: Range, text: string);
//   }
//   export class InlineValueVariableLookup {
//     readonly range: Range;
//     readonly variableName?: string | undefined;
//     readonly caseSensitiveLookup: boolean;
//     constructor(
//       range: Range,
//       variableName?: string,
//       caseSensitiveLookup?: boolean
//     );
//   }
//   export class InlineValueEvaluatableExpression {
//     readonly range: Range;
//     readonly expression?: string | undefined;
//     constructor(range: Range, expression?: string);
//   }
//   export type InlineValue =
//     | InlineValueText
//     | InlineValueVariableLookup
//     | InlineValueEvaluatableExpression;
//   export interface InlineValueContext {
//     readonly frameId: number;
//     readonly stoppedLocation: Range;
//   }
//   export interface InlineValuesProvider {
//     onDidChangeInlineValues?: Event<void> | undefined;
//     provideInlineValues(
//       document: TextDocument,
//       viewPort: Range,
//       context: InlineValueContext,
//       token: CancellationToken
//     ): ProviderResult<InlineValue[]>;
//   }
//   export enum DocumentHighlightKind {
//     Text = 0,
//     Read = 1,
//     Write = 2,
//   }
//   export class DocumentHighlight {
//     range: Range;
//     kind?: DocumentHighlightKind;
//     constructor(range: Range, kind?: DocumentHighlightKind);
//   }
//   export interface DocumentHighlightProvider {
//     provideDocumentHighlights(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<DocumentHighlight[]>;
//   }
//   export enum SymbolKind {
//     File = 0,
//     Module = 1,
//     Namespace = 2,
//     Package = 3,
//     Class = 4,
//     Method = 5,
//     Property = 6,
//     Field = 7,
//     Constructor = 8,
//     Enum = 9,
//     Interface = 10,
//     Function = 11,
//     Variable = 12,
//     Constant = 13,
//     String = 14,
//     Number = 15,
//     Boolean = 16,
//     Array = 17,
//     Object = 18,
//     Key = 19,
//     Null = 20,
//     EnumMember = 21,
//     Struct = 22,
//     Event = 23,
//     Operator = 24,
//     TypeParameter = 25,
//   }
//   export enum SymbolTag {
//     Deprecated = 1,
//   }
//   export class SymbolInformation {
//     name: string;
//     containerName: string;
//     kind: SymbolKind;
//     tags?: readonly SymbolTag[];
//     location: Location;
//     constructor(
//       name: string,
//       kind: SymbolKind,
//       containerName: string,
//       location: Location
//     );
//     constructor(
//       name: string,
//       kind: SymbolKind,
//       range: Range,
//       uri?: Uri,
//       containerName?: string
//     );
//   }
//   export class DocumentSymbol {
//     name: string;
//     detail: string;
//     kind: SymbolKind;
//     tags?: readonly SymbolTag[];
//     range: Range;
//     selectionRange: Range;
//     children: DocumentSymbol[];
//     constructor(
//       name: string,
//       detail: string,
//       kind: SymbolKind,
//       range: Range,
//       selectionRange: Range
//     );
//   }
//   export interface DocumentSymbolProvider {
//     provideDocumentSymbols(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<SymbolInformation[] | DocumentSymbol[]>;
//   }
//   export interface DocumentSymbolProviderMetadata {
//     label?: string;
//   }
//   export interface WorkspaceSymbolProvider<
//     T extends SymbolInformation = SymbolInformation
//   > {
//     provideWorkspaceSymbols(
//       query: string,
//       token: CancellationToken
//     ): ProviderResult<T[]>;
//     resolveWorkspaceSymbol?(
//       symbol: T,
//       token: CancellationToken
//     ): ProviderResult<T>;
//   }
//   export interface ReferenceContext {
//     readonly includeDeclaration: boolean;
//   }
//   export interface ReferenceProvider {
//     provideReferences(
//       document: TextDocument,
//       position: Position,
//       context: ReferenceContext,
//       token: CancellationToken
//     ): ProviderResult<Location[]>;
//   }
//   export class TextEdit {
//     static replace(range: Range, newText: string): TextEdit;
//     static insert(position: Position, newText: string): TextEdit;
//     static delete(range: Range): TextEdit;
//     static setEndOfLine(eol: EndOfLine): TextEdit;
//     range: Range;
//     newText: string;
//     newEol?: EndOfLine;
//     constructor(range: Range, newText: string);
//   }
//   export class SnippetTextEdit {
//     static replace(range: Range, snippet: SnippetString): SnippetTextEdit;
//     static insert(position: Position, snippet: SnippetString): SnippetTextEdit;
//     range: Range;
//     snippet: SnippetString;
//     constructor(range: Range, snippet: SnippetString);
//   }
//   export class NotebookEdit {
//     static replaceCells(
//       range: NotebookRange,
//       newCells: NotebookCellData[]
//     ): NotebookEdit;
//     static insertCells(
//       index: number,
//       newCells: NotebookCellData[]
//     ): NotebookEdit;
//     static deleteCells(range: NotebookRange): NotebookEdit;
//     static updateCellMetadata(
//       index: number,
//       newCellMetadata: { [key: string]: any }
//     ): NotebookEdit;
//     static updateNotebookMetadata(newNotebookMetadata: {
//       [key: string]: any;
//     }): NotebookEdit;
//     range: NotebookRange;
//     newCells: NotebookCellData[];
//     newCellMetadata?: { [key: string]: any };
//     newNotebookMetadata?: { [key: string]: any };
//     constructor(range: NotebookRange, newCells: NotebookCellData[]);
//   }
//   export interface WorkspaceEditEntryMetadata {
//     needsConfirmation: boolean;
//     label: string;
//     description?: string;
//     iconPath?:
//       | Uri
//       | {
//           light: Uri;
//           dark: Uri;
//         }
//       | ThemeIcon;
//   }
//   export interface WorkspaceEditMetadata {
//     isRefactoring?: boolean;
//   }
//   export class WorkspaceEdit {
//     readonly size: number;
//     replace(
//       uri: Uri,
//       range: Range,
//       newText: string,
//       metadata?: WorkspaceEditEntryMetadata
//     ): void;
//     insert(
//       uri: Uri,
//       position: Position,
//       newText: string,
//       metadata?: WorkspaceEditEntryMetadata
//     ): void;
//     delete(uri: Uri, range: Range, metadata?: WorkspaceEditEntryMetadata): void;
//     has(uri: Uri): boolean;
//     set(uri: Uri, edits: ReadonlyArray<TextEdit | SnippetTextEdit>): void;
//     set(
//       uri: Uri,
//       edits: ReadonlyArray<
//         [TextEdit | SnippetTextEdit, WorkspaceEditEntryMetadata | undefined]
//       >
//     ): void;
//     set(uri: Uri, edits: readonly NotebookEdit[]): void;
//     set(
//       uri: Uri,
//       edits: ReadonlyArray<
//         [NotebookEdit, WorkspaceEditEntryMetadata | undefined]
//       >
//     ): void;
//     get(uri: Uri): TextEdit[];
//     createFile(
//       uri: Uri,
//       options?: {
//         readonly overwrite?: boolean;
//         readonly ignoreIfExists?: boolean;
//         readonly contents?: Uint8Array | DataTransferFile;
//       },
//       metadata?: WorkspaceEditEntryMetadata
//     ): void;
//     deleteFile(
//       uri: Uri,
//       options?: {
//         readonly recursive?: boolean;
//         readonly ignoreIfNotExists?: boolean;
//       },
//       metadata?: WorkspaceEditEntryMetadata
//     ): void;
//     renameFile(
//       oldUri: Uri,
//       newUri: Uri,
//       options?: {
//         readonly overwrite?: boolean;
//         readonly ignoreIfExists?: boolean;
//       },
//       metadata?: WorkspaceEditEntryMetadata
//     ): void;
//     entries(): [Uri, TextEdit[]][];
//   }
//   export class SnippetString {
//     value: string;
//     constructor(value?: string);
//     appendText(string: string): SnippetString;
//     appendTabstop(number?: number): SnippetString;
//     appendPlaceholder(
//       value: string | ((snippet: SnippetString) => any),
//       number?: number
//     ): SnippetString;
//     appendChoice(values: readonly string[], number?: number): SnippetString;
//     appendVariable(
//       name: string,
//       defaultValue: string | ((snippet: SnippetString) => any)
//     ): SnippetString;
//   }
//   export interface RenameProvider {
//     provideRenameEdits(
//       document: TextDocument,
//       position: Position,
//       newName: string,
//       token: CancellationToken
//     ): ProviderResult<WorkspaceEdit>;
//     prepareRename?(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<
//       | Range
//       | {
//           range: Range;
//           placeholder: string;
//         }
//     >;
//   }
//   export class SemanticTokensLegend {
//     readonly tokenTypes: string[];
//     readonly tokenModifiers: string[];
//     constructor(tokenTypes: string[], tokenModifiers?: string[]);
//   }
//   export class SemanticTokensBuilder {
//     constructor(legend?: SemanticTokensLegend);
//     push(
//       line: number,
//       char: number,
//       length: number,
//       tokenType: number,
//       tokenModifiers?: number
//     ): void;
//     push(
//       range: Range,
//       tokenType: string,
//       tokenModifiers?: readonly string[]
//     ): void;
//     build(resultId?: string): SemanticTokens;
//   }
//   export class SemanticTokens {
//     readonly resultId: string | undefined;
//     readonly data: Uint32Array;
//     constructor(data: Uint32Array, resultId?: string);
//   }
//   export class SemanticTokensEdits {
//     readonly resultId: string | undefined;
//     readonly edits: SemanticTokensEdit[];
//     constructor(edits: SemanticTokensEdit[], resultId?: string);
//   }
//   export class SemanticTokensEdit {
//     readonly start: number;
//     readonly deleteCount: number;
//     readonly data: Uint32Array | undefined;
//     constructor(start: number, deleteCount: number, data?: Uint32Array);
//   }
//   export interface DocumentSemanticTokensProvider {
//     onDidChangeSemanticTokens?: Event<void>;
//     provideDocumentSemanticTokens(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<SemanticTokens>;
//     provideDocumentSemanticTokensEdits?(
//       document: TextDocument,
//       previousResultId: string,
//       token: CancellationToken
//     ): ProviderResult<SemanticTokens | SemanticTokensEdits>;
//   }
//   export interface DocumentRangeSemanticTokensProvider {
//     provideDocumentRangeSemanticTokens(
//       document: TextDocument,
//       range: Range,
//       token: CancellationToken
//     ): ProviderResult<SemanticTokens>;
//   }
//   export interface FormattingOptions {
//     tabSize: number;
//     insertSpaces: boolean;
//     [key: string]: boolean | number | string;
//   }
//   export interface DocumentFormattingEditProvider {
//     provideDocumentFormattingEdits(
//       document: TextDocument,
//       options: FormattingOptions,
//       token: CancellationToken
//     ): ProviderResult<TextEdit[]>;
//   }
//   export interface DocumentRangeFormattingEditProvider {
//     provideDocumentRangeFormattingEdits(
//       document: TextDocument,
//       range: Range,
//       options: FormattingOptions,
//       token: CancellationToken
//     ): ProviderResult<TextEdit[]>;
//     provideDocumentRangesFormattingEdits?(
//       document: TextDocument,
//       ranges: Range[],
//       options: FormattingOptions,
//       token: CancellationToken
//     ): ProviderResult<TextEdit[]>;
//   }
//   export interface OnTypeFormattingEditProvider {
//     provideOnTypeFormattingEdits(
//       document: TextDocument,
//       position: Position,
//       ch: string,
//       options: FormattingOptions,
//       token: CancellationToken
//     ): ProviderResult<TextEdit[]>;
//   }
//   export class ParameterInformation {
//     label: string | [number, number];
//     documentation?: string | MarkdownString;
//     constructor(
//       label: string | [number, number],
//       documentation?: string | MarkdownString
//     );
//   }
//   export class SignatureInformation {
//     label: string;
//     documentation?: string | MarkdownString;
//     parameters: ParameterInformation[];
//     activeParameter?: number;
//     constructor(label: string, documentation?: string | MarkdownString);
//   }
//   export class SignatureHelp {
//     signatures: SignatureInformation[];
//     activeSignature: number;
//     activeParameter: number;
//   }
//   export enum SignatureHelpTriggerKind {
//     Invoke = 1,
//     TriggerCharacter = 2,
//     ContentChange = 3,
//   }
//   export interface SignatureHelpContext {
//     readonly triggerKind: SignatureHelpTriggerKind;
//     readonly triggerCharacter: string | undefined;
//     readonly isRetrigger: boolean;
//     readonly activeSignatureHelp: SignatureHelp | undefined;
//   }
//   export interface SignatureHelpProvider {
//     provideSignatureHelp(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken,
//       context: SignatureHelpContext
//     ): ProviderResult<SignatureHelp>;
//   }
//   export interface SignatureHelpProviderMetadata {
//     readonly triggerCharacters: readonly string[];
//     readonly retriggerCharacters: readonly string[];
//   }
//   export interface CompletionItemLabel {
//     label: string;
//     detail?: string;
//     description?: string;
//   }
//   export enum CompletionItemKind {
//     Text = 0,
//     Method = 1,
//     Function = 2,
//     Constructor = 3,
//     Field = 4,
//     Variable = 5,
//     Class = 6,
//     Interface = 7,
//     Module = 8,
//     Property = 9,
//     Unit = 10,
//     Value = 11,
//     Enum = 12,
//     Keyword = 13,
//     Snippet = 14,
//     Color = 15,
//     Reference = 17,
//     File = 16,
//     Folder = 18,
//     EnumMember = 19,
//     Constant = 20,
//     Struct = 21,
//     Event = 22,
//     Operator = 23,
//     TypeParameter = 24,
//     User = 25,
//     Issue = 26,
//   }
//   export enum CompletionItemTag {
//     Deprecated = 1,
//   }
//   export class CompletionItem {
//     label: string | CompletionItemLabel;
//     kind?: CompletionItemKind;
//     tags?: readonly CompletionItemTag[];
//     detail?: string;
//     documentation?: string | MarkdownString;
//     sortText?: string;
//     filterText?: string;
//     preselect?: boolean;
//     insertText?: string | SnippetString;
//     range?:
//       | Range
//       | {
//           inserting: Range;
//           replacing: Range;
//         };
//     commitCharacters?: string[];
//     keepWhitespace?: boolean;
//     textEdit?: TextEdit;
//     additionalTextEdits?: TextEdit[];
//     command?: Command;
//     constructor(label: string | CompletionItemLabel, kind?: CompletionItemKind);
//   }
//   export class CompletionList<T extends CompletionItem = CompletionItem> {
//     isIncomplete?: boolean;
//     items: T[];
//     constructor(items?: T[], isIncomplete?: boolean);
//   }
//   export enum CompletionTriggerKind {
//     Invoke = 0,
//     TriggerCharacter = 1,
//     TriggerForIncompleteCompletions = 2,
//   }
//   export interface CompletionContext {
//     readonly triggerKind: CompletionTriggerKind;
//     readonly triggerCharacter: string | undefined;
//   }
//   export interface CompletionItemProvider<
//     T extends CompletionItem = CompletionItem
//   > {
//     provideCompletionItems(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken,
//       context: CompletionContext
//     ): ProviderResult<T[] | CompletionList<T>>;
//     resolveCompletionItem?(
//       item: T,
//       token: CancellationToken
//     ): ProviderResult<T>;
//   }
//   export interface InlineCompletionItemProvider {
//     provideInlineCompletionItems(
//       document: TextDocument,
//       position: Position,
//       context: InlineCompletionContext,
//       token: CancellationToken
//     ): ProviderResult<InlineCompletionItem[] | InlineCompletionList>;
//   }
//   export class InlineCompletionList {
//     items: InlineCompletionItem[];
//     constructor(items: InlineCompletionItem[]);
//   }
//   export interface InlineCompletionContext {
//     readonly triggerKind: InlineCompletionTriggerKind;
//     readonly selectedCompletionInfo: SelectedCompletionInfo | undefined;
//   }
//   export interface SelectedCompletionInfo {
//     readonly range: Range;
//     readonly text: string;
//   }
//   export enum InlineCompletionTriggerKind {
//     Invoke = 0,
//     Automatic = 1,
//   }
//   export class InlineCompletionItem {
//     insertText: string | SnippetString;
//     filterText?: string;
//     range?: Range;
//     command?: Command;
//     constructor(
//       insertText: string | SnippetString,
//       range?: Range,
//       command?: Command
//     );
//   }
//   export class DocumentLink {
//     range: Range;
//     target?: Uri;
//     tooltip?: string;
//     constructor(range: Range, target?: Uri);
//   }
//   export interface DocumentLinkProvider<T extends DocumentLink = DocumentLink> {
//     provideDocumentLinks(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<T[]>;
//     resolveDocumentLink?(link: T, token: CancellationToken): ProviderResult<T>;
//   }
//   export class Color {
//     readonly red: number;
//     readonly green: number;
//     readonly blue: number;
//     readonly alpha: number;
//     constructor(red: number, green: number, blue: number, alpha: number);
//   }
//   export class ColorInformation {
//     range: Range;
//     color: Color;
//     constructor(range: Range, color: Color);
//   }
//   export class ColorPresentation {
//     label: string;
//     textEdit?: TextEdit;
//     additionalTextEdits?: TextEdit[];
//     constructor(label: string);
//   }
//   export interface DocumentColorProvider {
//     provideDocumentColors(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<ColorInformation[]>;
//     provideColorPresentations(
//       color: Color,
//       context: {
//         readonly document: TextDocument;
//         readonly range: Range;
//       },
//       token: CancellationToken
//     ): ProviderResult<ColorPresentation[]>;
//   }
//   export enum InlayHintKind {
//     Type = 1,
//     Parameter = 2,
//   }
//   export class InlayHintLabelPart {
//     value: string;
//     tooltip?: string | MarkdownString | undefined;
//     location?: Location | undefined;
//     command?: Command | undefined;
//     constructor(value: string);
//   }
//   export class InlayHint {
//     position: Position;
//     label: string | InlayHintLabelPart[];
//     tooltip?: string | MarkdownString | undefined;
//     kind?: InlayHintKind;
//     textEdits?: TextEdit[];
//     paddingLeft?: boolean;
//     paddingRight?: boolean;
//     constructor(
//       position: Position,
//       label: string | InlayHintLabelPart[],
//       kind?: InlayHintKind
//     );
//   }
//   export interface InlayHintsProvider<T extends InlayHint = InlayHint> {
//     onDidChangeInlayHints?: Event<void>;
//     provideInlayHints(
//       document: TextDocument,
//       range: Range,
//       token: CancellationToken
//     ): ProviderResult<T[]>;
//     resolveInlayHint?(hint: T, token: CancellationToken): ProviderResult<T>;
//   }
//   export class FoldingRange {
//     start: number;
//     end: number;
//     kind?: FoldingRangeKind;
//     constructor(start: number, end: number, kind?: FoldingRangeKind);
//   }
//   export enum FoldingRangeKind {
//     Comment = 1,
//     Imports = 2,
//     Region = 3,
//   }
//   export interface FoldingContext {}
//   export interface FoldingRangeProvider {
//     onDidChangeFoldingRanges?: Event<void>;
//     provideFoldingRanges(
//       document: TextDocument,
//       context: FoldingContext,
//       token: CancellationToken
//     ): ProviderResult<FoldingRange[]>;
//   }
//   export class SelectionRange {
//     range: Range;
//     parent?: SelectionRange;
//     constructor(range: Range, parent?: SelectionRange);
//   }
//   export interface SelectionRangeProvider {
//     provideSelectionRanges(
//       document: TextDocument,
//       positions: readonly Position[],
//       token: CancellationToken
//     ): ProviderResult<SelectionRange[]>;
//   }
//   export class CallHierarchyItem {
//     name: string;
//     kind: SymbolKind;
//     tags?: readonly SymbolTag[];
//     detail?: string;
//     uri: Uri;
//     range: Range;
//     selectionRange: Range;
//     constructor(
//       kind: SymbolKind,
//       name: string,
//       detail: string,
//       uri: Uri,
//       range: Range,
//       selectionRange: Range
//     );
//   }
//   export class CallHierarchyIncomingCall {
//     from: CallHierarchyItem;
//     fromRanges: Range[];
//     constructor(item: CallHierarchyItem, fromRanges: Range[]);
//   }
//   export class CallHierarchyOutgoingCall {
//     to: CallHierarchyItem;
//     fromRanges: Range[];
//     constructor(item: CallHierarchyItem, fromRanges: Range[]);
//   }
//   export interface CallHierarchyProvider {
//     prepareCallHierarchy(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<CallHierarchyItem | CallHierarchyItem[]>;
//     provideCallHierarchyIncomingCalls(
//       item: CallHierarchyItem,
//       token: CancellationToken
//     ): ProviderResult<CallHierarchyIncomingCall[]>;
//     provideCallHierarchyOutgoingCalls(
//       item: CallHierarchyItem,
//       token: CancellationToken
//     ): ProviderResult<CallHierarchyOutgoingCall[]>;
//   }
//   export class TypeHierarchyItem {
//     name: string;
//     kind: SymbolKind;
//     tags?: ReadonlyArray<SymbolTag>;
//     detail?: string;
//     uri: Uri;
//     range: Range;
//     selectionRange: Range;
//     constructor(
//       kind: SymbolKind,
//       name: string,
//       detail: string,
//       uri: Uri,
//       range: Range,
//       selectionRange: Range
//     );
//   }
//   export interface TypeHierarchyProvider {
//     prepareTypeHierarchy(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<TypeHierarchyItem | TypeHierarchyItem[]>;
//     provideTypeHierarchySupertypes(
//       item: TypeHierarchyItem,
//       token: CancellationToken
//     ): ProviderResult<TypeHierarchyItem[]>;
//     provideTypeHierarchySubtypes(
//       item: TypeHierarchyItem,
//       token: CancellationToken
//     ): ProviderResult<TypeHierarchyItem[]>;
//   }
//   export class LinkedEditingRanges {
//     constructor(ranges: Range[], wordPattern?: RegExp);
//     readonly ranges: Range[];
//     readonly wordPattern: RegExp | undefined;
//   }
//   export interface LinkedEditingRangeProvider {
//     provideLinkedEditingRanges(
//       document: TextDocument,
//       position: Position,
//       token: CancellationToken
//     ): ProviderResult<LinkedEditingRanges>;
//   }
//   export class DocumentDropEdit {
//     insertText: string | SnippetString;
//     additionalEdit?: WorkspaceEdit;
//     constructor(insertText: string | SnippetString);
//   }
//   export interface DocumentDropEditProvider {
//     provideDocumentDropEdits(
//       document: TextDocument,
//       position: Position,
//       dataTransfer: DataTransfer,
//       token: CancellationToken
//     ): ProviderResult<DocumentDropEdit>;
//   }
//   export type CharacterPair = [string, string];
//   export interface CommentRule {
//     lineComment?: string;
//     blockComment?: CharacterPair;
//   }
//   export interface IndentationRule {
//     decreaseIndentPattern: RegExp;
//     increaseIndentPattern: RegExp;
//     indentNextLinePattern?: RegExp;
//     unIndentedLinePattern?: RegExp;
//   }
//   export enum IndentAction {
//     None = 0,
//     Indent = 1,
//     IndentOutdent = 2,
//     Outdent = 3,
//   }
//   export interface EnterAction {
//     indentAction: IndentAction;
//     appendText?: string;
//     removeText?: number;
//   }
//   export interface OnEnterRule {
//     beforeText: RegExp;
//     afterText?: RegExp;
//     previousLineText?: RegExp;
//     action: EnterAction;
//   }
//   export enum SyntaxTokenType {
//     Other = 0,
//     Comment = 1,
//     String = 2,
//     RegEx = 3,
//   }
//   export interface AutoClosingPair {
//     open: string;
//     close: string;
//     notIn?: SyntaxTokenType[];
//   }
//   export interface LanguageConfiguration {
//     comments?: CommentRule;
//     brackets?: CharacterPair[];
//     wordPattern?: RegExp;
//     indentationRules?: IndentationRule;
//     onEnterRules?: OnEnterRule[];
//     autoClosingPairs?: AutoClosingPair[];
//     __electricCharacterSupport?: {
//       brackets?: any;
//       docComment?: {
//         scope: string;
//         open: string;
//         lineStart: string;
//         close?: string;
//       };
//     };
//     __characterPairSupport?: {
//       autoClosingPairs: {
//         open: string;
//         close: string;
//         notIn?: string[];
//       }[];
//     };
//   }
//   export enum ConfigurationTarget {
//     Global = 1,
//     Workspace = 2,
//     WorkspaceFolder = 3,
//   }
//   export interface WorkspaceConfiguration {
//     get<T>(section: string): T | undefined;
//     get<T>(section: string, defaultValue: T): T;
//     has(section: string): boolean;
//     inspect<T>(section: string):
//       | {
//           key: string;
//           defaultValue?: T;
//           globalValue?: T;
//           workspaceValue?: T;
//           workspaceFolderValue?: T;
//           defaultLanguageValue?: T;
//           globalLanguageValue?: T;
//           workspaceLanguageValue?: T;
//           workspaceFolderLanguageValue?: T;
//           languageIds?: string[];
//         }
//       | undefined;
//     update(
//       section: string,
//       value: any,
//       configurationTarget?: ConfigurationTarget | boolean | null,
//       overrideInLanguage?: boolean
//     ): Thenable<void>;
//     readonly [key: string]: any;
//   }
//   export class Location {
//     uri: Uri;
//     range: Range;
//     constructor(uri: Uri, rangeOrPosition: Range | Position);
//   }
//   export interface LocationLink {
//     originSelectionRange?: Range;
//     targetUri: Uri;
//     targetRange: Range;
//     targetSelectionRange?: Range;
//   }
//   export interface DiagnosticChangeEvent {
//     readonly uris: readonly Uri[];
//   }
//   export enum DiagnosticSeverity {
//     Error = 0,
//     Warning = 1,
//     Information = 2,
//     Hint = 3,
//   }
//   export class DiagnosticRelatedInformation {
//     location: Location;
//     message: string;
//     constructor(location: Location, message: string);
//   }
//   export enum DiagnosticTag {
//     Unnecessary = 1,
//     Deprecated = 2,
//   }
//   export class Diagnostic {
//     range: Range;
//     message: string;
//     severity: DiagnosticSeverity;
//     source?: string;
//     code?:
//       | string
//       | number
//       | {
//           value: string | number;
//           target: Uri;
//         };
//     relatedInformation?: DiagnosticRelatedInformation[];
//     tags?: DiagnosticTag[];
//     constructor(range: Range, message: string, severity?: DiagnosticSeverity);
//   }
//   export interface DiagnosticCollection
//     extends Iterable<[uri: Uri, diagnostics: readonly Diagnostic[]]> {
//     readonly name: string;
//     set(uri: Uri, diagnostics: readonly Diagnostic[] | undefined): void;
//     set(entries: ReadonlyArray<[Uri, readonly Diagnostic[] | undefined]>): void;
//     delete(uri: Uri): void;
//     clear(): void;
//     forEach(
//       callback: (
//         uri: Uri,
//         diagnostics: readonly Diagnostic[],
//         collection: DiagnosticCollection
//       ) => any,
//       thisArg?: any
//     ): void;
//     get(uri: Uri): readonly Diagnostic[] | undefined;
//     has(uri: Uri): boolean;
//     dispose(): void;
//   }
//   export enum LanguageStatusSeverity {
//     Information = 0,
//     Warning = 1,
//     Error = 2,
//   }
//   export interface LanguageStatusItem {
//     readonly id: string;
//     name: string | undefined;
//     selector: DocumentSelector;
//     severity: LanguageStatusSeverity;
//     text: string;
//     detail?: string;
//     busy: boolean;
//     command: Command | undefined;
//     accessibilityInformation?: AccessibilityInformation;
//     dispose(): void;
//   }
//   export enum ViewColumn {
//     Active = -1,
//     Beside = -2,
//     One = 1,
//     Two = 2,
//     Three = 3,
//     Four = 4,
//     Five = 5,
//     Six = 6,
//     Seven = 7,
//     Eight = 8,
//     Nine = 9,
//   }
//   export interface OutputChannel {
//     readonly name: string;
//     append(value: string): void;
//     appendLine(value: string): void;
//     replace(value: string): void;
//     clear(): void;
//     show(preserveFocus?: boolean): void;
//     show(column?: ViewColumn, preserveFocus?: boolean): void;
//     hide(): void;
//     dispose(): void;
//   }
//   export interface LogOutputChannel extends OutputChannel {
//     readonly logLevel: LogLevel;
//     readonly onDidChangeLogLevel: Event<LogLevel>;
//     trace(message: string, ...args: any[]): void;
//     debug(message: string, ...args: any[]): void;
//     info(message: string, ...args: any[]): void;
//     warn(message: string, ...args: any[]): void;
//     error(error: string | Error, ...args: any[]): void;
//   }
//   export interface AccessibilityInformation {
//     readonly label: string;
//     readonly role?: string;
//   }
//   export enum StatusBarAlignment {
//     Left = 1,
//     Right = 2,
//   }
//   export interface StatusBarItem {
//     readonly id: string;
//     readonly alignment: StatusBarAlignment;
//     readonly priority: number | undefined;
//     name: string | undefined;
//     text: string;
//     tooltip: string | MarkdownString | undefined;
//     color: string | ThemeColor | undefined;
//     backgroundColor: ThemeColor | undefined;
//     command: string | Command | undefined;
//     accessibilityInformation: AccessibilityInformation | undefined;
//     show(): void;
//     hide(): void;
//     dispose(): void;
//   }
//   export interface Progress<T> {
//     report(value: T): void;
//   }
//   export interface Terminal {
//     readonly name: string;
//     readonly processId: Thenable<number | undefined>;
//     readonly creationOptions: Readonly<
//       TerminalOptions | ExtensionTerminalOptions
//     >;
//     readonly exitStatus: TerminalExitStatus | undefined;
//     readonly state: TerminalState;
//     sendText(text: string, shouldExecute?: boolean): void;
//     show(preserveFocus?: boolean): void;
//     hide(): void;
//     dispose(): void;
//   }
//   export enum TerminalLocation {
//     Panel = 1,
//     Editor = 2,
//   }
//   export interface TerminalEditorLocationOptions {
//     viewColumn: ViewColumn;
//     preserveFocus?: boolean;
//   }
//   export interface TerminalSplitLocationOptions {
//     parentTerminal: Terminal;
//   }
//   export interface TerminalState {
//     readonly isInteractedWith: boolean;
//   }
//   export interface TerminalLinkContext {
//     line: string;
//     terminal: Terminal;
//   }
//   export interface TerminalLinkProvider<T extends TerminalLink = TerminalLink> {
//     provideTerminalLinks(
//       context: TerminalLinkContext,
//       token: CancellationToken
//     ): ProviderResult<T[]>;
//     handleTerminalLink(link: T): ProviderResult<void>;
//   }
//   export class TerminalLink {
//     startIndex: number;
//     length: number;
//     tooltip?: string;
//     constructor(startIndex: number, length: number, tooltip?: string);
//   }
//   export interface TerminalProfileProvider {
//     provideTerminalProfile(
//       token: CancellationToken
//     ): ProviderResult<TerminalProfile>;
//   }
//   export class TerminalProfile {
//     options: TerminalOptions | ExtensionTerminalOptions;
//     constructor(options: TerminalOptions | ExtensionTerminalOptions);
//   }
//   export class FileDecoration {
//     badge?: string;
//     tooltip?: string;
//     color?: ThemeColor;
//     propagate?: boolean;
//     constructor(badge?: string, tooltip?: string, color?: ThemeColor);
//   }
//   export interface FileDecorationProvider {
//     onDidChangeFileDecorations?: Event<undefined | Uri | Uri[]>;
//     provideFileDecoration(
//       uri: Uri,
//       token: CancellationToken
//     ): ProviderResult<FileDecoration>;
//   }
//   export enum ExtensionKind {
//     UI = 1,
//     Workspace = 2,
//   }
//   export interface Extension<T> {
//     readonly id: string;
//     readonly extensionUri: Uri;
//     readonly extensionPath: string;
//     readonly isActive: boolean;
//     readonly packageJSON: any;
//     extensionKind: ExtensionKind;
//     readonly exports: T;
//     activate(): Thenable<T>;
//   }
//   export enum ExtensionMode {
//     Production = 1,
//     Development = 2,
//     Test = 3,
//   }
//   export interface ExtensionContext {
//     readonly subscriptions: {
//       dispose(): any;
//     }[];
//     readonly workspaceState: Memento;
//     readonly globalState: Memento & {
//       setKeysForSync(keys: readonly string[]): void;
//     };
//     readonly secrets: SecretStorage;
//     readonly extensionUri: Uri;
//     readonly extensionPath: string;
//     readonly environmentVariableCollection: GlobalEnvironmentVariableCollection;
//     asAbsolutePath(relativePath: string): string;
//     readonly storageUri: Uri | undefined;
//     readonly storagePath: string | undefined;
//     readonly globalStorageUri: Uri;
//     readonly globalStoragePath: string;
//     readonly logUri: Uri;
//     readonly logPath: string;
//     readonly extensionMode: ExtensionMode;
//     readonly extension: Extension<any>;
//   }
//   export interface Memento {
//     keys(): readonly string[];
//     get<T>(key: string): T | undefined;
//     get<T>(key: string, defaultValue: T): T;
//     update(key: string, value: any): Thenable<void>;
//   }
//   export interface SecretStorageChangeEvent {
//     readonly key: string;
//   }
//   export interface SecretStorage {
//     get(key: string): Thenable<string | undefined>;
//     store(key: string, value: string): Thenable<void>;
//     delete(key: string): Thenable<void>;
//     onDidChange: Event<SecretStorageChangeEvent>;
//   }
//   export enum ColorThemeKind {
//     Light = 1,
//     Dark = 2,
//     HighContrast = 3,
//     HighContrastLight = 4,
//   }
//   export interface ColorTheme {
//     readonly kind: ColorThemeKind;
//   }
//   export enum TaskRevealKind {
//     Always = 1,
//     Silent = 2,
//     Never = 3,
//   }
//   export enum TaskPanelKind {
//     Shared = 1,
//     Dedicated = 2,
//     New = 3,
//   }
//   export interface TaskPresentationOptions {
//     reveal?: TaskRevealKind;
//     echo?: boolean;
//     focus?: boolean;
//     panel?: TaskPanelKind;
//     showReuseMessage?: boolean;
//     clear?: boolean;
//     close?: boolean;
//   }
//   export class TaskGroup {
//     static Clean: TaskGroup;
//     static Build: TaskGroup;
//     static Rebuild: TaskGroup;
//     static Test: TaskGroup;
//     readonly isDefault: boolean | undefined;
//     readonly id: string;
//     private constructor(id: string, label: string);
//   }
//   export interface TaskDefinition {
//     readonly type: string;
//     [name: string]: any;
//   }
//   export interface ProcessExecutionOptions {
//     cwd?: string;
//     env?: { [key: string]: string };
//   }
//   export class ProcessExecution {
//     constructor(process: string, options?: ProcessExecutionOptions);
//     constructor(
//       process: string,
//       args: string[],
//       options?: ProcessExecutionOptions
//     );
//     process: string;
//     args: string[];
//     options?: ProcessExecutionOptions;
//   }
//   export interface ShellQuotingOptions {
//     escape?:
//       | string
//       | {
//           escapeChar: string;
//           charsToEscape: string;
//         };
//     strong?: string;
//     weak?: string;
//   }
//   export interface ShellExecutionOptions {
//     executable?: string;
//     shellArgs?: string[];
//     shellQuoting?: ShellQuotingOptions;
//     cwd?: string;
//     env?: { [key: string]: string };
//   }
//   export enum ShellQuoting {
//     Escape = 1,
//     Strong = 2,
//     Weak = 3,
//   }
//   export interface ShellQuotedString {
//     value: string;
//     quoting: ShellQuoting;
//   }
//   export class ShellExecution {
//     constructor(commandLine: string, options?: ShellExecutionOptions);
//     constructor(
//       command: string | ShellQuotedString,
//       args: (string | ShellQuotedString)[],
//       options?: ShellExecutionOptions
//     );
//     commandLine: string | undefined;
//     command: string | ShellQuotedString;
//     args: (string | ShellQuotedString)[];
//     options?: ShellExecutionOptions;
//   }
//   export class CustomExecution {
//     constructor(
//       callback: (resolvedDefinition: TaskDefinition) => Thenable<Pseudoterminal>
//     );
//   }
//   export enum TaskScope {
//     Global = 1,
//     Workspace = 2,
//   }
//   export interface RunOptions {
//     reevaluateOnRerun?: boolean;
//   }
//   export class Task {
//     constructor(
//       taskDefinition: TaskDefinition,
//       scope: WorkspaceFolder | TaskScope.Global | TaskScope.Workspace,
//       name: string,
//       source: string,
//       execution?: ProcessExecution | ShellExecution | CustomExecution,
//       problemMatchers?: string | string[]
//     );
//     constructor(
//       taskDefinition: TaskDefinition,
//       name: string,
//       source: string,
//       execution?: ProcessExecution | ShellExecution,
//       problemMatchers?: string | string[]
//     );
//     definition: TaskDefinition;
//     readonly scope:
//       | TaskScope.Global
//       | TaskScope.Workspace
//       | WorkspaceFolder
//       | undefined;
//     name: string;
//     detail?: string;
//     execution?: ProcessExecution | ShellExecution | CustomExecution;
//     isBackground: boolean;
//     source: string;
//     group?: TaskGroup;
//     presentationOptions: TaskPresentationOptions;
//     problemMatchers: string[];
//     runOptions: RunOptions;
//   }
//   export interface TaskProvider<T extends Task = Task> {
//     provideTasks(token: CancellationToken): ProviderResult<T[]>;
//     resolveTask(task: T, token: CancellationToken): ProviderResult<T>;
//   }
//   export interface TaskExecution {
//     task: Task;
//     terminate(): void;
//   }
//   interface TaskStartEvent {
//     readonly execution: TaskExecution;
//   }
//   interface TaskEndEvent {
//     readonly execution: TaskExecution;
//   }
//   export interface TaskProcessStartEvent {
//     readonly execution: TaskExecution;
//     readonly processId: number;
//   }
//   export interface TaskProcessEndEvent {
//     readonly execution: TaskExecution;
//     readonly exitCode: number | undefined;
//   }
//   export interface TaskFilter {
//     version?: string;
//     type?: string;
//   }
//   export namespace tasks {
//     export function registerTaskProvider(
//       type: string,
//       provider: TaskProvider
//     ): Disposable;
//     export function fetchTasks(filter?: TaskFilter): Thenable<Task[]>;
//     export function executeTask(task: Task): Thenable<TaskExecution>;
//     export const taskExecutions: readonly TaskExecution[];
//     export const onDidStartTask: Event<TaskStartEvent>;
//     export const onDidEndTask: Event<TaskEndEvent>;
//     export const onDidStartTaskProcess: Event<TaskProcessStartEvent>;
//     export const onDidEndTaskProcess: Event<TaskProcessEndEvent>;
//   }
//   export enum FileType {
//     Unknown = 0,
//     File = 1,
//     Directory = 2,
//     SymbolicLink = 64,
//   }
//   export enum FilePermission {
//     Readonly = 1,
//   }
//   export interface FileStat {
//     type: FileType;
//     ctime: number;
//     mtime: number;
//     size: number;
//     permissions?: FilePermission;
//   }
//   export class FileSystemError extends Error {
//     static FileNotFound(messageOrUri?: string | Uri): FileSystemError;
//     static FileExists(messageOrUri?: string | Uri): FileSystemError;
//     static FileNotADirectory(messageOrUri?: string | Uri): FileSystemError;
//     static FileIsADirectory(messageOrUri?: string | Uri): FileSystemError;
//     static NoPermissions(messageOrUri?: string | Uri): FileSystemError;
//     static Unavailable(messageOrUri?: string | Uri): FileSystemError;
//     constructor(messageOrUri?: string | Uri);
//     readonly code: string;
//   }
//   export enum FileChangeType {
//     Changed = 1,
//     Created = 2,
//     Deleted = 3,
//   }
//   export interface FileChangeEvent {
//     readonly type: FileChangeType;
//     readonly uri: Uri;
//   }
//   export interface FileSystemProvider {
//     readonly onDidChangeFile: Event<FileChangeEvent[]>;
//     watch(
//       uri: Uri,
//       options: {
//         readonly recursive: boolean;
//         readonly excludes: readonly string[];
//       }
//     ): Disposable;
//     stat(uri: Uri): FileStat | Thenable<FileStat>;
//     readDirectory(
//       uri: Uri
//     ): [string, FileType][] | Thenable<[string, FileType][]>;
//     createDirectory(uri: Uri): void | Thenable<void>;
//     readFile(uri: Uri): Uint8Array | Thenable<Uint8Array>;
//     writeFile(
//       uri: Uri,
//       content: Uint8Array,
//       options: {
//         readonly create: boolean;
//         readonly overwrite: boolean;
//       }
//     ): void | Thenable<void>;
//     delete(
//       uri: Uri,
//       options: {
//         readonly recursive: boolean;
//       }
//     ): void | Thenable<void>;
//     rename(
//       oldUri: Uri,
//       newUri: Uri,
//       options: {
//         readonly overwrite: boolean;
//       }
//     ): void | Thenable<void>;
//     copy?(
//       source: Uri,
//       destination: Uri,
//       options: {
//         readonly overwrite: boolean;
//       }
//     ): void | Thenable<void>;
//   }
//   export interface FileSystem {
//     stat(uri: Uri): Thenable<FileStat>;
//     readDirectory(uri: Uri): Thenable<[string, FileType][]>;
//     createDirectory(uri: Uri): Thenable<void>;
//     readFile(uri: Uri): Thenable<Uint8Array>;
//     writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
//     delete(
//       uri: Uri,
//       options?: {
//         recursive?: boolean;
//         useTrash?: boolean;
//       }
//     ): Thenable<void>;
//     rename(
//       source: Uri,
//       target: Uri,
//       options?: {
//         overwrite?: boolean;
//       }
//     ): Thenable<void>;
//     copy(
//       source: Uri,
//       target: Uri,
//       options?: {
//         overwrite?: boolean;
//       }
//     ): Thenable<void>;
//     isWritableFileSystem(scheme: string): boolean | undefined;
//   }
//   export interface WebviewPortMapping {
//     readonly webviewPort: number;
//     readonly extensionHostPort: number;
//   }
//   export interface WebviewOptions {
//     readonly enableScripts?: boolean;
//     readonly enableForms?: boolean;
//     readonly enableCommandUris?: boolean | readonly string[];
//     readonly localResourceRoots?: readonly Uri[];
//     readonly portMapping?: readonly WebviewPortMapping[];
//   }
//   export interface Webview {
//     options: WebviewOptions;
//     html: string;
//     readonly onDidReceiveMessage: Event<any>;
//     postMessage(message: any): Thenable<boolean>;
//     asWebviewUri(localResource: Uri): Uri;
//     readonly cspSource: string;
//   }
//   export interface WebviewPanelOptions {
//     readonly enableFindWidget?: boolean;
//     readonly retainContextWhenHidden?: boolean;
//   }
//   interface WebviewPanel {
//     readonly viewType: string;
//     title: string;
//     iconPath?:
//       | Uri
//       | {
//           readonly light: Uri;
//           readonly dark: Uri;
//         };
//     readonly webview: Webview;
//     readonly options: WebviewPanelOptions;
//     readonly viewColumn: ViewColumn | undefined;
//     readonly active: boolean;
//     readonly visible: boolean;
//     readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
//     readonly onDidDispose: Event<void>;
//     reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
//     dispose(): any;
//   }
//   export interface WebviewPanelOnDidChangeViewStateEvent {
//     readonly webviewPanel: WebviewPanel;
//   }
//   interface WebviewPanelSerializer<T = unknown> {
//     deserializeWebviewPanel(
//       webviewPanel: WebviewPanel,
//       state: T
//     ): Thenable<void>;
//   }
//   export interface WebviewView {
//     readonly viewType: string;
//     readonly webview: Webview;
//     title?: string;
//     description?: string;
//     badge?: ViewBadge | undefined;
//     readonly onDidDispose: Event<void>;
//     readonly visible: boolean;
//     readonly onDidChangeVisibility: Event<void>;
//     show(preserveFocus?: boolean): void;
//   }
//   interface WebviewViewResolveContext<T = unknown> {
//     readonly state: T | undefined;
//   }
//   export interface WebviewViewProvider {
//     resolveWebviewView(
//       webviewView: WebviewView,
//       context: WebviewViewResolveContext,
//       token: CancellationToken
//     ): Thenable<void> | void;
//   }
//   export interface CustomTextEditorProvider {
//     resolveCustomTextEditor(
//       document: TextDocument,
//       webviewPanel: WebviewPanel,
//       token: CancellationToken
//     ): Thenable<void> | void;
//   }
//   interface CustomDocument {
//     readonly uri: Uri;
//     dispose(): void;
//   }
//   interface CustomDocumentEditEvent<T extends CustomDocument = CustomDocument> {
//     readonly document: T;
//     undo(): Thenable<void> | void;
//     redo(): Thenable<void> | void;
//     readonly label?: string;
//   }
//   interface CustomDocumentContentChangeEvent<
//     T extends CustomDocument = CustomDocument
//   > {
//     readonly document: T;
//   }
//   interface CustomDocumentBackup {
//     readonly id: string;
//     delete(): void;
//   }
//   interface CustomDocumentBackupContext {
//     readonly destination: Uri;
//   }
//   interface CustomDocumentOpenContext {
//     readonly backupId: string | undefined;
//     readonly untitledDocumentData: Uint8Array | undefined;
//   }
//   export interface CustomReadonlyEditorProvider<
//     T extends CustomDocument = CustomDocument
//   > {
//     openCustomDocument(
//       uri: Uri,
//       openContext: CustomDocumentOpenContext,
//       token: CancellationToken
//     ): Thenable<T> | T;
//     resolveCustomEditor(
//       document: T,
//       webviewPanel: WebviewPanel,
//       token: CancellationToken
//     ): Thenable<void> | void;
//   }
//   export interface CustomEditorProvider<
//     T extends CustomDocument = CustomDocument
//   > extends CustomReadonlyEditorProvider<T> {
//     readonly onDidChangeCustomDocument:
//       | Event<CustomDocumentEditEvent<T>>
//       | Event<CustomDocumentContentChangeEvent<T>>;
//     saveCustomDocument(
//       document: T,
//       cancellation: CancellationToken
//     ): Thenable<void>;
//     saveCustomDocumentAs(
//       document: T,
//       destination: Uri,
//       cancellation: CancellationToken
//     ): Thenable<void>;
//     revertCustomDocument(
//       document: T,
//       cancellation: CancellationToken
//     ): Thenable<void>;
//     backupCustomDocument(
//       document: T,
//       context: CustomDocumentBackupContext,
//       cancellation: CancellationToken
//     ): Thenable<CustomDocumentBackup>;
//   }
//   export interface Clipboard {
//     readText(): Thenable<string>;
//     writeText(value: string): Thenable<void>;
//   }
//   export enum UIKind {
//     Desktop = 1,
//     Web = 2,
//   }
//   export enum LogLevel {
//     Off = 0,
//     Trace = 1,
//     Debug = 2,
//     Info = 3,
//     Warning = 4,
//     Error = 5,
//   }
//   export namespace env {
//     export const appName: string;
//     export const appRoot: string;
//     export const appHost: string;
//     export const uriScheme: string;
//     export const language: string;
//     export const clipboard: Clipboard;
//     export const machineId: string;
//     export const sessionId: string;
//     export const isNewAppInstall: boolean;
//     export const isTelemetryEnabled: boolean;
//     export const onDidChangeTelemetryEnabled: Event<boolean>;
//     export const onDidChangeShell: Event<string>;
//     export function createTelemetryLogger(
//       sender: TelemetrySender,
//       options?: TelemetryLoggerOptions
//     ): TelemetryLogger;
//     export const remoteName: string | undefined;
//     export const shell: string;
//     export const uiKind: UIKind;
//     export function openExternal(target: Uri): Thenable<boolean>;
//     export function asExternalUri(target: Uri): Thenable<Uri>;
//     export const logLevel: LogLevel;
//     export const onDidChangeLogLevel: Event<LogLevel>;
//   }
//   export namespace commands {
//     export function registerCommand(
//       command: string,
//       callback: (...args: any[]) => any,
//       thisArg?: any
//     ): Disposable;
//     export function registerTextEditorCommand(
//       command: string,
//       callback: (
//         textEditor: TextEditor,
//         edit: TextEditorEdit,
//         ...args: any[]
//       ) => void,
//       thisArg?: any
//     ): Disposable;
//     export function executeCommand<T = unknown>(
//       command: string,
//       ...rest: any[]
//     ): Thenable<T>;
//     export function getCommands(filterInternal?: boolean): Thenable<string[]>;
//   }
//   export interface WindowState {
//     readonly focused: boolean;
//   }
//   export interface UriHandler {
//     handleUri(uri: Uri): ProviderResult<void>;
//   }
//   export namespace window {
//     export const tabGroups: TabGroups;
//     export let activeTextEditor: TextEditor | undefined;
//     export let visibleTextEditors: readonly TextEditor[];
//     export const onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
//     export const onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
//     export const onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
//     export const onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
//     export const onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
//     export const onDidChangeTextEditorViewColumn: Event<TextEditorViewColumnChangeEvent>;
//     export const visibleNotebookEditors: readonly NotebookEditor[];
//     export const onDidChangeVisibleNotebookEditors: Event<
//       readonly NotebookEditor[]
//     >;
//     export const activeNotebookEditor: NotebookEditor | undefined;
//     export const onDidChangeActiveNotebookEditor: Event<
//       NotebookEditor | undefined
//     >;
//     export const onDidChangeNotebookEditorSelection: Event<NotebookEditorSelectionChangeEvent>;
//     export const onDidChangeNotebookEditorVisibleRanges: Event<NotebookEditorVisibleRangesChangeEvent>;
//     export const terminals: readonly Terminal[];
//     export const activeTerminal: Terminal | undefined;
//     export const onDidChangeActiveTerminal: Event<Terminal | undefined>;
//     export const onDidOpenTerminal: Event<Terminal>;
//     export const onDidCloseTerminal: Event<Terminal>;
//     export const onDidChangeTerminalState: Event<Terminal>;
//     export const state: WindowState;
//     export const onDidChangeWindowState: Event<WindowState>;
//     export function showTextDocument(
//       document: TextDocument,
//       column?: ViewColumn,
//       preserveFocus?: boolean
//     ): Thenable<TextEditor>;
//     export function showTextDocument(
//       document: TextDocument,
//       options?: TextDocumentShowOptions
//     ): Thenable<TextEditor>;
//     export function showTextDocument(
//       uri: Uri,
//       options?: TextDocumentShowOptions
//     ): Thenable<TextEditor>;
//     export function showNotebookDocument(
//       document: NotebookDocument,
//       options?: NotebookDocumentShowOptions
//     ): Thenable<NotebookEditor>;
//     export function createTextEditorDecorationType(
//       options: DecorationRenderOptions
//     ): TextEditorDecorationType;
//     export function showInformationMessage<T extends string>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showInformationMessage<T extends string>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showInformationMessage<T extends MessageItem>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showInformationMessage<T extends MessageItem>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showWarningMessage<T extends string>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showWarningMessage<T extends string>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showWarningMessage<T extends MessageItem>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showWarningMessage<T extends MessageItem>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showErrorMessage<T extends string>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showErrorMessage<T extends string>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showErrorMessage<T extends MessageItem>(
//       message: string,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showErrorMessage<T extends MessageItem>(
//       message: string,
//       options: MessageOptions,
//       ...items: T[]
//     ): Thenable<T | undefined>;
//     export function showQuickPick(
//       items: readonly string[] | Thenable<readonly string[]>,
//       options: QuickPickOptions & {
//         /** literal-type defines return type */ canPickMany: true;
//       },
//       token?: CancellationToken
//     ): Thenable<string[] | undefined>;
//     export function showQuickPick(
//       items: readonly string[] | Thenable<readonly string[]>,
//       options?: QuickPickOptions,
//       token?: CancellationToken
//     ): Thenable<string | undefined>;
//     export function showQuickPick<T extends QuickPickItem>(
//       items: readonly T[] | Thenable<readonly T[]>,
//       options: QuickPickOptions & {
//         /** literal-type defines return type */ canPickMany: true;
//       },
//       token?: CancellationToken
//     ): Thenable<T[] | undefined>;
//     export function showQuickPick<T extends QuickPickItem>(
//       items: readonly T[] | Thenable<readonly T[]>,
//       options?: QuickPickOptions,
//       token?: CancellationToken
//     ): Thenable<T | undefined>;
//     export function showWorkspaceFolderPick(
//       options?: WorkspaceFolderPickOptions
//     ): Thenable<WorkspaceFolder | undefined>;
//     export function showOpenDialog(
//       options?: OpenDialogOptions
//     ): Thenable<Uri[] | undefined>;
//     export function showSaveDialog(
//       options?: SaveDialogOptions
//     ): Thenable<Uri | undefined>;
//     export function showInputBox(
//       options?: InputBoxOptions,
//       token?: CancellationToken
//     ): Thenable<string | undefined>;
//     export function createQuickPick<T extends QuickPickItem>(): QuickPick<T>;
//     export function createInputBox(): InputBox;
//     export function createOutputChannel(
//       name: string,
//       languageId?: string
//     ): OutputChannel;
//     export function createOutputChannel(
//       name: string,
//       options: { /** literal-type defines return type */ log: true }
//     ): LogOutputChannel;
//     export function createWebviewPanel(
//       viewType: string,
//       title: string,
//       showOptions:
//         | ViewColumn
//         | {
//             readonly viewColumn: ViewColumn;
//             readonly preserveFocus?: boolean;
//           },
//       options?: WebviewPanelOptions & WebviewOptions
//     ): WebviewPanel;
//     export function setStatusBarMessage(
//       text: string,
//       hideAfterTimeout: number
//     ): Disposable;
//     export function setStatusBarMessage(
//       text: string,
//       hideWhenDone: Thenable<any>
//     ): Disposable;
//     export function setStatusBarMessage(text: string): Disposable;
//     export function withScmProgress<R>(
//       task: (progress: Progress<number>) => Thenable<R>
//     ): Thenable<R>;
//     export function withProgress<R>(
//       options: ProgressOptions,
//       task: (
//         progress: Progress<{
//           message?: string;
//           increment?: number;
//         }>,
//         token: CancellationToken
//       ) => Thenable<R>
//     ): Thenable<R>;
//     export function createStatusBarItem(
//       id: string,
//       alignment?: StatusBarAlignment,
//       priority?: number
//     ): StatusBarItem;
//     export function createStatusBarItem(
//       alignment?: StatusBarAlignment,
//       priority?: number
//     ): StatusBarItem;
//     export function createTerminal(
//       name?: string,
//       shellPath?: string,
//       shellArgs?: readonly string[] | string
//     ): Terminal;
//     export function createTerminal(options: TerminalOptions): Terminal;
//     export function createTerminal(options: ExtensionTerminalOptions): Terminal;
//     export function registerTreeDataProvider<T>(
//       viewId: string,
//       treeDataProvider: TreeDataProvider<T>
//     ): Disposable;
//     export function createTreeView<T>(
//       viewId: string,
//       options: TreeViewOptions<T>
//     ): TreeView<T>;
//     export function registerUriHandler(handler: UriHandler): Disposable;
//     export function registerWebviewPanelSerializer(
//       viewType: string,
//       serializer: WebviewPanelSerializer
//     ): Disposable;
//     export function registerWebviewViewProvider(
//       viewId: string,
//       provider: WebviewViewProvider,
//       options?: {
//         readonly webviewOptions?: {
//           readonly retainContextWhenHidden?: boolean;
//         };
//       }
//     ): Disposable;
//     export function registerCustomEditorProvider(
//       viewType: string,
//       provider:
//         | CustomTextEditorProvider
//         | CustomReadonlyEditorProvider
//         | CustomEditorProvider,
//       options?: {
//         readonly webviewOptions?: WebviewPanelOptions;
//         readonly supportsMultipleEditorsPerDocument?: boolean;
//       }
//     ): Disposable;
//     export function registerTerminalLinkProvider(
//       provider: TerminalLinkProvider
//     ): Disposable;
//     export function registerTerminalProfileProvider(
//       id: string,
//       provider: TerminalProfileProvider
//     ): Disposable;
//     export function registerFileDecorationProvider(
//       provider: FileDecorationProvider
//     ): Disposable;
//     export let activeColorTheme: ColorTheme;
//     export const onDidChangeActiveColorTheme: Event<ColorTheme>;
//   }
//   export interface TreeViewOptions<T> {
//     treeDataProvider: TreeDataProvider<T>;
//     showCollapseAll?: boolean;
//     canSelectMany?: boolean;
//     dragAndDropController?: TreeDragAndDropController<T>;
//     manageCheckboxStateManually?: boolean;
//   }
//   export interface TreeViewExpansionEvent<T> {
//     readonly element: T;
//   }
//   export interface TreeViewSelectionChangeEvent<T> {
//     readonly selection: readonly T[];
//   }
//   export interface TreeViewVisibilityChangeEvent {
//     readonly visible: boolean;
//   }
//   export interface DataTransferFile {
//     readonly name: string;
//     readonly uri?: Uri;
//     data(): Thenable<Uint8Array>;
//   }
//   export class DataTransferItem {
//     asString(): Thenable<string>;
//     asFile(): DataTransferFile | undefined;
//     readonly value: any;
//     constructor(value: any);
//   }
//   export class DataTransfer
//     implements Iterable<[mimeType: string, item: DataTransferItem]>
//   {
//     get(mimeType: string): DataTransferItem | undefined;
//     set(mimeType: string, value: DataTransferItem): void;
//     forEach(
//       callbackfn: (
//         item: DataTransferItem,
//         mimeType: string,
//         dataTransfer: DataTransfer
//       ) => void,
//       thisArg?: any
//     ): void;
//     [Symbol.iterator](): IterableIterator<
//       [mimeType: string, item: DataTransferItem]
//     >;
//   }
//   export interface TreeDragAndDropController<T> {
//     readonly dropMimeTypes: readonly string[];
//     readonly dragMimeTypes: readonly string[];
//     handleDrag?(
//       source: readonly T[],
//       dataTransfer: DataTransfer,
//       token: CancellationToken
//     ): Thenable<void> | void;
//     handleDrop?(
//       target: T | undefined,
//       dataTransfer: DataTransfer,
//       token: CancellationToken
//     ): Thenable<void> | void;
//   }
//   export interface ViewBadge {
//     readonly tooltip: string;
//     readonly value: number;
//   }
//   export interface TreeCheckboxChangeEvent<T> {
//     readonly items: ReadonlyArray<[T, TreeItemCheckboxState]>;
//   }
//   export interface TreeView<T> extends Disposable {
//     readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;
//     readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;
//     readonly selection: readonly T[];
//     readonly onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;
//     readonly visible: boolean;
//     readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
//     readonly onDidChangeCheckboxState: Event<TreeCheckboxChangeEvent<T>>;
//     message?: string;
//     title?: string;
//     description?: string;
//     badge?: ViewBadge | undefined;
//     reveal(
//       element: T,
//       options?: {
//         select?: boolean;
//         focus?: boolean;
//         expand?: boolean | number;
//       }
//     ): Thenable<void>;
//   }
//   export interface TreeDataProvider<T> {
//     onDidChangeTreeData?: Event<T | T[] | undefined | null | void>;
//     getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
//     getChildren(element?: T): ProviderResult<T[]>;
//     getParent?(element: T): ProviderResult<T>;
//     resolveTreeItem?(
//       item: TreeItem,
//       element: T,
//       token: CancellationToken
//     ): ProviderResult<TreeItem>;
//   }
//   export class TreeItem {
//     label?: string | TreeItemLabel;
//     id?: string;
//     iconPath?:
//       | string
//       | Uri
//       | {
//           light: string | Uri;
//           dark: string | Uri;
//         }
//       | ThemeIcon;
//     description?: string | boolean;
//     resourceUri?: Uri;
//     tooltip?: string | MarkdownString | undefined;
//     command?: Command;
//     collapsibleState?: TreeItemCollapsibleState;
//     contextValue?: string;
//     accessibilityInformation?: AccessibilityInformation;
//     checkboxState?:
//       | TreeItemCheckboxState
//       | {
//           readonly state: TreeItemCheckboxState;
//           readonly tooltip?: string;
//           readonly accessibilityInformation?: AccessibilityInformation;
//         };
//     constructor(
//       label: string | TreeItemLabel,
//       collapsibleState?: TreeItemCollapsibleState
//     );
//     constructor(resourceUri: Uri, collapsibleState?: TreeItemCollapsibleState);
//   }
//   export enum TreeItemCollapsibleState {
//     None = 0,
//     Collapsed = 1,
//     Expanded = 2,
//   }
//   export interface TreeItemLabel {
//     label: string;
//     highlights?: [number, number][];
//   }
//   export enum TreeItemCheckboxState {
//     Unchecked = 0,
//     Checked = 1,
//   }
//   export interface TerminalOptions {
//     name?: string;
//     shellPath?: string;
//     shellArgs?: string[] | string;
//     cwd?: string | Uri;
//     env?: { [key: string]: string | null | undefined };
//     strictEnv?: boolean;
//     hideFromUser?: boolean;
//     message?: string;
//     iconPath?:
//       | Uri
//       | {
//           light: Uri;
//           dark: Uri;
//         }
//       | ThemeIcon;
//     color?: ThemeColor;
//     location?:
//       | TerminalLocation
//       | TerminalEditorLocationOptions
//       | TerminalSplitLocationOptions;
//     isTransient?: boolean;
//   }
//   export interface ExtensionTerminalOptions {
//     name: string;
//     pty: Pseudoterminal;
//     iconPath?:
//       | Uri
//       | {
//           light: Uri;
//           dark: Uri;
//         }
//       | ThemeIcon;
//     color?: ThemeColor;
//     location?:
//       | TerminalLocation
//       | TerminalEditorLocationOptions
//       | TerminalSplitLocationOptions;
//     isTransient?: boolean;
//   }
//   interface Pseudoterminal {
//     onDidWrite: Event<string>;
//     onDidOverrideDimensions?: Event<TerminalDimensions | undefined>;
//     onDidClose?: Event<void | number>;
//     onDidChangeName?: Event<string>;
//     open(initialDimensions: TerminalDimensions | undefined): void;
//     close(): void;
//     handleInput?(data: string): void;
//     setDimensions?(dimensions: TerminalDimensions): void;
//   }
//   export interface TerminalDimensions {
//     readonly columns: number;
//     readonly rows: number;
//   }
//   export interface TerminalExitStatus {
//     readonly code: number | undefined;
//     readonly reason: TerminalExitReason;
//   }
//   export enum TerminalExitReason {
//     Unknown = 0,
//     Shutdown = 1,
//     Process = 2,
//     User = 3,
//     Extension = 4,
//   }
//   export enum EnvironmentVariableMutatorType {
//     Replace = 1,
//     Append = 2,
//     Prepend = 3,
//   }
//   export interface EnvironmentVariableMutatorOptions {
//     applyAtProcessCreation?: boolean;
//     applyAtShellIntegration?: boolean;
//   }
//   export interface EnvironmentVariableMutator {
//     readonly type: EnvironmentVariableMutatorType;
//     readonly value: string;
//     readonly options: EnvironmentVariableMutatorOptions;
//   }
//   export interface EnvironmentVariableCollection
//     extends Iterable<[variable: string, mutator: EnvironmentVariableMutator]> {
//     persistent: boolean;
//     description: string | MarkdownString | undefined;
//     replace(
//       variable: string,
//       value: string,
//       options?: EnvironmentVariableMutatorOptions
//     ): void;
//     append(
//       variable: string,
//       value: string,
//       options?: EnvironmentVariableMutatorOptions
//     ): void;
//     prepend(
//       variable: string,
//       value: string,
//       options?: EnvironmentVariableMutatorOptions
//     ): void;
//     get(variable: string): EnvironmentVariableMutator | undefined;
//     forEach(
//       callback: (
//         variable: string,
//         mutator: EnvironmentVariableMutator,
//         collection: EnvironmentVariableCollection
//       ) => any,
//       thisArg?: any
//     ): void;
//     delete(variable: string): void;
//     clear(): void;
//   }
//   export interface GlobalEnvironmentVariableCollection
//     extends EnvironmentVariableCollection {
//     getScoped(scope: EnvironmentVariableScope): EnvironmentVariableCollection;
//   }
//   export interface EnvironmentVariableScope {
//     workspaceFolder?: WorkspaceFolder;
//   }
//   export enum ProgressLocation {
//     SourceControl = 1,
//     Window = 10,
//     Notification = 15,
//   }
//   export interface ProgressOptions {
//     location:
//       | ProgressLocation
//       | {
//           viewId: string;
//         };
//     title?: string;
//     cancellable?: boolean;
//   }
//   export interface QuickInput {
//     title: string | undefined;
//     step: number | undefined;
//     totalSteps: number | undefined;
//     enabled: boolean;
//     busy: boolean;
//     ignoreFocusOut: boolean;
//     show(): void;
//     hide(): void;
//     onDidHide: Event<void>;
//     dispose(): void;
//   }
//   export interface QuickPick<T extends QuickPickItem> extends QuickInput {
//     value: string;
//     placeholder: string | undefined;
//     readonly onDidChangeValue: Event<string>;
//     readonly onDidAccept: Event<void>;
//     buttons: readonly QuickInputButton[];
//     readonly onDidTriggerButton: Event<QuickInputButton>;
//     readonly onDidTriggerItemButton: Event<QuickPickItemButtonEvent<T>>;
//     items: readonly T[];
//     canSelectMany: boolean;
//     matchOnDescription: boolean;
//     matchOnDetail: boolean;
//     keepScrollPosition?: boolean;
//     activeItems: readonly T[];
//     readonly onDidChangeActive: Event<readonly T[]>;
//     selectedItems: readonly T[];
//     readonly onDidChangeSelection: Event<readonly T[]>;
//   }
//   export interface InputBox extends QuickInput {
//     value: string;
//     valueSelection: readonly [number, number] | undefined;
//     placeholder: string | undefined;
//     password: boolean;
//     readonly onDidChangeValue: Event<string>;
//     readonly onDidAccept: Event<void>;
//     buttons: readonly QuickInputButton[];
//     readonly onDidTriggerButton: Event<QuickInputButton>;
//     prompt: string | undefined;
//     validationMessage: string | InputBoxValidationMessage | undefined;
//   }
//   export interface QuickInputButton {
//     readonly iconPath:
//       | Uri
//       | {
//           light: Uri;
//           dark: Uri;
//         }
//       | ThemeIcon;
//     readonly tooltip?: string | undefined;
//   }
//   export class QuickInputButtons {
//     static readonly Back: QuickInputButton;
//     private constructor();
//   }
//   export interface QuickPickItemButtonEvent<T extends QuickPickItem> {
//     readonly button: QuickInputButton;
//     readonly item: T;
//   }
//   export interface TextDocumentContentChangeEvent {
//     readonly range: Range;
//     readonly rangeOffset: number;
//     readonly rangeLength: number;
//     readonly text: string;
//   }
//   export enum TextDocumentChangeReason {
//     /** The text change is caused by an undo operation. */
//     Undo = 1,

//     /** The text change is caused by an redo operation. */
//     Redo = 2,
//   }
//   export interface TextDocumentChangeEvent {
//     readonly document: TextDocument;
//     readonly contentChanges: readonly TextDocumentContentChangeEvent[];
//     readonly reason: TextDocumentChangeReason | undefined;
//   }
//   export enum TextDocumentSaveReason {
//     Manual = 1,
//     AfterDelay = 2,
//     FocusOut = 3,
//   }
//   export interface TextDocumentWillSaveEvent {
//     readonly document: TextDocument;
//     readonly reason: TextDocumentSaveReason;
//     waitUntil(thenable: Thenable<readonly TextEdit[]>): void;
//     waitUntil(thenable: Thenable<any>): void;
//   }
//   export interface FileWillCreateEvent {
//     readonly token: CancellationToken;
//     readonly files: readonly Uri[];
//     waitUntil(thenable: Thenable<WorkspaceEdit>): void;
//     waitUntil(thenable: Thenable<any>): void;
//   }
//   export interface FileCreateEvent {
//     readonly files: readonly Uri[];
//   }
//   export interface FileWillDeleteEvent {
//     readonly token: CancellationToken;
//     readonly files: readonly Uri[];
//     waitUntil(thenable: Thenable<WorkspaceEdit>): void;
//     waitUntil(thenable: Thenable<any>): void;
//   }
//   export interface FileDeleteEvent {
//     readonly files: readonly Uri[];
//   }
//   export interface FileWillRenameEvent {
//     readonly token: CancellationToken;
//     readonly files: ReadonlyArray<{
//       readonly oldUri: Uri;
//       readonly newUri: Uri;
//     }>;
//     waitUntil(thenable: Thenable<WorkspaceEdit>): void;
//     waitUntil(thenable: Thenable<any>): void;
//   }
//   export interface FileRenameEvent {
//     readonly files: ReadonlyArray<{
//       readonly oldUri: Uri;
//       readonly newUri: Uri;
//     }>;
//   }
//   export interface WorkspaceFoldersChangeEvent {
//     readonly added: readonly WorkspaceFolder[];
//     readonly removed: readonly WorkspaceFolder[];
//   }
//   export interface WorkspaceFolder {
//     readonly uri: Uri;
//     readonly name: string;
//     readonly index: number;
//   }
//   export namespace workspace {
//     export const fs: FileSystem;
//     export const rootPath: string | undefined;
//     export const workspaceFolders: readonly WorkspaceFolder[] | undefined;
//     export const name: string | undefined;
//     export const workspaceFile: Uri | undefined;
//     export const onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
//     export function getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined;
//     export function asRelativePath(
//       pathOrUri: string | Uri,
//       includeWorkspaceFolder?: boolean
//     ): string;
//     export function updateWorkspaceFolders(
//       start: number,
//       deleteCount: number | undefined | null,
//       ...workspaceFoldersToAdd: {
//         readonly uri: Uri;
//         readonly name?: string;
//       }[]
//     ): boolean;
//     export function createFileSystemWatcher(
//       globPattern: GlobPattern,
//       ignoreCreateEvents?: boolean,
//       ignoreChangeEvents?: boolean,
//       ignoreDeleteEvents?: boolean
//     ): FileSystemWatcher;
//     export function findFiles(
//       include: GlobPattern,
//       exclude?: GlobPattern | null,
//       maxResults?: number,
//       token?: CancellationToken
//     ): Thenable<Uri[]>;
//     export function save(uri: Uri): Thenable<Uri | undefined>;
//     export function saveAs(uri: Uri): Thenable<Uri | undefined>;
//     export function saveAll(includeUntitled?: boolean): Thenable<boolean>;
//     export function applyEdit(
//       edit: WorkspaceEdit,
//       metadata?: WorkspaceEditMetadata
//     ): Thenable<boolean>;
//     export const textDocuments: readonly TextDocument[];
//     export function openTextDocument(uri: Uri): Thenable<TextDocument>;
//     export function openTextDocument(path: string): Thenable<TextDocument>;
//     export function openTextDocument(options?: {
//       language?: string;
//       content?: string;
//     }): Thenable<TextDocument>;
//     export function registerTextDocumentContentProvider(
//       scheme: string,
//       provider: TextDocumentContentProvider
//     ): Disposable;
//     export const onDidOpenTextDocument: Event<TextDocument>;
//     export const onDidCloseTextDocument: Event<TextDocument>;
//     export const onDidChangeTextDocument: Event<TextDocumentChangeEvent>;
//     export const onWillSaveTextDocument: Event<TextDocumentWillSaveEvent>;
//     export const onDidSaveTextDocument: Event<TextDocument>;
//     export const notebookDocuments: readonly NotebookDocument[];
//     export function openNotebookDocument(uri: Uri): Thenable<NotebookDocument>;
//     export function openNotebookDocument(
//       notebookType: string,
//       content?: NotebookData
//     ): Thenable<NotebookDocument>;
//     export const onDidChangeNotebookDocument: Event<NotebookDocumentChangeEvent>;
//     export const onWillSaveNotebookDocument: Event<NotebookDocumentWillSaveEvent>;
//     export const onDidSaveNotebookDocument: Event<NotebookDocument>;
//     export function registerNotebookSerializer(
//       notebookType: string,
//       serializer: NotebookSerializer,
//       options?: NotebookDocumentContentOptions
//     ): Disposable;
//     export const onDidOpenNotebookDocument: Event<NotebookDocument>;
//     export const onDidCloseNotebookDocument: Event<NotebookDocument>;
//     export const onWillCreateFiles: Event<FileWillCreateEvent>;
//     export const onDidCreateFiles: Event<FileCreateEvent>;
//     export const onWillDeleteFiles: Event<FileWillDeleteEvent>;
//     export const onDidDeleteFiles: Event<FileDeleteEvent>;
//     export const onWillRenameFiles: Event<FileWillRenameEvent>;
//     export const onDidRenameFiles: Event<FileRenameEvent>;
//     export function getConfiguration(
//       section?: string,
//       scope?: ConfigurationScope | null
//     ): WorkspaceConfiguration;
//     export const onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
//     export function registerTaskProvider(
//       type: string,
//       provider: TaskProvider
//     ): Disposable;
//     export function registerFileSystemProvider(
//       scheme: string,
//       provider: FileSystemProvider,
//       options?: {
//         readonly isCaseSensitive?: boolean;
//         readonly isReadonly?: boolean | MarkdownString;
//       }
//     ): Disposable;
//     export const isTrusted: boolean;
//     export const onDidGrantWorkspaceTrust: Event<void>;
//   }
//   export type ConfigurationScope =
//     | Uri
//     | TextDocument
//     | WorkspaceFolder
//     | {
//         uri?: Uri;
//         languageId: string;
//       };
//   export interface ConfigurationChangeEvent {
//     affectsConfiguration(section: string, scope?: ConfigurationScope): boolean;
//   }
//   export namespace languages {
//     export function getLanguages(): Thenable<string[]>;
//     export function setTextDocumentLanguage(
//       document: TextDocument,
//       languageId: string
//     ): Thenable<TextDocument>;
//     export function match(
//       selector: DocumentSelector,
//       document: TextDocument
//     ): number;
//     export const onDidChangeDiagnostics: Event<DiagnosticChangeEvent>;
//     export function getDiagnostics(resource: Uri): Diagnostic[];
//     export function getDiagnostics(): [Uri, Diagnostic[]][];
//     export function createDiagnosticCollection(
//       name?: string
//     ): DiagnosticCollection;
//     export function createLanguageStatusItem(
//       id: string,
//       selector: DocumentSelector
//     ): LanguageStatusItem;
//     export function registerCompletionItemProvider(
//       selector: DocumentSelector,
//       provider: CompletionItemProvider,
//       ...triggerCharacters: string[]
//     ): Disposable;
//     export function registerInlineCompletionItemProvider(
//       selector: DocumentSelector,
//       provider: InlineCompletionItemProvider
//     ): Disposable;
//     export function registerCodeActionsProvider(
//       selector: DocumentSelector,
//       provider: CodeActionProvider,
//       metadata?: CodeActionProviderMetadata
//     ): Disposable;
//     export function registerCodeLensProvider(
//       selector: DocumentSelector,
//       provider: CodeLensProvider
//     ): Disposable;
//     export function registerDefinitionProvider(
//       selector: DocumentSelector,
//       provider: DefinitionProvider
//     ): Disposable;
//     export function registerImplementationProvider(
//       selector: DocumentSelector,
//       provider: ImplementationProvider
//     ): Disposable;
//     export function registerTypeDefinitionProvider(
//       selector: DocumentSelector,
//       provider: TypeDefinitionProvider
//     ): Disposable;
//     export function registerDeclarationProvider(
//       selector: DocumentSelector,
//       provider: DeclarationProvider
//     ): Disposable;
//     export function registerHoverProvider(
//       selector: DocumentSelector,
//       provider: HoverProvider
//     ): Disposable;
//     export function registerEvaluatableExpressionProvider(
//       selector: DocumentSelector,
//       provider: EvaluatableExpressionProvider
//     ): Disposable;
//     export function registerInlineValuesProvider(
//       selector: DocumentSelector,
//       provider: InlineValuesProvider
//     ): Disposable;
//     export function registerDocumentHighlightProvider(
//       selector: DocumentSelector,
//       provider: DocumentHighlightProvider
//     ): Disposable;
//     export function registerDocumentSymbolProvider(
//       selector: DocumentSelector,
//       provider: DocumentSymbolProvider,
//       metaData?: DocumentSymbolProviderMetadata
//     ): Disposable;
//     export function registerWorkspaceSymbolProvider(
//       provider: WorkspaceSymbolProvider
//     ): Disposable;
//     export function registerReferenceProvider(
//       selector: DocumentSelector,
//       provider: ReferenceProvider
//     ): Disposable;
//     export function registerRenameProvider(
//       selector: DocumentSelector,
//       provider: RenameProvider
//     ): Disposable;
//     export function registerDocumentSemanticTokensProvider(
//       selector: DocumentSelector,
//       provider: DocumentSemanticTokensProvider,
//       legend: SemanticTokensLegend
//     ): Disposable;
//     export function registerDocumentRangeSemanticTokensProvider(
//       selector: DocumentSelector,
//       provider: DocumentRangeSemanticTokensProvider,
//       legend: SemanticTokensLegend
//     ): Disposable;
//     export function registerDocumentFormattingEditProvider(
//       selector: DocumentSelector,
//       provider: DocumentFormattingEditProvider
//     ): Disposable;
//     export function registerDocumentRangeFormattingEditProvider(
//       selector: DocumentSelector,
//       provider: DocumentRangeFormattingEditProvider
//     ): Disposable;
//     export function registerOnTypeFormattingEditProvider(
//       selector: DocumentSelector,
//       provider: OnTypeFormattingEditProvider,
//       firstTriggerCharacter: string,
//       ...moreTriggerCharacter: string[]
//     ): Disposable;
//     export function registerSignatureHelpProvider(
//       selector: DocumentSelector,
//       provider: SignatureHelpProvider,
//       ...triggerCharacters: string[]
//     ): Disposable;
//     export function registerSignatureHelpProvider(
//       selector: DocumentSelector,
//       provider: SignatureHelpProvider,
//       metadata: SignatureHelpProviderMetadata
//     ): Disposable;
//     export function registerDocumentLinkProvider(
//       selector: DocumentSelector,
//       provider: DocumentLinkProvider
//     ): Disposable;
//     export function registerColorProvider(
//       selector: DocumentSelector,
//       provider: DocumentColorProvider
//     ): Disposable;
//     export function registerInlayHintsProvider(
//       selector: DocumentSelector,
//       provider: InlayHintsProvider
//     ): Disposable;
//     export function registerFoldingRangeProvider(
//       selector: DocumentSelector,
//       provider: FoldingRangeProvider
//     ): Disposable;
//     export function registerSelectionRangeProvider(
//       selector: DocumentSelector,
//       provider: SelectionRangeProvider
//     ): Disposable;
//     export function registerCallHierarchyProvider(
//       selector: DocumentSelector,
//       provider: CallHierarchyProvider
//     ): Disposable;
//     export function registerTypeHierarchyProvider(
//       selector: DocumentSelector,
//       provider: TypeHierarchyProvider
//     ): Disposable;
//     export function registerLinkedEditingRangeProvider(
//       selector: DocumentSelector,
//       provider: LinkedEditingRangeProvider
//     ): Disposable;
//     export function registerDocumentDropEditProvider(
//       selector: DocumentSelector,
//       provider: DocumentDropEditProvider
//     ): Disposable;
//     export function setLanguageConfiguration(
//       language: string,
//       configuration: LanguageConfiguration
//     ): Disposable;
//   }
//   export enum NotebookEditorRevealType {
//     Default = 0,
//     InCenter = 1,
//     InCenterIfOutsideViewport = 2,
//     AtTop = 3,
//   }
//   export interface NotebookEditor {
//     readonly notebook: NotebookDocument;
//     selection: NotebookRange;
//     selections: readonly NotebookRange[];
//     readonly visibleRanges: readonly NotebookRange[];
//     readonly viewColumn?: ViewColumn;
//     revealRange(
//       range: NotebookRange,
//       revealType?: NotebookEditorRevealType
//     ): void;
//   }
//   export interface NotebookRendererMessaging {
//     readonly onDidReceiveMessage: Event<{
//       readonly editor: NotebookEditor;
//       readonly message: any;
//     }>;
//     postMessage(message: any, editor?: NotebookEditor): Thenable<boolean>;
//   }
//   export enum NotebookCellKind {
//     Markup = 1,
//     Code = 2,
//   }
//   export interface NotebookCell {
//     readonly index: number;
//     readonly notebook: NotebookDocument;
//     readonly kind: NotebookCellKind;
//     readonly document: TextDocument;
//     readonly metadata: { readonly [key: string]: any };
//     readonly outputs: readonly NotebookCellOutput[];
//     readonly executionSummary: NotebookCellExecutionSummary | undefined;
//   }
//   export interface NotebookDocument {
//     readonly uri: Uri;
//     readonly notebookType: string;
//     readonly version: number;
//     readonly isDirty: boolean;
//     readonly isUntitled: boolean;
//     readonly isClosed: boolean;
//     readonly metadata: { [key: string]: any };
//     readonly cellCount: number;
//     cellAt(index: number): NotebookCell;
//     getCells(range?: NotebookRange): NotebookCell[];
//     save(): Thenable<boolean>;
//   }
//   export interface NotebookDocumentCellChange {
//     readonly cell: NotebookCell;
//     readonly document: TextDocument | undefined;
//     readonly metadata: { [key: string]: any } | undefined;
//     readonly outputs: readonly NotebookCellOutput[] | undefined;
//     readonly executionSummary: NotebookCellExecutionSummary | undefined;
//   }
//   export interface NotebookDocumentContentChange {
//     readonly range: NotebookRange;
//     readonly addedCells: readonly NotebookCell[];
//     readonly removedCells: readonly NotebookCell[];
//   }
//   export interface NotebookDocumentChangeEvent {
//     readonly notebook: NotebookDocument;
//     readonly metadata: { [key: string]: any } | undefined;
//     readonly contentChanges: readonly NotebookDocumentContentChange[];
//     readonly cellChanges: readonly NotebookDocumentCellChange[];
//   }
//   export interface NotebookDocumentWillSaveEvent {
//     readonly token: CancellationToken;
//     readonly notebook: NotebookDocument;
//     readonly reason: TextDocumentSaveReason;
//     waitUntil(thenable: Thenable<WorkspaceEdit>): void;
//     waitUntil(thenable: Thenable<any>): void;
//   }
//   export interface NotebookCellExecutionSummary {
//     readonly executionOrder?: number;
//     readonly success?: boolean;
//     readonly timing?: {
//       readonly startTime: number;
//       readonly endTime: number;
//     };
//   }
//   export class NotebookRange {
//     readonly start: number;
//     readonly end: number;
//     readonly isEmpty: boolean;
//     constructor(start: number, end: number);
//     with(change: { start?: number; end?: number }): NotebookRange;
//   }
//   export class NotebookCellOutputItem {
//     static text(value: string, mime?: string): NotebookCellOutputItem;
//     static json(value: any, mime?: string): NotebookCellOutputItem;
//     static stdout(value: string): NotebookCellOutputItem;
//     static stderr(value: string): NotebookCellOutputItem;
//     static error(value: Error): NotebookCellOutputItem;
//     mime: string;
//     data: Uint8Array;
//     constructor(data: Uint8Array, mime: string);
//   }
//   export class NotebookCellOutput {
//     items: NotebookCellOutputItem[];
//     metadata?: { [key: string]: any };
//     constructor(
//       items: NotebookCellOutputItem[],
//       metadata?: { [key: string]: any }
//     );
//   }
//   export class NotebookCellData {
//     kind: NotebookCellKind;
//     value: string;
//     languageId: string;
//     outputs?: NotebookCellOutput[];
//     metadata?: { [key: string]: any };
//     executionSummary?: NotebookCellExecutionSummary;
//     constructor(kind: NotebookCellKind, value: string, languageId: string);
//   }
//   export class NotebookData {
//     cells: NotebookCellData[];
//     metadata?: { [key: string]: any };
//     constructor(cells: NotebookCellData[]);
//   }
//   export interface NotebookSerializer {
//     deserializeNotebook(
//       content: Uint8Array,
//       token: CancellationToken
//     ): NotebookData | Thenable<NotebookData>;
//     serializeNotebook(
//       data: NotebookData,
//       token: CancellationToken
//     ): Uint8Array | Thenable<Uint8Array>;
//   }
//   export interface NotebookDocumentContentOptions {
//     transientOutputs?: boolean;
//     transientCellMetadata?: { [key: string]: boolean | undefined };
//     transientDocumentMetadata?: { [key: string]: boolean | undefined };
//   }
//   export enum NotebookControllerAffinity {
//     Default = 1,
//     Preferred = 2,
//   }
//   export interface NotebookController {
//     readonly id: string;
//     readonly notebookType: string;
//     supportedLanguages?: string[];
//     label: string;
//     description?: string;
//     detail?: string;
//     supportsExecutionOrder?: boolean;
//     createNotebookCellExecution(cell: NotebookCell): NotebookCellExecution;
//     executeHandler: (
//       cells: NotebookCell[],
//       notebook: NotebookDocument,
//       controller: NotebookController
//     ) => void | Thenable<void>;
//     interruptHandler?: (notebook: NotebookDocument) => void | Thenable<void>;
//     readonly onDidChangeSelectedNotebooks: Event<{
//       readonly notebook: NotebookDocument;
//       readonly selected: boolean;
//     }>;
//     updateNotebookAffinity(
//       notebook: NotebookDocument,
//       affinity: NotebookControllerAffinity
//     ): void;
//     dispose(): void;
//   }
//   export interface NotebookCellExecution {
//     readonly cell: NotebookCell;
//     readonly token: CancellationToken;
//     executionOrder: number | undefined;
//     start(startTime?: number): void;
//     end(success: boolean | undefined, endTime?: number): void;
//     clearOutput(cell?: NotebookCell): Thenable<void>;
//     replaceOutput(
//       out: NotebookCellOutput | readonly NotebookCellOutput[],
//       cell?: NotebookCell
//     ): Thenable<void>;
//     appendOutput(
//       out: NotebookCellOutput | readonly NotebookCellOutput[],
//       cell?: NotebookCell
//     ): Thenable<void>;
//     replaceOutputItems(
//       items: NotebookCellOutputItem | readonly NotebookCellOutputItem[],
//       output: NotebookCellOutput
//     ): Thenable<void>;
//     appendOutputItems(
//       items: NotebookCellOutputItem | readonly NotebookCellOutputItem[],
//       output: NotebookCellOutput
//     ): Thenable<void>;
//   }
//   export enum NotebookCellStatusBarAlignment {
//     Left = 1,
//     Right = 2,
//   }
//   export class NotebookCellStatusBarItem {
//     text: string;
//     alignment: NotebookCellStatusBarAlignment;
//     command?: string | Command;
//     tooltip?: string;
//     priority?: number;
//     accessibilityInformation?: AccessibilityInformation;
//     constructor(text: string, alignment: NotebookCellStatusBarAlignment);
//   }
//   export interface NotebookCellStatusBarItemProvider {
//     onDidChangeCellStatusBarItems?: Event<void>;
//     provideCellStatusBarItems(
//       cell: NotebookCell,
//       token: CancellationToken
//     ): ProviderResult<NotebookCellStatusBarItem | NotebookCellStatusBarItem[]>;
//   }
//   export namespace notebooks {
//     export function createNotebookController(
//       id: string,
//       notebookType: string,
//       label: string,
//       handler?: (
//         cells: NotebookCell[],
//         notebook: NotebookDocument,
//         controller: NotebookController
//       ) => void | Thenable<void>
//     ): NotebookController;
//     export function registerNotebookCellStatusBarItemProvider(
//       notebookType: string,
//       provider: NotebookCellStatusBarItemProvider
//     ): Disposable;
//     export function createRendererMessaging(
//       rendererId: string
//     ): NotebookRendererMessaging;
//   }
//   export interface SourceControlInputBox {
//     value: string;
//     placeholder: string;
//     enabled: boolean;
//     visible: boolean;
//   }
//   export interface QuickDiffProvider {
//     provideOriginalResource?(
//       uri: Uri,
//       token: CancellationToken
//     ): ProviderResult<Uri>;
//   }
//   export interface SourceControlResourceThemableDecorations {
//     readonly iconPath?: string | Uri | ThemeIcon;
//   }
//   export interface SourceControlResourceDecorations
//     extends SourceControlResourceThemableDecorations {
//     readonly strikeThrough?: boolean;
//     readonly faded?: boolean;
//     readonly tooltip?: string;
//     readonly light?: SourceControlResourceThemableDecorations;
//     readonly dark?: SourceControlResourceThemableDecorations;
//   }
//   export interface SourceControlResourceState {
//     readonly resourceUri: Uri;
//     readonly command?: Command;
//     readonly decorations?: SourceControlResourceDecorations;
//     readonly contextValue?: string;
//   }
//   export interface SourceControlResourceGroup {
//     readonly id: string;
//     label: string;
//     hideWhenEmpty?: boolean;
//     resourceStates: SourceControlResourceState[];
//     dispose(): void;
//   }
//   export interface SourceControl {
//     readonly id: string;
//     readonly label: string;
//     readonly rootUri: Uri | undefined;
//     readonly inputBox: SourceControlInputBox;
//     count?: number;
//     quickDiffProvider?: QuickDiffProvider;
//     commitTemplate?: string;
//     acceptInputCommand?: Command;
//     statusBarCommands?: Command[];
//     createResourceGroup(id: string, label: string): SourceControlResourceGroup;
//     dispose(): void;
//   }
//   export namespace scm {
//     export const inputBox: SourceControlInputBox;
//     export function createSourceControl(
//       id: string,
//       label: string,
//       rootUri?: Uri
//     ): SourceControl;
//   }
//   export interface DebugProtocolMessage {
//     // Properties: see [ProtocolMessage details](https://microsoft.github.io/debug-adapter-protocol/specification#Base_Protocol_ProtocolMessage).
//   }
//   export interface DebugProtocolSource {
//     // Properties: see [Source details](https://microsoft.github.io/debug-adapter-protocol/specification#Types_Source).
//   }
//   export interface DebugProtocolBreakpoint {
//     // Properties: see [Breakpoint details](https://microsoft.github.io/debug-adapter-protocol/specification#Types_Breakpoint).
//   }
//   export interface DebugConfiguration {
//     type: string;
//     name: string;
//     request: string;
//     [key: string]: any;
//   }
//   export interface DebugSession {
//     readonly id: string;
//     readonly type: string;
//     readonly parentSession?: DebugSession;
//     name: string;
//     readonly workspaceFolder: WorkspaceFolder | undefined;
//     readonly configuration: DebugConfiguration;
//     customRequest(command: string, args?: any): Thenable<any>;
//     getDebugProtocolBreakpoint(
//       breakpoint: Breakpoint
//     ): Thenable<DebugProtocolBreakpoint | undefined>;
//   }
//   export interface DebugSessionCustomEvent {
//     readonly session: DebugSession;
//     readonly event: string;
//     readonly body: any;
//   }
//   export interface DebugConfigurationProvider {
//     provideDebugConfigurations?(
//       folder: WorkspaceFolder | undefined,
//       token?: CancellationToken
//     ): ProviderResult<DebugConfiguration[]>;
//     resolveDebugConfiguration?(
//       folder: WorkspaceFolder | undefined,
//       debugConfiguration: DebugConfiguration,
//       token?: CancellationToken
//     ): ProviderResult<DebugConfiguration>;
//     resolveDebugConfigurationWithSubstitutedVariables?(
//       folder: WorkspaceFolder | undefined,
//       debugConfiguration: DebugConfiguration,
//       token?: CancellationToken
//     ): ProviderResult<DebugConfiguration>;
//   }
//   export class DebugAdapterExecutable {
//     constructor(
//       command: string,
//       args?: string[],
//       options?: DebugAdapterExecutableOptions
//     );
//     readonly command: string;
//     readonly args: string[];
//     readonly options?: DebugAdapterExecutableOptions;
//   }
//   export interface DebugAdapterExecutableOptions {
//     env?: { [key: string]: string };
//     cwd?: string;
//   }
//   export class DebugAdapterServer {
//     readonly port: number;
//     readonly host?: string | undefined;
//     constructor(port: number, host?: string);
//   }
//   export class DebugAdapterNamedPipeServer {
//     readonly path: string;
//     constructor(path: string);
//   }
//   export interface DebugAdapter extends Disposable {
//     readonly onDidSendMessage: Event<DebugProtocolMessage>;
//     handleMessage(message: DebugProtocolMessage): void;
//   }
//   export class DebugAdapterInlineImplementation {
//     constructor(implementation: DebugAdapter);
//   }
//   export type DebugAdapterDescriptor =
//     | DebugAdapterExecutable
//     | DebugAdapterServer
//     | DebugAdapterNamedPipeServer
//     | DebugAdapterInlineImplementation;
//   export interface DebugAdapterDescriptorFactory {
//     createDebugAdapterDescriptor(
//       session: DebugSession,
//       executable: DebugAdapterExecutable | undefined
//     ): ProviderResult<DebugAdapterDescriptor>;
//   }
//   export interface DebugAdapterTracker {
//     onWillStartSession?(): void;
//     onWillReceiveMessage?(message: any): void;
//     onDidSendMessage?(message: any): void;
//     onWillStopSession?(): void;
//     onError?(error: Error): void;
//     onExit?(code: number | undefined, signal: string | undefined): void;
//   }
//   export interface DebugAdapterTrackerFactory {
//     createDebugAdapterTracker(
//       session: DebugSession
//     ): ProviderResult<DebugAdapterTracker>;
//   }
//   export interface DebugConsole {
//     append(value: string): void;
//     appendLine(value: string): void;
//   }
//   export interface BreakpointsChangeEvent {
//     readonly added: readonly Breakpoint[];
//     readonly removed: readonly Breakpoint[];
//     readonly changed: readonly Breakpoint[];
//   }
//   export class Breakpoint {
//     readonly id: string;
//     readonly enabled: boolean;
//     readonly condition?: string | undefined;
//     readonly hitCondition?: string | undefined;
//     readonly logMessage?: string | undefined;
//     protected constructor(
//       enabled?: boolean,
//       condition?: string,
//       hitCondition?: string,
//       logMessage?: string
//     );
//   }
//   export class SourceBreakpoint extends Breakpoint {
//     readonly location: Location;
//     constructor(
//       location: Location,
//       enabled?: boolean,
//       condition?: string,
//       hitCondition?: string,
//       logMessage?: string
//     );
//   }
//   export class FunctionBreakpoint extends Breakpoint {
//     readonly functionName: string;
//     constructor(
//       functionName: string,
//       enabled?: boolean,
//       condition?: string,
//       hitCondition?: string,
//       logMessage?: string
//     );
//   }
//   export enum DebugConsoleMode {
//     Separate = 0,
//     MergeWithParent = 1,
//   }
//   export interface DebugSessionOptions {
//     parentSession?: DebugSession;
//     lifecycleManagedByParent?: boolean;
//     consoleMode?: DebugConsoleMode;
//     noDebug?: boolean;
//     compact?: boolean;
//     suppressSaveBeforeStart?: boolean;
//     suppressDebugToolbar?: boolean;
//     suppressDebugStatusbar?: boolean;
//     suppressDebugView?: boolean;
//   }
//   export enum DebugConfigurationProviderTriggerKind {
//     Initial = 1,
//     Dynamic = 2,
//   }
//   export namespace debug {
//     export let activeDebugSession: DebugSession | undefined;
//     export let activeDebugConsole: DebugConsole;
//     export let breakpoints: readonly Breakpoint[];
//     export const onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
//     export const onDidStartDebugSession: Event<DebugSession>;
//     export const onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
//     export const onDidTerminateDebugSession: Event<DebugSession>;
//     export const onDidChangeBreakpoints: Event<BreakpointsChangeEvent>;
//     export function registerDebugConfigurationProvider(
//       debugType: string,
//       provider: DebugConfigurationProvider,
//       triggerKind?: DebugConfigurationProviderTriggerKind
//     ): Disposable;
//     export function registerDebugAdapterDescriptorFactory(
//       debugType: string,
//       factory: DebugAdapterDescriptorFactory
//     ): Disposable;
//     export function registerDebugAdapterTrackerFactory(
//       debugType: string,
//       factory: DebugAdapterTrackerFactory
//     ): Disposable;
//     export function startDebugging(
//       folder: WorkspaceFolder | undefined,
//       nameOrConfiguration: string | DebugConfiguration,
//       parentSessionOrOptions?: DebugSession | DebugSessionOptions
//     ): Thenable<boolean>;
//     export function stopDebugging(session?: DebugSession): Thenable<void>;
//     export function addBreakpoints(breakpoints: readonly Breakpoint[]): void;
//     export function removeBreakpoints(breakpoints: readonly Breakpoint[]): void;
//     export function asDebugSourceUri(
//       source: DebugProtocolSource,
//       session?: DebugSession
//     ): Uri;
//   }
//   export namespace extensions {
//     export function getExtension<T = any>(
//       extensionId: string
//     ): Extension<T> | undefined;
//     export const all: readonly Extension<any>[];
//     export const onDidChange: Event<void>;
//   }
//   export enum CommentThreadCollapsibleState {
//     Collapsed = 0,
//     Expanded = 1,
//   }
//   export enum CommentMode {
//     Editing = 0,
//     Preview = 1,
//   }
//   export enum CommentThreadState {
//     Unresolved = 0,
//     Resolved = 1,
//   }
//   export interface CommentThread {
//     readonly uri: Uri;
//     range: Range;
//     comments: readonly Comment[];
//     collapsibleState: CommentThreadCollapsibleState;
//     canReply: boolean;
//     contextValue?: string;
//     label?: string;
//     state?: CommentThreadState;
//     dispose(): void;
//   }
//   export interface CommentAuthorInformation {
//     name: string;
//     iconPath?: Uri;
//   }
//   export interface CommentReaction {
//     readonly label: string;
//     readonly iconPath: string | Uri;
//     readonly count: number;
//     readonly authorHasReacted: boolean;
//   }
//   export interface Comment {
//     body: string | MarkdownString;
//     mode: CommentMode;
//     author: CommentAuthorInformation;
//     contextValue?: string;
//     reactions?: CommentReaction[];
//     label?: string;
//     timestamp?: Date;
//   }
//   export interface CommentReply {
//     thread: CommentThread;
//     text: string;
//   }
//   export interface CommentingRangeProvider {
//     provideCommentingRanges(
//       document: TextDocument,
//       token: CancellationToken
//     ): ProviderResult<Range[]>;
//   }
//   export interface CommentOptions {
//     prompt?: string;
//     placeHolder?: string;
//   }
//   export interface CommentController {
//     readonly id: string;
//     readonly label: string;
//     options?: CommentOptions;
//     commentingRangeProvider?: CommentingRangeProvider;
//     createCommentThread(
//       uri: Uri,
//       range: Range,
//       comments: readonly Comment[]
//     ): CommentThread;
//     reactionHandler?: (
//       comment: Comment,
//       reaction: CommentReaction
//     ) => Thenable<void>;
//     dispose(): void;
//   }

//   namespace comments {
//     export function createCommentController(
//       id: string,
//       label: string
//     ): CommentController;
//   }
//   export interface AuthenticationSession {
//     readonly id: string;
//     readonly accessToken: string;
//     readonly account: AuthenticationSessionAccountInformation;
//     readonly scopes: readonly string[];
//   }
//   export interface AuthenticationSessionAccountInformation {
//     readonly id: string;
//     readonly label: string;
//   }
//   export interface AuthenticationForceNewSessionOptions {
//     detail?: string;
//   }
//   export interface AuthenticationGetSessionOptions {
//     clearSessionPreference?: boolean;
//     createIfNone?: boolean;
//     forceNewSession?: boolean | AuthenticationForceNewSessionOptions;
//     silent?: boolean;
//   }
//   export interface AuthenticationProviderInformation {
//     readonly id: string;
//     readonly label: string;
//   }
//   export interface AuthenticationSessionsChangeEvent {
//     readonly provider: AuthenticationProviderInformation;
//   }
//   export interface AuthenticationProviderOptions {
//     readonly supportsMultipleAccounts?: boolean;
//   }
//   export interface AuthenticationProviderAuthenticationSessionsChangeEvent {
//     readonly added: readonly AuthenticationSession[] | undefined;
//     readonly removed: readonly AuthenticationSession[] | undefined;
//     readonly changed: readonly AuthenticationSession[] | undefined;
//   }
//   export interface AuthenticationProvider {
//     readonly onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent>;
//     getSessions(
//       scopes?: readonly string[]
//     ): Thenable<readonly AuthenticationSession[]>;
//     createSession(scopes: readonly string[]): Thenable<AuthenticationSession>;
//     removeSession(sessionId: string): Thenable<void>;
//   }
//   export namespace authentication {
//     export function getSession(
//       providerId: string,
//       scopes: readonly string[],
//       options: AuthenticationGetSessionOptions & { /** */ createIfNone: true }
//     ): Thenable<AuthenticationSession>;
//     export function getSession(
//       providerId: string,
//       scopes: readonly string[],
//       options: AuthenticationGetSessionOptions & {
//         /** literal-type defines return type */ forceNewSession:
//           | true
//           | AuthenticationForceNewSessionOptions;
//       }
//     ): Thenable<AuthenticationSession>;
//     export function getSession(
//       providerId: string,
//       scopes: readonly string[],
//       options?: AuthenticationGetSessionOptions
//     ): Thenable<AuthenticationSession | undefined>;
//     export const onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;
//     export function registerAuthenticationProvider(
//       id: string,
//       label: string,
//       provider: AuthenticationProvider,
//       options?: AuthenticationProviderOptions
//     ): Disposable;
//   }
//   export namespace l10n {
//     export function t(
//       message: string,
//       ...args: Array<string | number | boolean>
//     ): string;
//     export function t(message: string, args: Record<string, any>): string;
//     export function t(options: {
//       message: string;
//       args?: Array<string | number | boolean> | Record<string, any>;
//       comment: string | string[];
//     }): string;
//     export const bundle: { [key: string]: string } | undefined;
//     export const uri: Uri | undefined;
//   }
//   export namespace tests {
//     export function createTestController(
//       id: string,
//       label: string
//     ): TestController;
//   }
//   export enum TestRunProfileKind {
//     Run = 1,
//     Debug = 2,
//     Coverage = 3,
//   }
//   export class TestTag {
//     readonly id: string;
//     constructor(id: string);
//   }
//   export interface TestRunProfile {
//     label: string;
//     readonly kind: TestRunProfileKind;
//     isDefault: boolean;
//     onDidChangeDefault: Event<boolean>;
//     supportsContinuousRun: boolean;
//     tag: TestTag | undefined;
//     configureHandler: (() => void) | undefined;
//     runHandler: (
//       request: TestRunRequest,
//       token: CancellationToken
//     ) => Thenable<void> | void;
//     dispose(): void;
//   }
//   export interface TestController {
//     readonly id: string;
//     label: string;
//     readonly items: TestItemCollection;
//     createRunProfile(
//       label: string,
//       kind: TestRunProfileKind,
//       runHandler: (
//         request: TestRunRequest,
//         token: CancellationToken
//       ) => Thenable<void> | void,
//       isDefault?: boolean,
//       tag?: TestTag,
//       supportsContinuousRun?: boolean
//     ): TestRunProfile;
//     resolveHandler?: (item: TestItem | undefined) => Thenable<void> | void;
//     refreshHandler:
//       | ((token: CancellationToken) => Thenable<void> | void)
//       | undefined;
//     createTestRun(
//       request: TestRunRequest,
//       name?: string,
//       persist?: boolean
//     ): TestRun;
//     createTestItem(id: string, label: string, uri?: Uri): TestItem;
//     invalidateTestResults(items?: TestItem | readonly TestItem[]): void;
//     dispose(): void;
//   }
//   export class TestRunRequest {
//     readonly include: readonly TestItem[] | undefined;
//     readonly exclude: readonly TestItem[] | undefined;
//     readonly profile: TestRunProfile | undefined;
//     readonly continuous?: boolean;
//     constructor(
//       include?: readonly TestItem[],
//       exclude?: readonly TestItem[],
//       profile?: TestRunProfile,
//       continuous?: boolean
//     );
//   }
//   export interface TestRun {
//     readonly name: string | undefined;
//     readonly token: CancellationToken;
//     readonly isPersisted: boolean;
//     enqueued(test: TestItem): void;
//     started(test: TestItem): void;
//     skipped(test: TestItem): void;
//     failed(
//       test: TestItem,
//       message: TestMessage | readonly TestMessage[],
//       duration?: number
//     ): void;
//     errored(
//       test: TestItem,
//       message: TestMessage | readonly TestMessage[],
//       duration?: number
//     ): void;
//     passed(test: TestItem, duration?: number): void;
//     appendOutput(output: string, location?: Location, test?: TestItem): void;
//     end(): void;
//   }
//   export interface TestItemCollection
//     extends Iterable<[id: string, testItem: TestItem]> {
//     readonly size: number;
//     replace(items: readonly TestItem[]): void;
//     forEach(
//       callback: (item: TestItem, collection: TestItemCollection) => unknown,
//       thisArg?: any
//     ): void;
//     add(item: TestItem): void;
//     delete(itemId: string): void;
//     get(itemId: string): TestItem | undefined;
//   }
//   export interface TestItem {
//     readonly id: string;
//     readonly uri: Uri | undefined;
//     readonly children: TestItemCollection;
//     readonly parent: TestItem | undefined;
//     tags: readonly TestTag[];
//     canResolveChildren: boolean;
//     busy: boolean;
//     label: string;
//     description?: string;
//     sortText?: string | undefined;
//     range: Range | undefined;
//     error: string | MarkdownString | undefined;
//   }
//   export class TestMessage {
//     message: string | MarkdownString;
//     expectedOutput?: string;
//     actualOutput?: string;
//     location?: Location;
//     contextValue?: string;
//     static diff(
//       message: string | MarkdownString,
//       expected: string,
//       actual: string
//     ): TestMessage;
//     constructor(message: string | MarkdownString);
//   }
//   export class TabInputText {
//     readonly uri: Uri;
//     constructor(uri: Uri);
//   }
//   export class TabInputTextDiff {
//     readonly original: Uri;
//     readonly modified: Uri;
//     constructor(original: Uri, modified: Uri);
//   }
//   export class TabInputCustom {
//     readonly uri: Uri;
//     readonly viewType: string;
//     constructor(uri: Uri, viewType: string);
//   }
//   export class TabInputWebview {
//     readonly viewType: string;
//     constructor(viewType: string);
//   }
//   export class TabInputNotebook {
//     readonly uri: Uri;
//     readonly notebookType: string;
//     constructor(uri: Uri, notebookType: string);
//   }
//   export class TabInputNotebookDiff {
//     readonly original: Uri;
//     readonly modified: Uri;
//     readonly notebookType: string;
//     constructor(original: Uri, modified: Uri, notebookType: string);
//   }
//   export class TabInputTerminal {
//     constructor();
//   }
//   export interface Tab {
//     readonly label: string;
//     readonly group: TabGroup;
//     readonly input:
//       | TabInputText
//       | TabInputTextDiff
//       | TabInputCustom
//       | TabInputWebview
//       | TabInputNotebook
//       | TabInputNotebookDiff
//       | TabInputTerminal
//       | unknown;
//     readonly isActive: boolean;
//     readonly isDirty: boolean;
//     readonly isPinned: boolean;
//     readonly isPreview: boolean;
//   }
//   export interface TabChangeEvent {
//     readonly opened: readonly Tab[];
//     readonly closed: readonly Tab[];
//     readonly changed: readonly Tab[];
//   }
//   export interface TabGroupChangeEvent {
//     readonly opened: readonly TabGroup[];
//     readonly closed: readonly TabGroup[];
//     readonly changed: readonly TabGroup[];
//   }
//   export interface TabGroup {
//     readonly isActive: boolean;
//     readonly viewColumn: ViewColumn;
//     readonly activeTab: Tab | undefined;
//     readonly tabs: readonly Tab[];
//   }
//   export interface TabGroups {
//     readonly all: readonly TabGroup[];
//     readonly activeTabGroup: TabGroup;
//     readonly onDidChangeTabGroups: Event<TabGroupChangeEvent>;
//     readonly onDidChangeTabs: Event<TabChangeEvent>;
//     close(
//       tab: Tab | readonly Tab[],
//       preserveFocus?: boolean
//     ): Thenable<boolean>;
//     close(
//       tabGroup: TabGroup | readonly TabGroup[],
//       preserveFocus?: boolean
//     ): Thenable<boolean>;
//   }
//   export class TelemetryTrustedValue<T = any> {
//     readonly value: T;
//     constructor(value: T);
//   }
//   export interface TelemetryLogger {
//     readonly onDidChangeEnableStates: Event<TelemetryLogger>;
//     readonly isUsageEnabled: boolean;
//     readonly isErrorsEnabled: boolean;
//     logUsage(
//       eventName: string,
//       data?: Record<string, any | TelemetryTrustedValue>
//     ): void;
//     logError(
//       eventName: string,
//       data?: Record<string, any | TelemetryTrustedValue>
//     ): void;
//     logError(
//       error: Error,
//       data?: Record<string, any | TelemetryTrustedValue>
//     ): void;
//     dispose(): void;
//   }
//   export interface TelemetrySender {
//     sendEventData(eventName: string, data?: Record<string, any>): void;
//     sendErrorData(error: Error, data?: Record<string, any>): void;
//     flush?(): void | Thenable<void>;
//   }
//   export interface TelemetryLoggerOptions {
//     readonly ignoreBuiltInCommonProperties?: boolean;
//     readonly ignoreUnhandledErrors?: boolean;
//     readonly additionalCommonProperties?: Record<string, any>;
//   }
// }
// interface Thenable<T> extends PromiseLike<T> {}

export const commands = {
  registerCommand: () => {},
};

export const window = {
  showInformationMessage: () => {},
};
