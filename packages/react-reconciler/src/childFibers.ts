import { ReactElement } from "shared/ReactTypes"
import { FiberNode, createFiberFromElement } from "./fiber"
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import { HostText } from "./workTags"
import { Placement } from "./fiberFlags"

function ChildReconciler(shouldTrackEffects: boolean) {
  // 根据element 创建 fiber
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement
  ) {
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  // 创建文本fiber
  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number
  ) {
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    // fiber 没有 alternate  代表该fiber是首次创建
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }


  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElement
  ) {
    // 判断当前fiber的类型
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))
        default:
          console.log("未实现的reconcile类型", newChild)
          break
      }
    }
    // 多节点情况

    // HostText
    if (typeof newChild === "string" || typeof newChild === "number") {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild))
    }

    console.log("未实现的reconcile类型", newChild)
    return null
  }
}

export const reconcileChildFibers = ChildReconciler(true) // 追踪副作用
export const mountChildFibers = ChildReconciler(false) // 不追踪副作用
