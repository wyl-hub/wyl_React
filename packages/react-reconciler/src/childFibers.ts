import { Props, ReactElement } from "shared/ReactTypes"
import {
  FiberNode,
  createFiberFromElement,
  createWorkInProgress,
} from "./fiber"
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import { HostText } from "./workTags"
import { ChildDeletion, Placement } from "./fiberFlags"

type ExistingChildren = Map<string | number, FiberNode>

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
  // 将该节点及其兄弟节点都标记删除
  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null
  ) {
    if (!shouldTrackEffects) {
      return
    }
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }
  // 单节点 diff   旧fiber 与 新 children(ReactElement) 的比较
  // 新chidren为 单节点
  // 根据React element 创建 fiber
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: ReactElement
  ) {
    const key = element.key
    let child = currentFirstChild
    while (child !== null) {
      // update
      // key 是否相同 如果key相同 后续节点就不需要比较了
      // *** key type 相同  复用    key相同 type不相同 则都不能复用 ***
      if (child.key === key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (child.type === element.type) {
            // type 相同 可以复用
            const existing = useFiber(child, element.props)
            existing.return = returnFiber
            // 标记剩下节点删除
            deleteRemainingChildren(returnFiber, child.sibling)
            return existing
          }
          // key 相同 type 不同 没有可复用节点 删除所有旧节点
          deleteRemainingChildren(returnFiber, child)
        } else {
          console.log("还未实现的react类型", element)
        }
        break
      } else {
        // key 不同  删掉该旧节点（继续遍历sibling 找到是否有key相同且可复用的旧节点）
        deleteChild(returnFiber, child)
        child = child.sibling
      }
    }
    // 不能复用 创建新的fiber
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  // 创建文本fiber
  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    content: string | number
  ) {
    let child = currentFirstChild
    while (child !== null) {
      // update
      if (child.tag === HostText) {
        // 类型没变 可以复用
        const existing = useFiber(child, { content })
        existing.return = returnFiber
        deleteRemainingChildren(returnFiber, child.sibling)
        return existing
      }
      deleteChild(returnFiber, child)
      child = child.sibling
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

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[]
  ) {
    // 最后一个可复用fiber在current中的index
    let lastPlacedIndex: number = 0
    // 创建的最后一个fiber
    let lastNewFiber: FiberNode | null = null
    // 创建的第一个fiber
    let firstNewFiber: FiberNode | null = null

    // 1. 将 current 保存在 map 中
    const existingChildren: ExistingChildren = new Map()
    let child = currentFirstChild
    while (child !== null) {
      const keyToUse = child.key !== null ? child.key : child.index
      existingChildren.set(keyToUse, child)
      child = child.sibling
    }

    for (let i = 0; i < newChild.length; ++i) {
      const after = newChild[i]
      // 2. 遍历 newchild 寻找是否可复用
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after)
      // ->  false null
      if (newFiber === null) continue
      // 3. 标记移动还是插入
      newFiber.index = i
      newFiber.return = returnFiber

      if (lastNewFiber === null) {
        lastNewFiber = newFiber
        firstNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }

      if (!shouldTrackEffects) continue
      // lastPlacedIndex 记录 old fiber 中 索引最大的
      // 新的 child 复用的旧fiber如果索引小于这个值 则移动 （从原先的前面移动到后面）
      // 新的 child 没有可复用的fiber  则直接 插入 placement 新 fiber

      // 所以 如果 A B C D   ->   D A B C  (即使 ABC 顺序与之前一样   也只有D不动 A B C 都需要移动到后面)


      // A B C D   ->   B D E C A 
      // lastPlacedIndex = 0
      // 1. B oldIndex = 1  1 > 0   = 1
      // 2. D oldIndex = 3  3 > 1   = 3
      // 3. E mount  placement
      // 4. C oldIndex = 2  2 < 3  placement
      // 5. A oldIndex = 0  0 < 3  placement
      const current = newFiber.alternate
      // 复用fiber
      if (current !== null) {
        const oldIndex = current.index
        if (oldIndex < lastPlacedIndex) {
          newFiber.flags |= Placement
          continue
        } else {
          lastPlacedIndex = oldIndex
        }
      } else {
        // mount
        newFiber.flags |= Placement
      }
    }

    // 4. 将 map 中剩下的标记删除(剩下的代表不能复用的旧fiber)
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber)
    })

    return firstNewFiber
  }

  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    const keyToUse = element.key !== null ? element.key : index
    const before = existingChildren.get(keyToUse)

    // HostText
    if (typeof element === "string" || typeof element === "number") {
      if (before) {
        if (before.tag === HostText) {
          existingChildren.delete(keyToUse)
          return useFiber(before, { content: element + "" })
        }
      }
      return new FiberNode(HostText, { content: element + "" }, null)
    }

    // ReactElement
    if (typeof element === "object" && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before) {
            if (before.type === element.type) {
              existingChildren.delete(keyToUse)
              return useFiber(before, element.props)
            }
          }
          return createFiberFromElement(element)
      }

      // 数组类型
      if (Array.isArray(element)) {
        console.log('数组类型还未实现')
      }
    }
    return null
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
      // 多节点情况
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
    }

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
