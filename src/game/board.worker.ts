/// <reference lib="webworker" />
import { activeAssets } from "./content";
import { generateBoard, type GenerationOptions } from "./boardGenerator";
self.onmessage = (
  event: MessageEvent<
    GenerationOptions | { requestId: number; options: GenerationOptions }
  >,
) => {
  const requestId =
    "requestId" in event.data ? event.data.requestId : undefined;
  const options = "options" in event.data ? event.data.options : event.data;
  try {
    self.postMessage({
      requestId,
      board: generateBoard(activeAssets, options),
    });
  } catch (e) {
    self.postMessage({ requestId, error: (e as Error).message });
  }
};
