import { createInstance, createTextInstance } from "hostConfig"
import { FiberNode } from "./fiber"
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags"
import { NoFlags, Update } from "./fiberFlags"
import { updateFiberProps } from "react-dom/src/SyntheticEvent"

function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update
}

// 构建离屏 DOM树
export function completeWork(wip: FiberNode) {
  console.log('complete work')
  const newProps = wip.pendingProps
  const current = wip.alternate
  switch (wip.tag) {
    case HostComponent: {
      // update
      if (current !== null && wip.stateNode) {
        // 1. props 是否变化
        updateFiberProps(wip.stateNode, newProps)
      } else {
        // mount
        // 1. 构建DOM
        const instance = createInstance(wip.type, newProps)
        // 2. 将DOM插入DOM树中
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      bubbbleProperties(wip)
      return null
    }
    case HostText: {
      // update
      if (current !== null && wip.stateNode) {
        const oldText = current.memoizedProps.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(wip)
        }
      } else {
        // mount
        // 1. 创建文本DOM
        const instance = createTextInstance(newProps.content)
        wip.stateNode = instance
      }
      bubbbleProperties(wip)
      return null
    }
    case HostRoot:
      bubbbleProperties(wip)
      return null
    case FunctionComponent: {
      bubbbleProperties(wip)
      return null
    }
    default:
      console.log("未处理的completeWork 类型", wip)
      break
  }
}

function appendAllChildren(instance: Element, wip: FiberNode) {
  let node = wip.child

  while (node !== null) {
    // 从wipfiber 向 子fiber查找 找到第一个 DOM类型的fiber 插入到当前fiber DOM节点下
    if (node.tag === HostComponent || node.tag === HostText) {
      instance.appendChild(node.stateNode)
      // 插入DOM
    } else if (node.child !== null) {
      // 继续向下查找
      node.child.return = node
      node = node.child
      continue
    }

    if (node === wip) return
    // 代表 wip 的大儿子 DOM 成功插入  现在找他的剩余儿子
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) return
      // 大儿子和其他儿子的fiber不一定在同一层
      // <div>                A = <div></div>
      //   <A />
      //   <p></p>
      // </div>

      // 例如  大儿子的 fiber 为  组件A fiber 的 child   所以 node.sibling === null
      // 于是 向上回溯 找到 A 的 fiber 时  Afiber.sibling  ===  pfiber
      // 找sibling的这一套操作 会将 wip 的 大儿子 到 wip  fiber 之间的所有 子节点 全部插入到 wip DOM 下(包括大儿子的sibling)

      // <div>                A = <div></div>
      //   <A />
      //   <B />              B = <div></div>
      // </div>

      node = node?.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function bubbbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags
  let child = wip.child
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = wip
    child = child.sibling
  }

  wip.subtreeFlags = subtreeFlags
}