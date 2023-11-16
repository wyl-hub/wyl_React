import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from "hostConfig"
import { FiberNode, FiberRootNode } from "./fiber"
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from "./fiberFlags"
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode) => {
  console.log("commitMutationEffects", finishedWork)
  nextEffect = finishedWork
  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child
    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child
    } else {
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break up
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags

  // Placement
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  // Update
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  // ChildDeletion
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete)
      })
    }
    commitUpdate(finishedWork)
    finishedWork.flags &= ~ChildDeletion
  }
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode
) {
  let lastOne = childrenToDelete[childrenToDelete.length - 1]
  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    let node = lastOne.sibling
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber)
      }
      node = node.sibling
    }
  }
}

// 删除fiber节点
function commitDeletion(childToDelete: FiberNode) {
  const rootChildrenToDelete: FiberNode[] = []

  // 递归子树
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        // 解绑ref
        return
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      case FunctionComponent:
        // useEffect unmount
        return
      default:
        console.log("未处理的unmount类型", unmountFiber)
    }
  })
  // 移除 rootHostNode 的 DOM
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent)
      })
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) {
  let node = root
  while (true) {
    onCommitUnmount(node)

    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === root) return

    // 向上归
    while (node.sibling === null) {
      if (node.return === null || node.return === root) return
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

// 插入操作
const commitPlacement = (finishedWork: FiberNode) => {
  console.log("执行 Placement")
  // 获取该fiber节点的
  const hostParent = getHostParent(finishedWork)
  const hostSibling = getHostSibling(finishedWork)
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      hostSibling
    )
  }
}

// 例子: 将App 插入到 div 之前  所以需要找到div DOM
// <App /> =   <p></p>
// <div>
//   <App />
//   <div></div>
// </div>

function getHostSibling(fiber: FiberNode) {
  let node = fiber
  findSibling: while (true) {
    while (node.sibling === null) {
      const parent = node.return
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        return null
      }
      node = parent
    }
    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历
      // 跳过不稳定节点
      if ((node.flags & Placement) !== NoFlags) continue findSibling

      if (node.child === null) {
        continue findSibling
      } else {
        node.child.return = node
        node = node.child
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
  }
}

// 获取父级DOM类型的fiber
function getHostParent(fiber: FiberNode) {
  let parent = fiber.return
  while (parent) {
    const parentTag = parent.tag
    if (parentTag === HostComponent) {
      return parent.stateNode
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }

  console.log("没有找到父级DOM fiber", fiber)
  return null
}

function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
