import { Container } from "hostConfig"
import { Props } from "shared/ReactTypes"

export const elementPropsKey = "__props"
const validEventTypeList = ["click"]

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

interface SyntheticEvent extends Event {
  __stopPropagation: boolean
}

type EventCallback = (e: Event) => void

interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}

export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.log("当前不支持该事件", eventType)
  }
  console.log("初始化事件", eventType)
  container.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e)
  })
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target
  if (targetElement === null) {
    console.log("事件不存在target", e)
    return
  }
  // 1. 收集沿途的事件
  const { capture, bubble } = collectPaths(
    targetElement as DOMElement,
    container,
    eventType
  )
  // 2. 构造合成事件
  const se = createSyntheticEvent(e)
  // 3. 遍历 capture
  triggerEventFlow(capture, se)
  if (!se.__stopPropagation) {
    // 4. 遍历 bubble
    triggerEventFlow(bubble, se)
  }
}

function getEventCallbackNameFromEventType(
  eventType: string
): string[] | undefined {
  return {
    click: ["onClickCapture", "onClick"],
  }[eventType]
}

function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string
) {
  const paths: Paths = {
    capture: [],
    bubble: [],
  }

  while (targetElement && targetElement !== container) {
    const elementProps = targetElement[elementPropsKey]
    if (elementProps) {
      const callbackNameList = getEventCallbackNameFromEventType(eventType)
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              // capture
              paths.capture.unshift(eventCallback)
            }
            if (i === 1) {
              // bubble
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    targetElement = targetElement.parentNode as DOMElement
  }

  return paths
}

function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent

  syntheticEvent.__stopPropagation = false
  const originStopPropagation = e.stopPropagation

  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true
    if (originStopPropagation) {
      originStopPropagation()
    }
  }

  return syntheticEvent
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  for (let i = 0; i < paths.length; ++i) {
    const callback = paths[i]
    callback.call(null, se)

    if (se.__stopPropagation) {
      break
    }
  }
}
