import { Props, ReactElement } from "shared/ReactTypes"
import { FiberNode, createFiberFromElement, createWorkInProgress } from "./fiber"
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import { HostText } from "./workTags"
import { ChildDeletion, Placement } from "./fiberFlags"

function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return
    }
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }
  // 根据element 创建 fiber
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement
  ) {
    const key = element.key
    if (currentFiber !== null) {
      // update
      // key 是否相同
      if (currentFiber.key === key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            // type 相同 可以复用
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            return existing
          }
          // type 不相同  删除旧节点    （key 都为null 也满足key相同）
          deleteChild(returnFiber, currentFiber)
        } else {
          console.log("还未实现的react类型", element)
        }
      } else {
        // key 不相同  删掉旧节点
        deleteChild(returnFiber, currentFiber)
      }
    }
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
    if (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        // 类型没变 可以复用
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currentFiber)
    }
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
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild)
          )
        default:
          console.log("未实现的reconcile类型", newChild)
          break
      }
    }
    // 多节点情况

    // HostText
    if (typeof newChild === "string" || typeof newChild === "number") {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild)
      )
    }

    console.log("未实现的reconcile类型", newChild)
    return null
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true) // 追踪副作用
export const mountChildFibers = ChildReconciler(false) // 不追踪副作用
