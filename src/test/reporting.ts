export interface TestResults {
  reqName: string;
  reqValue: unknown;
  failure: string | null;
}
export type TestReport = {
  name: string;
  failed: boolean;
  dot: { snapshot: string; current: string };
  svg: { snapshot: string; current: string };
  code: string;
  results: TestResults[];
};
