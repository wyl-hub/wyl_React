import { ReactElement } from "shared/ReactTypes";
import { createRoot } from "./src/root";

export function renderIntoDocument(element: ReactElement) {
  const div = document.createElement('div')
  return createRoot(div).render(element)
}