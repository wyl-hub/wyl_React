import { Props, Key, Ref } from "shared/ReactTypes"
import { workTag } from "./workTags"
import { Flags, NoFlags } from "./fiberFlags"
export class FiberNode {
  type: any
  tag: workTag
  pendingProps: Props
  key: Key
  ref: Ref
  stateNode: any
  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number
  memoizedProps: Props | null
  alternate: FiberNode | null
  flags: Flags

  constructor(tag: workTag, pendingProps: Props, key: Key) {
    this.tag = tag
    this.key = key
    this.stateNode = null
    this.type = null
    // 构建树状结构
    this.return = null
    this.sibling = null
    this.child = null
    this.index = 0

    this.ref = null

    // 工作单元
    this.pendingProps = pendingProps
    this.memoizedProps = null

    this.alternate = null
    // 副作用
    this.flags = NoFlags
  }
}
