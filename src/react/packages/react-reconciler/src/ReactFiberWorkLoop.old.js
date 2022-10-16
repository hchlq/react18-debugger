/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
    warnAboutDeprecatedLifecycles,
    replayFailedUnitOfWorkWithInvokeGuardedCallback,
    enableCreateEventHandleAPI,
    enableProfilerTimer,
    enableProfilerCommitHooks,
    enableProfilerNestedUpdatePhase,
    enableProfilerNestedUpdateScheduledHook,
    deferRenderPhaseUpdateToNextBatch,
    enableDebugTracing,
    enableSchedulingProfiler,
    disableSchedulerTimeoutInWorkLoop,
    enableStrictEffects,
    skipUnmountedBoundaries,
    enableUpdaterTracking,
    enableCache,
    enableTransitionTracing,
} from '../../shared/ReactFeatureFlags';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import is from 'shared/objectIs';

import {
    // Aliased because `act` will override and push to an internal queue
    scheduleCallback as Scheduler_scheduleCallback,
    cancelCallback as Scheduler_cancelCallback,
    shouldYield,
    requestPaint,
    now,
    ImmediatePriority as ImmediateSchedulerPriority,
    UserBlockingPriority as UserBlockingSchedulerPriority,
    NormalPriority as NormalSchedulerPriority,
    IdlePriority as IdleSchedulerPriority,
} from './Scheduler';
import {
    flushSyncCallbacks, flushSyncCallbacksOnlyInLegacyMode, scheduleSyncCallback, scheduleLegacySyncCallback,
} from './ReactFiberSyncTaskQueue.old';
import {
    logCommitStarted,
    logCommitStopped,
    logLayoutEffectsStarted,
    logLayoutEffectsStopped,
    logPassiveEffectsStarted,
    logPassiveEffectsStopped,
    logRenderStarted,
    logRenderStopped,
} from './DebugTracing';

import {
    resetAfterCommit,
    scheduleTimeout,
    cancelTimeout,
    noTimeout,
    afterActiveInstanceBlur,
    getCurrentEventPriority,
    errorHydratingContainer,
    scheduleMicrotask,
} from './ReactFiberHostConfig';

import {
    createWorkInProgress, assignFiberPropertiesInDEV,
} from './ReactFiber.old';
import {isRootDehydrated} from './ReactFiberShellHydration';
import {didSuspendOrErrorWhileHydratingDEV} from './ReactFiberHydrationContext.old';
import {NoMode, ProfileMode, ConcurrentMode} from './ReactTypeOfMode';
import {
    HostRoot,
    IndeterminateComponent,
    ClassComponent,
    SuspenseComponent,
    SuspenseListComponent,
    FunctionComponent,
    ForwardRef,
    MemoComponent,
    SimpleMemoComponent,
    Profiler,
} from './ReactWorkTags';
import {LegacyRoot} from './ReactRootTags';
import {
    NoFlags,
    Incomplete,
    StoreConsistency,
    HostEffectMask,
    ForceClientRender,
    BeforeMutationMask,
    MutationMask,
    LayoutMask,
    PassiveMask,
    MountPassiveDev,
    MountLayoutDev,
} from './ReactFiberFlags';
import {
    NoLanes,
    NoLane,
    SyncLane,
    NoTimestamp,
    claimNextTransitionLane,
    claimNextRetryLane,
    includesSomeLane,
    isSubsetOfLanes,
    mergeLanes,
    removeLanes,
    pickArbitraryLane,
    includesNonIdleWork,
    includesOnlyRetries,
    includesOnlyTransitions,
    includesBlockingLane,
    includesExpiredLane,
    getNextLanes,
    markStarvedLanesAsExpired,
    getLanesToRetrySynchronouslyOnError,
    getMostRecentEventTime,
    markRootUpdated,
    markRootSuspended as markRootSuspended_dontCallThisOneDirectly,
    markRootPinged,
    markRootEntangled,
    markRootFinished,
    getHighestPriorityLane,
    addFiberToLanesMap,
    movePendingFibersToMemoized,
    addTransitionToLanesMap,
    getTransitionsForLanes,
} from './ReactFiberLane.old';
import {
    DiscreteEventPriority,
    ContinuousEventPriority,
    DefaultEventPriority,
    IdleEventPriority,
    getCurrentUpdatePriority,
    setCurrentUpdatePriority,
    lowerEventPriority,
    lanesToEventPriority,
} from './ReactEventPriorities.old';
import {requestCurrentTransition, NoTransition} from './ReactFiberTransition';
import {beginWork as originalBeginWork} from './ReactFiberBeginWork.old';
import {completeWork} from './ReactFiberCompleteWork.old';
import {unwindWork, unwindInterruptedWork} from './ReactFiberUnwindWork.old';
import {
    throwException, createRootErrorUpdate, createClassErrorUpdate,
} from './ReactFiberThrow.old';
import {
    commitBeforeMutationEffects,
    commitLayoutEffects,
    commitMutationEffects,
    commitPassiveEffectDurations,
    commitPassiveMountEffects,
    commitPassiveUnmountEffects,
    invokeLayoutEffectMountInDEV,
    invokePassiveEffectMountInDEV,
    invokeLayoutEffectUnmountInDEV,
    invokePassiveEffectUnmountInDEV,
    reportUncaughtErrorInDEV,
} from './ReactFiberCommitWork.old';
import {enqueueUpdate} from './ReactFiberClassUpdateQueue.old';
import {resetContextDependencies} from './ReactFiberNewContext.old';
import {
    resetHooksAfterThrow, ContextOnlyDispatcher, getIsUpdatingOpaqueValueInRenderPhaseInDEV,
} from './ReactFiberHooks.old';
import {createCapturedValueAtFiber} from './ReactCapturedValue';
import {
    push as pushToStack, pop as popFromStack, createCursor,
} from './ReactFiberStack.old';
import {
    enqueueConcurrentRenderForLane, finishQueueingConcurrentUpdates, getConcurrentlyUpdatedLanes,
} from './ReactFiberConcurrentUpdates.old';

import {
    markNestedUpdateScheduled,
    recordCommitTime,
    resetNestedUpdateFlag,
    startProfilerTimer,
    stopProfilerTimerIfRunningAndRecordDelta,
    syncNestedUpdateFlag,
} from './ReactProfilerTimer.old';

// DEV stuff
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import ReactStrictModeWarnings from './ReactStrictModeWarnings.old';
import {
    isRendering as ReactCurrentDebugFiberIsRenderingInDEV,
    current as ReactCurrentFiberCurrent,
    resetCurrentFiber as resetCurrentDebugFiberInDEV,
    setCurrentFiber as setCurrentDebugFiberInDEV,
} from './ReactCurrentFiber';
import {
    invokeGuardedCallback, hasCaughtError, clearCaughtError,
} from 'shared/ReactErrorUtils';
import {
    isDevToolsPresent,
    markCommitStarted,
    markCommitStopped,
    markComponentRenderStopped,
    markComponentSuspended,
    markComponentErrored,
    markLayoutEffectsStarted,
    markLayoutEffectsStopped,
    markPassiveEffectsStarted,
    markPassiveEffectsStopped,
    markRenderStarted,
    markRenderYielded,
    markRenderStopped,
    onCommitRoot as onCommitRootDevTools,
    onPostCommitRoot as onPostCommitRootDevTools,
} from './ReactFiberDevToolsHook.old';
import {onCommitRoot as onCommitRootTestSelector} from './ReactTestSelectors';
import {releaseCache} from './ReactFiberCacheComponent.old';
import {
    isLegacyActEnvironment, isConcurrentActEnvironment,
} from './ReactFiberAct.old';
import {processTransitionCallbacks} from './ReactFiberTracingMarkerComponent.old';

const ceil = Math.ceil;

const {
    ReactCurrentDispatcher, ReactCurrentOwner, ReactCurrentBatchConfig, ReactCurrentActQueue,
} = ReactSharedInternals;

export const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
const CommitContext = /*                */ 0b100;

// 根状态
const RootInProgress = 0; // 进行中
const RootFatalErrored = 1; // 致命的错误
const RootErrored = 2; // 错误
const RootSuspended = 3; // 挂起
const RootSuspendedWithDelay = 4; // 延迟挂起
const RootCompleted = 5; // 完成
const RootDidNotComplete = 6; // 没有完成

// Describes where we are in the React execution stack
let executionContext = NoContext;
// The root we're working on
let workInProgressRoot = null;
// The fiber we're working on
let workInProgress = null;
// The lanes we're rendering
let workInProgressRootRenderLanes = NoLanes;

// Stack that allows components to change the render lanes for its subtree
// This is a superset of the lanes we started working on at the root. The only
// case where it's different from `workInProgressRootRenderLanes` is when we
// enter a subtree that is hidden and needs to be unhidden: Suspense and
// Offscreen component.
//
// Most things in the work loop should deal with workInProgressRootRenderLanes.
// Most things in begin/complete phases should deal with subtreeRenderLanes.
export let subtreeRenderLanes = NoLanes;
const subtreeRenderLanesCursor = createCursor(NoLanes);

// Whether to root completed, errored, suspended, etc.
let workInProgressRootExitStatus = RootInProgress;
// A fatal error, if one is thrown
let workInProgressRootFatalError = null;
// "Included" lanes refer to lanes that were worked on during this render. It's
// slightly different than `renderLanes` because `renderLanes` can change as you
// enter and exit an Offscreen tree. This value is the combination of all render
// lanes for the entire render phase.
let workInProgressRootIncludedLanes = NoLanes;
// The work left over by components that were visited during this render. Only
// includes unprocessed updates, not work in bailed out children.
let workInProgressRootSkippedLanes = NoLanes;
// Lanes that were updated (in an interleaved event) during this render.
let workInProgressRootInterleavedUpdatedLanes = NoLanes;
// Lanes that were updated during the render phase (*not* an interleaved event).
let workInProgressRootRenderPhaseUpdatedLanes = NoLanes;
// Lanes that were pinged (in an interleaved event) during this render.
let workInProgressRootPingedLanes = NoLanes;
// Errors that are thrown during the render phase.
let workInProgressRootConcurrentErrors = null;
// These are errors that we recovered from without surfacing them to the UI.
// We will log them once the tree commits.
let workInProgressRootRecoverableErrors = null;

// The most recent time we committed a fallback. This lets us ensure a train
// model where we don't commit new loading states in too quick succession.
let globalMostRecentFallbackTime = 0;
const FALLBACK_THROTTLE_MS = 500;

// The absolute time for when we should start giving up on rendering
// more and prefer CPU suspense heuristics instead.
let workInProgressRootRenderTargetTime = Infinity;
// How long a render is supposed to take before we start following CPU
// suspense heuristics and opt out of rendering more content.
const RENDER_TIMEOUT_MS = 500;

let workInProgressTransitions = null;

export function getWorkInProgressTransitions() {
    return workInProgressTransitions;
}

let currentPendingTransitionCallbacks = null;

export function addTransitionStartCallbackToPendingTransition(transition) {
    if (enableTransitionTracing) {
        if (currentPendingTransitionCallbacks === null) {
            currentPendingTransitionCallbacks = {
                transitionStart: [], transitionComplete: null, markerComplete: null,
            };
        }

        if (currentPendingTransitionCallbacks.transitionStart === null) {
            currentPendingTransitionCallbacks.transitionStart = [];
        }

        currentPendingTransitionCallbacks.transitionStart.push(transition);
    }
}

export function addMarkerCompleteCallbackToPendingTransition(transition) {
    if (enableTransitionTracing) {
        if (currentPendingTransitionCallbacks === null) {
            currentPendingTransitionCallbacks = {
                transitionStart: null, transitionComplete: null, markerComplete: [],
            };
        }

        if (currentPendingTransitionCallbacks.markerComplete === null) {
            currentPendingTransitionCallbacks.markerComplete = [];
        }

        currentPendingTransitionCallbacks.markerComplete.push(transition);
    }
}

export function addTransitionCompleteCallbackToPendingTransition(transition) {
    if (enableTransitionTracing) {
        if (currentPendingTransitionCallbacks === null) {
            currentPendingTransitionCallbacks = {
                transitionStart: null, transitionComplete: [], markerComplete: null,
            };
        }

        if (currentPendingTransitionCallbacks.transitionComplete === null) {
            currentPendingTransitionCallbacks.transitionComplete = [];
        }

        currentPendingTransitionCallbacks.transitionComplete.push(transition);
    }
}

function resetRenderTimer() {
    workInProgressRootRenderTargetTime = now() + RENDER_TIMEOUT_MS;
}

export function getRenderTargetTime() {
    return workInProgressRootRenderTargetTime;
}

let hasUncaughtError = false;
let firstUncaughtError = null;
let legacyErrorBoundariesThatAlreadyFailed = null;

// Only used when enableProfilerNestedUpdateScheduledHook is true;
// to track which root is currently committing layout effects.
let rootCommittingMutationOrLayoutEffects = null;

let rootDoesHavePassiveEffects = false;
let rootWithPendingPassiveEffects = null;
let pendingPassiveEffectsLanes = NoLanes;
let pendingPassiveProfilerEffects = [];
let pendingPassiveEffectsRemainingLanes = NoLanes;
let pendingPassiveTransitions = null;

// Use these to prevent an infinite loop of nested updates
const NESTED_UPDATE_LIMIT = 50;
let nestedUpdateCount = 0;
let rootWithNestedUpdates = null;
let isFlushingPassiveEffects = false;
let didScheduleUpdateDuringPassiveEffects = false;

const NESTED_PASSIVE_UPDATE_LIMIT = 50;
let nestedPassiveUpdateCount = 0;
let rootWithPassiveNestedUpdates = null;

// If two updates are scheduled within the same event, we should treat their
// event times as simultaneous, even if the actual clock time has advanced
// between the first and second call.
let currentEventTime = NoTimestamp;
let currentEventTransitionLane = NoLanes;

let isRunningInsertionEffect = false;

export function getWorkInProgressRoot() {
    return workInProgressRoot;
}

export function getWorkInProgressRootRenderLanes() {
    return workInProgressRootRenderLanes;
}

export function requestEventTime() {
    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        // We're inside React, so it's fine to read the actual time.
        return now();
    }
    // We're not inside React, so we may be in the middle of a browser event.
    if (currentEventTime !== NoTimestamp) {
        // Use the same start time for all updates until we enter React again.
        return currentEventTime;
    }
    // This is the first update since React yielded. Compute a new start time.
    currentEventTime = now();
    return currentEventTime;
}

export function getCurrentTime() {
    return now();
}

/**
 * 获取更新的车道优先级
 */
export function requestUpdateLane(fiber) {
    // Special cases
    const mode = fiber.mode;

    //! 1. 处理特殊情况
    if ((mode & ConcurrentMode) === NoMode) {
        return SyncLane;
    } else if (!deferRenderPhaseUpdateToNextBatch && (executionContext & RenderContext) !== NoContext && workInProgressRootRenderLanes !== NoLanes) {
        // 渲染阶段的更新
        // This is a render phase update. These are not officially supported. The
        // old behavior is to give this the same "thread" (lanes) as
        // whatever is currently rendering. So if you call `setState` on a component
        // that happens later in the same render, it will flush. Ideally, we want to
        // remove the special case and treat them as if they came from an
        // interleaved event. Regardless, this pattern is not officially supported.
        // This behavior is only a fallback. The flag only exists until we can roll
        // out the setState warning, since existing code might accidentally rely on
        // the current behavior.
        return pickArbitraryLane(workInProgressRootRenderLanes);
    }

    //! 2. Transition 优先级
    const isTransition = requestCurrentTransition() !== NoTransition;
    if (isTransition) {
        // The algorithm for assigning an update to a lane should be stable for all
        // updates at the same priority within the same event. To do this, the
        // inputs to the algorithm must be the same.
        //
        // The trick we use is to cache the first of each of these inputs within an
        // event. Then reset the cached values once we can be sure the event is
        // over. Our heuristic for that is whenever we enter a concurrent work loop.
        // 首次为空时才赋值，后面都使用缓存，在确定事件完成时会清空该标识
        if (currentEventTransitionLane === NoLane) {
            // All transitions within the same event are assigned the same lane.
            // 所有的过渡在相同的事件会赋值为相同的车道
            currentEventTransitionLane = claimNextTransitionLane();
        }

        return currentEventTransitionLane;
    }

    //! 3. Update 优先级
    // e.g. event handler、startTransition、flushSync ...
    // Updates originating inside certain React methods, like flushSync, have
    // their priority set by tracking it with a context variable.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    const updateLane = getCurrentUpdatePriority();
    // console.log('updateLane', updateLane.toString(2))
    if (updateLane !== NoLane) {
        return updateLane;
    }

    //! 4. 处理在 React 范围之外的更新
    // 根据事件的类型来获取对应的更新优先级
    // This update originated outside React. Ask the host environment for an
    // appropriate priority, based on the type of event.
    //
    // The opaque type returned by the host config is internally a lane, so we can
    // use that directly.
    // const eventLane = getCurrentEventPriority()
    return getCurrentEventPriority();
}

function requestRetryLane(fiber) {
    // This is a fork of `requestUpdateLane` designed specifically for Suspense
    // "retries" — a special update that attempts to flip a Suspense boundary
    // from its placeholder state to its primary/resolved state.

    // Special cases
    const mode = fiber.mode;
    if ((mode & ConcurrentMode) === NoMode) {
        return SyncLane;
    }

    return claimNextRetryLane();
}

/**
 * 主要住了两件事：
 * 1. 标记 fiber root 有更新的任务
 * 2. 确保 fiber root 被调度
 */
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    // Mark that the root has a pending update.
    // 1. 给 fiber root 上增加待更新的车道
    markRootUpdated(root, lane, eventTime);

    // 渲染阶段更新
    if ((executionContext & RenderContext) !== NoLanes && root === workInProgressRoot) {
        // This update was dispatched during the render phase. This is a mistake
        // if the update originates from user space (with the exception of local
        // hook updates, which are handled differently and don't reach this
        // function), but there are some internal React features that use this as
        // an implementation detail, like selective hydration.
        // warnAboutRenderPhaseUpdatesInDEV(fiber);

        // Track lanes that were updated during the render phase
        // 合并渲染中更新的车道
        workInProgressRootRenderPhaseUpdatedLanes = mergeLanes(workInProgressRootRenderPhaseUpdatedLanes, lane,);
    } else {
        // This is a normal update, scheduled from outside the render phase. For
        // example, during an input event.

        // 2. 确保 fiber root 被调度
        ensureRootIsScheduled(root, eventTime);

        // 兼容 render 模式的更新
        if (lane === SyncLane && executionContext === NoContext && (fiber.mode & ConcurrentMode) === NoMode) {
            // Flush the synchronous work now, unless we're already working or inside
            // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
            // scheduleCallbackForFiber to preserve the ability to schedule a callback
            // without immediately flushing it. We only do this for user-initiated
            // updates, to preserve historical behavior of legacy mode.
            // resetRenderTimer();
            flushSyncCallbacksOnlyInLegacyMode();
        }
    }
}

export function scheduleInitialHydrationOnRoot(root, lane, eventTime) {
    // This is a special fork of scheduleUpdateOnFiber that is only used to
    // schedule the initial hydration of a root that has just been created. Most
    // of the stuff in scheduleUpdateOnFiber can be skipped.
    //
    // The main reason for this separate path, though, is to distinguish the
    // initial children from subsequent updates. In fully client-rendered roots
    // (createRoot instead of hydrateRoot), all top-level renders are modeled as
    // updates, but hydration roots are special because the initial render must
    // match what was rendered on the server.
    const current = root.current;
    current.lanes = lane;
    markRootUpdated(root, lane, eventTime);
    ensureRootIsScheduled(root, eventTime);
}

export function isUnsafeClassRenderPhaseUpdate(fiber) {
    // Check if this is a render phase update. Only called by class components,
    // which special (deprecated) behavior for UNSAFE_componentWillReceive props.
    return (// TODO: Remove outdated deferRenderPhaseUpdateToNextBatch experiment. We
        // decided not to enable it.
        (!deferRenderPhaseUpdateToNextBatch || (fiber.mode & ConcurrentMode) === NoMode) && (executionContext & RenderContext) !== NoContext);
}

// Use this function to schedule a task for a root. There's only one task per
// root; if a task was already scheduled, we'll check to make sure the priority
// of the existing task is the same as the priority of the next level that the
// root has work on. This function is called on every update, and right before
// exiting a task.
function ensureRootIsScheduled(root, currentTime) {
    const existingCallbackNode = root.callbackNode;

    // Check if any lanes are being starved by other work. If so, mark them as
    // expired so we know to work on those next.
    //! 1. 标记已经过期的任务（过期的任务优先级调整到最高）
    // - 没有过期的时间，添加过期的时间
    // - 存在过期的时间，并且已经过期，将该车道添加到 root.expiredLanes 中
    markStarvedLanesAsExpired(root, currentTime);

    // Determine the next lanes to work on, and their priority.
    //! 2. 获取更次要更新的车道，即更新的批次
    const nextLanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,);

    if (nextLanes === NoLanes) {
        // 没有车道更新，做一些清空操作
        // Special case: There's nothing to work on.
        if (existingCallbackNode !== null) {
            cancelCallback(existingCallbackNode);
        }
        root.callbackNode = null;
        root.callbackPriority = NoLane;
        return;
    }

    // We use the highest priority lane to represent the priority of the callback.
    // 使用最高优先级的车道代表 callback 的优先级
    // 根据更新的车道，获取最高的优先级等级
    // e.g. nextLanes: 0110 newCallbackPriority: 0010
    const newCallbackPriority = getHighestPriorityLane(nextLanes);

    // Check if there's an existing task. We may be able to reuse it.
    const existingCallbackPriority = root.callbackPriority;

    // 正在构建的优先级等于新进入的优先级，复用，不处理
    if (existingCallbackPriority === newCallbackPriority) {
        // The priority hasn't changed. We can reuse the existing task. Exit.
        // 前后最高优先级相同，直接返回
        return;
    }

    // 到这证明了：本次更新的车道优先级大于正在渲染的车道优先级

    if (existingCallbackNode != null) {
        // Cancel the existing callback. We'll schedule a new one below.
        // 取消当前的任务，调度新的优先级高的任务
        cancelCallback(existingCallbackNode);
    }

    // console.log(nextLanes.toString(2))
    //! 3. 调度新的任务
    // Schedule a new callback.
    let newCallbackNode;
    if (newCallbackPriority === SyncLane) {
        // 可能的情况
        // 1. render 模式
        // 2. 过期的任务

        // Special case: Sync React callbacks are scheduled on a special
        // internal queue
        if (root.tag === LegacyRoot) {
            // render 模式
            // 本质上还是调用 scheduleSyncCallback，只是在调用之前加了一个标识
            scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));
        } else {
            // Concurrent 模式
            scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
        }

        // Flush the queue in a microtask.
        // 在宏任务中清空这些任务
        scheduleMicrotask(() => {
            // In Safari, appending an iframe forces microtasks to run.
            // https://github.com/facebook/react/issues/22459
            // We don't support running callbacks in the middle of render
            // or commit so we need to check against that.
            if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
                // 不在 Render 和 Commit 上下文中
                // Note that this would still prematurely flush the callbacks
                // if this happens outside render or commit phase (e.g. in an event).
                flushSyncCallbacks();
            }
        });

        // 同步的更新没有 callbackNode
        newCallbackNode = null;
    } else {
        // 异步更新
        let schedulerPriorityLevel;
        // 车道优先级 -> 事件优先级
        switch (lanesToEventPriority(nextLanes)) {
            // 事件优先级 -> 调度优先级
            case DiscreteEventPriority:
                schedulerPriorityLevel = ImmediateSchedulerPriority;
                break;
            case ContinuousEventPriority:
                schedulerPriorityLevel = UserBlockingSchedulerPriority;
                break;
            case DefaultEventPriority:
                schedulerPriorityLevel = NormalSchedulerPriority;
                break;
            case IdleEventPriority:
                schedulerPriorityLevel = IdleSchedulerPriority;
                break;
            default:
                schedulerPriorityLevel = NormalSchedulerPriority;
                break;
        }
        // 注册回调
        newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root),);
    }

    //! 4. 更新优先级和任务
    root.callbackPriority = newCallbackPriority;

    // newCallbackNode 是 scheduleCallback 的返回值
    root.callbackNode = newCallbackNode;
}

// This is the entry point for every concurrent task, i.e. anything that
// goes through Scheduler.
// 并发任务的入口点，都经过调度器调度
// didTimeout 是 Scheduler 传入的
function performConcurrentWorkOnRoot(root, didTimeout) {
    // Since we know we're in a React event, we can clear the current
    // event time. The next update will compute a new event time.
    currentEventTime = NoTimestamp;
    currentEventTransitionLane = NoLanes;

    // 当前上下文是 RenderContext 或者 CommitContext
    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        throw new Error('Should not already be working.');
    }

    // 在调度该车道之前把 effect 清空，防止 effect 产生额外的更新任务
    // Flush any pending passive effects before deciding which lanes to work on,
    // in case they schedule additional work.
    const originalCallbackNode = root.callbackNode;
    const didFlushPassiveEffects = flushPassiveEffects();
    if (didFlushPassiveEffects) {
        // 这些 effect 中可能取消了任务
        // Something in the passive effect phase may have canceled the current task.
        // Check if the task node for this root was changed.
        if (root.callbackNode !== originalCallbackNode) {
            // The current task was canceled. Exit. We don't need to call
            // `ensureRootIsScheduled` because the check above implies either that
            // there's a new task, or that there's no remaining work on this root.
            // 不需要调用 ensureRootIsScheduled，因为这代表会有一个新的任务或者没有更新任务了
            return null;
        } else {
            // 任务没有被取消，继续调度该任务
            // Current task was not canceled. Continue.
        }
    }

    // 再次决定去更新那个车道，因为之前有调度 effect 工作了，可能会有优先级更高的车道
    // Determine the next lanes to work on, using the fields stored
    // on the root.
    let lanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,);
    if (lanes === NoLanes) {
        // 代码不会到这个分支
        // Defensive coding. This is never expected to happen.
        return null;
    }


    // 禁用时间切片的场景
    // 1. 过期的任务阻塞时间比较长
    // 2. 在 render 模式下
    // We disable time-slicing in some cases: if the work has been CPU-bound
    // for too long ("expired" work, to prevent starvation), or we're in
    // sync-updates-by-default mode.
    // TODO: We only check `didTimeout` defensively, to account for a Scheduler
    // bug we're still investigating. Once the bug in Scheduler is fixed,
    // we can remove this, since we track expiration ourselves.

    // 启用时间切片需要同时满足以下条件：
    // 1. 本次更新的车道不存在阻塞的车道任务
    // 2. 本次更新的车道不存在过期的车道任务
    // 3. didTimeout 为 false
    const shouldTimeSlice = !includesBlockingLane(root, lanes) && !includesExpiredLane(root, lanes) && !didTimeout; // disableSchedulerTimeoutInWorkLoop || !didTimeout

    // 根据是否使用时间切片决定使用那个渲染模式
    // 时间切片：renderRootConcurrent
    // 非时间切片：renderRootSync
    // exitStatus: 退出的状态
    let exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes);

    // console.log('exitStatus: ', exitStatus)
    // const RootInProgress = 0; // 进行中
    // const RootFatalErrored = 1; // 致命的错误
    // const RootErrored = 2; // 错误
    // const RootSuspended = 3; // 挂起
    // const RootSuspendedWithDelay = 4; // 延迟挂起
    // const RootCompleted = 5; // 完成
    // const RootDidNotComplete = 6; // 没有完成
    if (exitStatus !== RootInProgress) {
        // 不是进行中
        // 进行中 -> 错误
        // 进行中 -> 悬停
        // 进行中 -> 完成
        if (exitStatus === RootErrored) {
            // If something threw an error, try rendering one more time. We'll
            // render synchronously to block concurrent data mutations, and we'll
            // include all pending updates are included. If it still fails after
            // the second attempt, we'll give up and commit the resulting tree.
            // 获取车道去执行同步的任务
            const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);
            if (errorRetryLanes !== NoLanes) {
                lanes = errorRetryLanes;
                exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
            }
        }

        // 严重的错误
        if (exitStatus === RootFatalErrored) {
            const fatalError = workInProgressRootFatalError;

            // 准备新的 workInProgress
            prepareFreshStack(root, NoLanes);

            // 标记跟悬停
            markRootSuspended(root, lanes);

            // 再次确保根被调度
            ensureRootIsScheduled(root, now());

            throw fatalError;
        }

        if (exitStatus === RootDidNotComplete) {
            // The render unwound without completing the tree. This happens in special
            // cases where need to exit the current render without producing a
            // consistent tree or committing.
            //
            // This should only happen during a concurrent render, not a discrete or
            // synchronous update. We should have already checked for this when we
            // unwound the stack.
            // 标记根被悬停了
            markRootSuspended(root, lanes);
        } else {
            // 到这的情况：
            // 1. 悬停
            // 2. 完成了

            // The render completed.

            // Check if this render may have yielded to a concurrent event, and if so,
            // confirm that any newly rendered stores are consistent.
            // TODO: It's possible that even a concurrent render may never have yielded
            // to the main thread, if it was fast enough, or if it expired. We could
            // skip the consistency check in that case, too.

            // 判断本次是不是时间切片的调度
            const renderWasConcurrent = !includesBlockingLane(root, lanes);

            // 获取完成的任务
            const finishedWork = root.current.alternate;

            // 1. 是以时间切片的更新
            // 2. 存在与外部仓库渲染不一致的情况
            // 在 render 过程中存在外部状态的变化
            if (renderWasConcurrent && !isRenderConsistentWithExternalStores(finishedWork)) {
                // 在交叉的事件中被修改了
                // A store was mutated in an interleaved event. Render again,
                // synchronously, to block further mutations.
                // 外部状态发生了变化，重新渲染一次
                exitStatus = renderRootSync(root, lanes);

                // We need to check again if something threw
                if (exitStatus === RootErrored) {
                    const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);
                    if (errorRetryLanes !== NoLanes) {
                        lanes = errorRetryLanes;
                        exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
                        // We assume the tree is now consistent because we didn't yield to any
                        // concurrent events.
                    }
                }
                if (exitStatus === RootFatalErrored) {
                    const fatalError = workInProgressRootFatalError;
                    prepareFreshStack(root, NoLanes);
                    markRootSuspended(root, lanes);
                    ensureRootIsScheduled(root, now());
                    throw fatalError;
                }
            }

            // 获得一致性的树了，可以提交了
            // We now have a consistent tree. The next step is either to commit it,
            // or, if something suspended, wait to commit it after a timeout.
            root.finishedWork = finishedWork;
            root.finishedLanes = lanes;
            finishConcurrentRender(root, exitStatus, lanes);
        }
    }


    // 再次确保根被重新调度
    ensureRootIsScheduled(root, now());

    //~ 中断恢复的关键
    if (root.callbackNode === originalCallbackNode) {
        // The task node scheduled for this root is the same one that's
        // currently executed. Need to return a continuation.
        return performConcurrentWorkOnRoot.bind(null, root);
    }

    return null;
}

/**
 * 从 concurrent 中恢复错误
 */
function recoverFromConcurrentError(root, errorRetryLanes) {
    // If an error occurred during hydration, discard server response and fall
    // back to client side render.

    // Before rendering again, save the errors from the previous attempt.
    const errorsFromFirstAttempt = workInProgressRootConcurrentErrors;

    const exitStatus = renderRootSync(root, errorRetryLanes);
    if (exitStatus !== RootErrored) {
        // Successfully finished rendering on retry

        // The errors from the failed first attempt have been recovered. Add
        // them to the collection of recoverable errors. We'll log them in the
        // commit phase.
        const errorsFromSecondAttempt = workInProgressRootRecoverableErrors;
        workInProgressRootRecoverableErrors = errorsFromFirstAttempt;
        // The errors from the second attempt should be queued after the errors
        // from the first attempt, to preserve the causal sequence.
        if (errorsFromSecondAttempt !== null) {
            queueRecoverableErrors(errorsFromSecondAttempt);
        }
    } else {
        // The UI failed to recover.
    }

    return exitStatus;
}

export function queueRecoverableErrors(errors) {
    if (workInProgressRootRecoverableErrors === null) {
        workInProgressRootRecoverableErrors = errors;
    } else {
        workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, errors,);
    }
}

function finishConcurrentRender(root, exitStatus, lanes) {
    switch (exitStatus) {
        case RootInProgress:
        case RootFatalErrored: {
            throw new Error('Root did not complete. This is a bug in React.');
        }
        // Flow knows about invariant, so it complains if I add a break
        // statement, but eslint doesn't know about invariant, so it complains
        // if I do. eslint-disable-next-line no-fallthrough
        case RootErrored: {
            // We should have already attempted to retry this tree. If we reached
            // this point, it errored again. Commit it.
            commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions,);
            break;
        }
        case RootSuspended: {
            markRootSuspended(root, lanes);

            // We have an acceptable loading state. We need to figure out if we
            // should immediately commit it or wait a bit.

            if (includesOnlyRetries(lanes) && // do not delay if we're inside an act() scope
                !shouldForceFlushFallbacksInDEV()) {
                // This render only included retries, no updates. Throttle committing
                // retries so that we don't show too many loading states too quickly.
                const msUntilTimeout = globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - now();
                // Don't bother with a very short suspense time.
                if (msUntilTimeout > 10) {
                    const nextLanes = getNextLanes(root, NoLanes);
                    if (nextLanes !== NoLanes) {
                        // There's additional work on this root.
                        break;
                    }
                    const suspendedLanes = root.suspendedLanes;
                    if (!isSubsetOfLanes(suspendedLanes, lanes)) {
                        // We should prefer to render the fallback of at the last
                        // suspended level. Ping the last suspended level to try
                        // rendering it again.
                        // FIXME: What if the suspended lanes are Idle? Should not restart.
                        const eventTime = requestEventTime();
                        markRootPinged(root, suspendedLanes, eventTime);
                        break;
                    }

                    // The render is suspended, it hasn't timed out, and there's no
                    // lower priority work to do. Instead of committing the fallback
                    // immediately, wait for more data to arrive.
                    root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root, workInProgressRootRecoverableErrors, workInProgressTransitions,), msUntilTimeout,);
                    break;
                }
            }
            // The work expired. Commit immediately.
            commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions,);
            break;
        }
        case RootSuspendedWithDelay: {
            markRootSuspended(root, lanes);

            if (includesOnlyTransitions(lanes)) {
                // This is a transition, so we should exit without committing a
                // placeholder and without scheduling a timeout. Delay indefinitely
                // until we receive more data.
                break;
            }

            if (!shouldForceFlushFallbacksInDEV()) {
                // This is not a transition, but we did trigger an avoided state.
                // Schedule a placeholder to display after a short delay, using the Just
                // Noticeable Difference.
                // TODO: Is the JND optimization worth the added complexity? If this is
                // the only reason we track the event time, then probably not.
                // Consider removing.

                const mostRecentEventTime = getMostRecentEventTime(root, lanes);
                const eventTimeMs = mostRecentEventTime;
                const timeElapsedMs = now() - eventTimeMs;
                const msUntilTimeout = jnd(timeElapsedMs) - timeElapsedMs;

                // Don't bother with a very short suspense time.
                if (msUntilTimeout > 10) {
                    // Instead of committing the fallback immediately, wait for more data
                    // to arrive.
                    root.timeoutHandle = scheduleTimeout(commitRoot.bind(null, root, workInProgressRootRecoverableErrors, workInProgressTransitions,), msUntilTimeout,);
                    break;
                }
            }

            // Commit the placeholder.
            commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions,);
            break;
        }
        case RootCompleted: {
            // The work completed. Ready to commit.
            commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions,);
            break;
        }
        default: {
            throw new Error('Unknown root exit status.');
        }
    }
}

function isRenderConsistentWithExternalStores(finishedWork) {
    // Search the rendered tree for external store reads, and check whether the
    // stores were mutated in a concurrent event. Intentionally using an iterative
    // loop instead of recursion so we can exit early.
    let node = finishedWork;
    while (true) {
        // 存在读取了外部状态
        if (node.flags & StoreConsistency) {
            const updateQueue = node.updateQueue;
            if (updateQueue !== null) {
                const checks = updateQueue.stores;
                if (checks !== null) {
                    for (let i = 0; i < checks.length; i++) {
                        const check = checks[i];
                        const getSnapshot = check.getSnapshot;
                        const renderedValue = check.value;
                        try {
                            // 快照发生了变化，说明不一致
                            if (!is(getSnapshot(), renderedValue)) {
                                // Found an inconsistent store.
                                return false;
                            }
                        } catch (error) {
                            // If `getSnapshot` throws, return `false`. This will schedule
                            // a re-render, and the error will be rethrown during render.
                            return false;
                        }
                    }
                }
            }
        }

        // 处理孩子
        const child = node.child;
        if (node.subtreeFlags & StoreConsistency && child !== null) {
            child.return = node;
            node = child;
            continue;
        }

        if (node === finishedWork) {
            return true;
        }

        // 没有兄弟，往上找
        while (node.sibling === null) {
            if (node.return === null || node.return === finishedWork) {
                return true;
            }
            node = node.return;
        }

        // 处理兄弟
        node.sibling.return = node.return;
        node = node.sibling;
    }

    // Flow doesn't know this is unreachable, but eslint does
    // eslint-disable-next-line no-unreachable
    return true;
}

function markRootSuspended(root, suspendedLanes) {
    // When suspending, we should always exclude lanes that were pinged or (more
    // rarely, since we try to avoid it) updated during the render phase.
    // TODO: Lol maybe there's a better way to factor this besides this
    // obnoxiously named function :)
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootPingedLanes);
    suspendedLanes = removeLanes(suspendedLanes, workInProgressRootInterleavedUpdatedLanes,);
    markRootSuspended_dontCallThisOneDirectly(root, suspendedLanes);
}

// This is the entry point for synchronous tasks that don't go
// through Scheduler
function performSyncWorkOnRoot(root) {
    if (enableProfilerTimer && enableProfilerNestedUpdatePhase) {
        syncNestedUpdateFlag();
    }

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        throw new Error('Should not already be working.');
    }

    flushPassiveEffects();

    let lanes = getNextLanes(root, NoLanes);
    if (!includesSomeLane(lanes, SyncLane)) {
        // There's no remaining sync work left.
        ensureRootIsScheduled(root, now());
        return null;
    }

    let exitStatus = renderRootSync(root, lanes);
    if (root.tag !== LegacyRoot && exitStatus === RootErrored) {
        // If something threw an error, try rendering one more time. We'll render
        // synchronously to block concurrent data mutations, and we'll includes
        // all pending updates are included. If it still fails after the second
        // attempt, we'll give up and commit the resulting tree.
        const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);
        if (errorRetryLanes !== NoLanes) {
            lanes = errorRetryLanes;
            exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
        }
    }

    if (exitStatus === RootFatalErrored) {
        const fatalError = workInProgressRootFatalError;
        prepareFreshStack(root, NoLanes);
        markRootSuspended(root, lanes);
        ensureRootIsScheduled(root, now());
        throw fatalError;
    }

    if (exitStatus === RootDidNotComplete) {
        throw new Error('Root did not complete. This is a bug in React.');
    }

    // We now have a consistent tree. Because this is a sync render, we
    // will commit it even if something suspended.
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions,);

    // Before exiting, make sure there's a callback scheduled for the next
    // pending level.
    ensureRootIsScheduled(root, now());

    return null;
}

export function flushRoot(root, lanes) {
    if (lanes !== NoLanes) {
        markRootEntangled(root, mergeLanes(lanes, SyncLane));
        ensureRootIsScheduled(root, now());
        if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
            resetRenderTimer();
            flushSyncCallbacks();
        }
    }
}

export function getExecutionContext() {
    return executionContext;
}

export function deferredUpdates(fn) {
    const previousPriority = getCurrentUpdatePriority();
    const prevTransition = ReactCurrentBatchConfig.transition;

    try {
        ReactCurrentBatchConfig.transition = null;
        setCurrentUpdatePriority(DefaultEventPriority);
        return fn();
    } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig.transition = prevTransition;
    }
}

/**
 * 批量更新上下文
 */
export function batchedUpdates(fn, a) {
    const prevExecutionContext = executionContext;
    executionContext |= BatchedContext;
    // debugger
    try {
        return fn(a);
    } finally {
        executionContext = prevExecutionContext;
        // If there were legacy sync updates, flush them at the end of the outer
        // most batchedUpdates-like method.
        if (executionContext === NoContext) {
            resetRenderTimer();
            flushSyncCallbacksOnlyInLegacyMode();
        }
    }
}

export function discreteUpdates(fn, a, b, c, d) {
    const previousPriority = getCurrentUpdatePriority();
    const prevTransition = ReactCurrentBatchConfig.transition;
    try {
        ReactCurrentBatchConfig.transition = null;
        setCurrentUpdatePriority(DiscreteEventPriority);
        return fn(a, b, c, d);
    } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig.transition = prevTransition;
        if (executionContext === NoContext) {
            resetRenderTimer();
        }
    }
}

// Overload the definition to the two valid signatures.
// Warning, this opts-out of checking the function body.

// eslint-disable-next-line no-redeclare

// eslint-disable-next-line no-redeclare
export function flushSync(fn) {
    // In legacy mode, we flush pending passive effects at the beginning of the
    // next event, not at the end of the previous one.
    if (rootWithPendingPassiveEffects !== null && rootWithPendingPassiveEffects.tag === LegacyRoot && (executionContext & (RenderContext | CommitContext)) === NoContext) {
        flushPassiveEffects();
    }

    const prevExecutionContext = executionContext;
    executionContext |= BatchedContext;

    const prevTransition = ReactCurrentBatchConfig.transition;
    const previousPriority = getCurrentUpdatePriority();

    try {
        ReactCurrentBatchConfig.transition = null;
        setCurrentUpdatePriority(DiscreteEventPriority);
        if (fn) {
            return fn();
        } else {
            return undefined;
        }
    } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig.transition = prevTransition;

        executionContext = prevExecutionContext;
        // Flush the immediate callbacks that were scheduled during this batch.
        // Note that this will happen even if batchedUpdates is higher up
        // the stack.
        if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
            flushSyncCallbacks();
        }
    }
}

export function isAlreadyRendering() {
    // Used by the renderer to print a warning if certain APIs are called from
    // the wrong context.
    return (__DEV__ && (executionContext & (RenderContext | CommitContext)) !== NoContext);
}

export function flushControlled(fn) {
    const prevExecutionContext = executionContext;
    executionContext |= BatchedContext;
    const prevTransition = ReactCurrentBatchConfig.transition;
    const previousPriority = getCurrentUpdatePriority();
    try {
        ReactCurrentBatchConfig.transition = null;
        setCurrentUpdatePriority(DiscreteEventPriority);
        fn();
    } finally {
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig.transition = prevTransition;

        executionContext = prevExecutionContext;
        if (executionContext === NoContext) {
            // Flush the immediate callbacks that were scheduled during this batch
            resetRenderTimer();
            flushSyncCallbacks();
        }
    }
}

export function pushRenderLanes(fiber, lanes) {
    pushToStack(subtreeRenderLanesCursor, subtreeRenderLanes, fiber);
    subtreeRenderLanes = mergeLanes(subtreeRenderLanes, lanes);
    workInProgressRootIncludedLanes = mergeLanes(workInProgressRootIncludedLanes, lanes,);
}

export function popRenderLanes(fiber) {
    subtreeRenderLanes = subtreeRenderLanesCursor.current;
    popFromStack(subtreeRenderLanesCursor, fiber);
}

function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    const timeoutHandle = root.timeoutHandle;
    if (timeoutHandle !== noTimeout) {
        // The root previous suspended and scheduled a timeout to commit a fallback
        // state. Now that we have additional work, cancel the timeout.
        root.timeoutHandle = noTimeout;
        // $FlowFixMe Complains noTimeout is not a TimeoutID, despite the check above
        cancelTimeout(timeoutHandle);
    }

    if (workInProgress !== null) {
        let interruptedWork = workInProgress.return;
        while (interruptedWork !== null) {
            const current = interruptedWork.alternate;
            unwindInterruptedWork(current, interruptedWork, workInProgressRootRenderLanes,);
            interruptedWork = interruptedWork.return;
        }
    }
    workInProgressRoot = root;
    const rootWorkInProgress = createWorkInProgress(root.current, null);
    workInProgress = rootWorkInProgress;
    workInProgressRootRenderLanes = subtreeRenderLanes = workInProgressRootIncludedLanes = lanes;
    workInProgressRootExitStatus = RootInProgress;
    workInProgressRootFatalError = null;
    workInProgressRootSkippedLanes = NoLanes;
    workInProgressRootInterleavedUpdatedLanes = NoLanes;
    workInProgressRootRenderPhaseUpdatedLanes = NoLanes;
    workInProgressRootPingedLanes = NoLanes;
    workInProgressRootConcurrentErrors = null;
    workInProgressRootRecoverableErrors = null;

    finishQueueingConcurrentUpdates();

    // if (__DEV__) {
    //   ReactStrictModeWarnings.discardPendingWarnings();
    // }

    return rootWorkInProgress;
}

function handleError(root, thrownValue) {
    do {
        let erroredWork = workInProgress;
        try {
            // Reset module-level state that was set during the render phase.
            resetContextDependencies();
            resetHooksAfterThrow();
            resetCurrentDebugFiberInDEV();
            // TODO: I found and added this missing line while investigating a
            // separate issue. Write a regression test using string refs.
            ReactCurrentOwner.current = null;

            if (erroredWork === null || erroredWork.return === null) {
                // Expected to be working on a non-root fiber. This is a fatal error
                // because there's no ancestor that can handle it; the root is
                // supposed to capture all errors that weren't caught by an error
                // boundary.
                workInProgressRootExitStatus = RootFatalErrored;
                workInProgressRootFatalError = thrownValue;
                // Set `workInProgress` to null. This represents advancing to the next
                // sibling, or the parent if there are no siblings. But since the root
                // has no siblings nor a parent, we set it to null. Usually this is
                // handled by `completeUnitOfWork` or `unwindWork`, but since we're
                // intentionally not calling those, we need set it here.
                // TODO: Consider calling `unwindWork` to pop the contexts.
                workInProgress = null;
                return;
            }

            if (enableProfilerTimer && erroredWork.mode & ProfileMode) {
                // Record the time spent rendering before an error was thrown. This
                // avoids inaccurate Profiler durations in the case of a
                // suspended render.
                stopProfilerTimerIfRunningAndRecordDelta(erroredWork, true);
            }

            if (enableSchedulingProfiler) {
                markComponentRenderStopped();

                if (thrownValue !== null && typeof thrownValue === 'object' && typeof thrownValue.then === 'function') {
                    const wakeable = thrownValue;
                    markComponentSuspended(erroredWork, wakeable, workInProgressRootRenderLanes,);
                } else {
                    markComponentErrored(erroredWork, thrownValue, workInProgressRootRenderLanes,);
                }
            }

            throwException(root, erroredWork.return, erroredWork, thrownValue, workInProgressRootRenderLanes,);
            completeUnitOfWork(erroredWork);
        } catch (yetAnotherThrownValue) {
            // Something in the return path also threw.
            thrownValue = yetAnotherThrownValue;
            if (workInProgress === erroredWork && erroredWork !== null) {
                // If this boundary has already errored, then we had trouble processing
                // the error. Bubble it to the next boundary.
                erroredWork = erroredWork.return;
                workInProgress = erroredWork;
            } else {
                erroredWork = workInProgress;
            }
            continue;
        }
        // Return to the normal work loop.
        return;
    } while (true);
}

function pushDispatcher() {
    const prevDispatcher = ReactCurrentDispatcher.current;
    ReactCurrentDispatcher.current = ContextOnlyDispatcher;
    if (prevDispatcher === null) {
        // The React isomorphic package does not include a default dispatcher.
        // Instead the first renderer will lazily attach one, in order to give
        // nicer error messages.
        return ContextOnlyDispatcher;
    } else {
        return prevDispatcher;
    }
}

function popDispatcher(prevDispatcher) {
    ReactCurrentDispatcher.current = prevDispatcher;
}

export function markCommitTimeOfFallback() {
    globalMostRecentFallbackTime = now();
}

export function markSkippedUpdateLanes(lane) {
    workInProgressRootSkippedLanes = mergeLanes(lane, workInProgressRootSkippedLanes,);
}

export function renderDidSuspend() {
    if (workInProgressRootExitStatus === RootInProgress) {
        workInProgressRootExitStatus = RootSuspended;
    }
}

export function renderDidSuspendDelayIfPossible() {
    if (workInProgressRootExitStatus === RootInProgress || workInProgressRootExitStatus === RootSuspended || workInProgressRootExitStatus === RootErrored) {
        workInProgressRootExitStatus = RootSuspendedWithDelay;
    }

    // Check if there are updates that we skipped tree that might have unblocked
    // this render.
    if (workInProgressRoot !== null && (includesNonIdleWork(workInProgressRootSkippedLanes) || includesNonIdleWork(workInProgressRootInterleavedUpdatedLanes))) {
        // Mark the current render as suspended so that we switch to working on
        // the updates that were skipped. Usually we only suspend at the end of
        // the render phase.
        // TODO: We should probably always mark the root as suspended immediately
        // (inside this function), since by suspending at the end of the render
        // phase introduces a potential mistake where we suspend lanes that were
        // pinged or updated while we were rendering.
        markRootSuspended(workInProgressRoot, workInProgressRootRenderLanes);
    }
}

export function renderDidError(error) {
    if (workInProgressRootExitStatus !== RootSuspendedWithDelay) {
        workInProgressRootExitStatus = RootErrored;
    }
    if (workInProgressRootConcurrentErrors === null) {
        workInProgressRootConcurrentErrors = [error];
    } else {
        workInProgressRootConcurrentErrors.push(error);
    }
}

// Called during render to determine if anything has suspended.
// Returns false if we're not sure.
export function renderHasNotSuspendedYet() {
    // If something errored or completed, we can't really be sure,
    // so those are false.
    return workInProgressRootExitStatus === RootInProgress;
}

function renderRootSync(root, lanes) {
    const prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    const prevDispatcher = pushDispatcher();

    // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.
    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        if (enableUpdaterTracking) {
            if (isDevToolsPresent) {
                const memoizedUpdaters = root.memoizedUpdaters;
                if (memoizedUpdaters.size > 0) {
                    restorePendingUpdaters(root, workInProgressRootRenderLanes);
                    memoizedUpdaters.clear();
                }

                // At this point, move Fibers that scheduled the upcoming work from the Map to the Set.
                // If we bailout on this work, we'll move them back (like above).
                // It's important to move them now in case the work spawns more work at the same priority with different updaters.
                // That way we can keep the current update and future updates separate.
                movePendingFibersToMemoized(root, lanes);
            }
        }

        workInProgressTransitions = getTransitionsForLanes(root, lanes);
        prepareFreshStack(root, lanes);
    }

    if (__DEV__) {
        if (enableDebugTracing) {
            logRenderStarted(lanes);
        }
    }

    if (enableSchedulingProfiler) {
        markRenderStarted(lanes);
    }

    do {
        try {
            workLoopSync();
            break;
        } catch (thrownValue) {
            handleError(root, thrownValue);
        }
    } while (true);
    resetContextDependencies();

    executionContext = prevExecutionContext;
    popDispatcher(prevDispatcher);

    if (workInProgress !== null) {
        // This is a sync render, so we should have finished the whole tree.
        throw new Error('Cannot commit an incomplete root. This error is likely caused by a ' + 'bug in React. Please file an issue.',);
    }

    if (__DEV__) {
        if (enableDebugTracing) {
            logRenderStopped();
        }
    }

    if (enableSchedulingProfiler) {
        markRenderStopped();
    }

    // Set this to null to indicate there's no in-progress render.
    workInProgressRoot = null;
    workInProgressRootRenderLanes = NoLanes;

    return workInProgressRootExitStatus;
}

// The work loop is an extremely hot path. Tell Closure not to inline it.
/** @noinline */
function workLoopSync() {
    // Already timed out, so perform work without checking if we need to yield.
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function renderRootConcurrent(root, lanes) {
    const prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    const prevDispatcher = pushDispatcher();

    // If the root or lanes have changed, throw out the existing stack
    // and prepare a fresh one. Otherwise we'll continue where we left off.
    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        if (enableUpdaterTracking) {
            if (isDevToolsPresent) {
                const memoizedUpdaters = root.memoizedUpdaters;
                if (memoizedUpdaters.size > 0) {
                    restorePendingUpdaters(root, workInProgressRootRenderLanes);
                    memoizedUpdaters.clear();
                }

                // At this point, move Fibers that scheduled the upcoming work from the Map to the Set.
                // If we bailout on this work, we'll move them back (like above).
                // It's important to move them now in case the work spawns more work at the same priority with different updaters.
                // That way we can keep the current update and future updates separate.
                movePendingFibersToMemoized(root, lanes);
            }
        }

        workInProgressTransitions = getTransitionsForLanes(root, lanes);
        resetRenderTimer();
        prepareFreshStack(root, lanes);
    }

    if (__DEV__) {
        if (enableDebugTracing) {
            logRenderStarted(lanes);
        }
    }

    if (enableSchedulingProfiler) {
        markRenderStarted(lanes);
    }

    do {
        try {
            workLoopConcurrent();
            break;
        } catch (thrownValue) {
            handleError(root, thrownValue);
        }
    } while (true);
    resetContextDependencies();

    popDispatcher(prevDispatcher);
    executionContext = prevExecutionContext;

    if (__DEV__) {
        if (enableDebugTracing) {
            logRenderStopped();
        }
    }

    // Check if the tree has completed.
    if (workInProgress !== null) {
        // Still work remaining.
        if (enableSchedulingProfiler) {
            markRenderYielded();
        }
        return RootInProgress;
    } else {
        // Completed the tree.
        if (enableSchedulingProfiler) {
            markRenderStopped();
        }

        // Set this to null to indicate there's no in-progress render.
        workInProgressRoot = null;
        workInProgressRootRenderLanes = NoLanes;

        // Return the final exit status.
        return workInProgressRootExitStatus;
    }
}

/** @noinline */
function workLoopConcurrent() {
    // Perform work until Scheduler asks us to yield
    while (workInProgress !== null && !shouldYield()) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(unitOfWork) {
    // The current, flushed, state of this fiber is the alternate. Ideally
    // nothing should rely on this, but relying on it here means that we don't
    // need an additional field on the work in progress.
    const current = unitOfWork.alternate;
    setCurrentDebugFiberInDEV(unitOfWork);

    let next;
    if (enableProfilerTimer && (unitOfWork.mode & ProfileMode) !== NoMode) {
        startProfilerTimer(unitOfWork);
        next = beginWork(current, unitOfWork, subtreeRenderLanes);
        stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
    } else {
        next = beginWork(current, unitOfWork, subtreeRenderLanes);
    }

    resetCurrentDebugFiberInDEV();
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    if (next === null) {
        // If this doesn't spawn new work, complete the current work.
        completeUnitOfWork(unitOfWork);
    } else {
        workInProgress = next;
    }

    ReactCurrentOwner.current = null;
}

function completeUnitOfWork(unitOfWork) {
    // Attempt to complete the current unit of work, then move to the next
    // sibling. If there are no more siblings, return to the parent fiber.
    let completedWork = unitOfWork;
    do {
        // The current, flushed, state of this fiber is the alternate. Ideally
        // nothing should rely on this, but relying on it here means that we don't
        // need an additional field on the work in progress.
        const current = completedWork.alternate;
        const returnFiber = completedWork.return;

        // Check if the work completed or if something threw.
        if ((completedWork.flags & Incomplete) === NoFlags) {
            setCurrentDebugFiberInDEV(completedWork);
            let next;
            if (!enableProfilerTimer || (completedWork.mode & ProfileMode) === NoMode) {
                next = completeWork(current, completedWork, subtreeRenderLanes);
            } else {
                startProfilerTimer(completedWork);
                next = completeWork(current, completedWork, subtreeRenderLanes);
                // Update render duration assuming we didn't error.
                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
            }
            resetCurrentDebugFiberInDEV();

            if (next !== null) {
                // Completing this fiber spawned new work. Work on that next.
                workInProgress = next;
                return;
            }
        } else {
            // This fiber did not complete because something threw. Pop values off
            // the stack without entering the complete phase. If this is a boundary,
            // capture values if possible.
            const next = unwindWork(current, completedWork, subtreeRenderLanes);

            // Because this fiber did not complete, don't reset its lanes.

            if (next !== null) {
                // If completing this work spawned new work, do that next. We'll come
                // back here again.
                // Since we're restarting, remove anything that is not a host effect
                // from the effect tag.
                next.flags &= HostEffectMask;
                workInProgress = next;
                return;
            }

            if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
                // Record the render duration for the fiber that errored.
                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);

                // Include the time spent working on failed children before continuing.
                let actualDuration = completedWork.actualDuration;
                let child = completedWork.child;
                while (child !== null) {
                    actualDuration += child.actualDuration;
                    child = child.sibling;
                }
                completedWork.actualDuration = actualDuration;
            }

            if (returnFiber !== null) {
                // Mark the parent fiber as incomplete and clear its subtree flags.
                returnFiber.flags |= Incomplete;
                returnFiber.subtreeFlags = NoFlags;
                returnFiber.deletions = null;
            } else {
                // We've unwound all the way to the root.
                workInProgressRootExitStatus = RootDidNotComplete;
                workInProgress = null;
                return;
            }
        }

        const siblingFiber = completedWork.sibling;
        if (siblingFiber !== null) {
            // If there is more work to do in this returnFiber, do that next.
            workInProgress = siblingFiber;
            return;
        }
        // Otherwise, return to the parent
        completedWork = returnFiber;
        // Update the next thing we're working on in case something throws.
        workInProgress = completedWork;
    } while (completedWork !== null);

    // We've reached the root.
    if (workInProgressRootExitStatus === RootInProgress) {
        workInProgressRootExitStatus = RootCompleted;
    }
}

function commitRoot(root, recoverableErrors, transitions) {
    // TODO: This no longer makes any sense. We already wrap the mutation and
    // layout phases. Should be able to remove.
    const previousUpdateLanePriority = getCurrentUpdatePriority();
    const prevTransition = ReactCurrentBatchConfig.transition;

    try {
        ReactCurrentBatchConfig.transition = null;
        setCurrentUpdatePriority(DiscreteEventPriority);
        commitRootImpl(root, recoverableErrors, transitions, previousUpdateLanePriority,);
    } finally {
        ReactCurrentBatchConfig.transition = prevTransition;
        setCurrentUpdatePriority(previousUpdateLanePriority);
    }

    return null;
}

function commitRootImpl(root, recoverableErrors, transitions, renderPriorityLevel,) {
    do {
        // `flushPassiveEffects` will call `flushSyncUpdateQueue` at the end, which
        // means `flushPassiveEffects` will sometimes result in additional
        // passive effects. So we need to keep flushing in a loop until there are
        // no more pending effects.
        // TODO: Might be better if `flushPassiveEffects` did not automatically
        // flush synchronous work at the end, to avoid factoring hazards like this.
        flushPassiveEffects();
    } while (rootWithPendingPassiveEffects !== null);
    flushRenderPhaseStrictModeWarningsInDEV();

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        throw new Error('Should not already be working.');
    }

    const finishedWork = root.finishedWork;
    const lanes = root.finishedLanes;

    if (__DEV__) {
        if (enableDebugTracing) {
            logCommitStarted(lanes);
        }
    }

    if (enableSchedulingProfiler) {
        markCommitStarted(lanes);
    }

    if (finishedWork === null) {
        if (__DEV__) {
            if (enableDebugTracing) {
                logCommitStopped();
            }
        }

        if (enableSchedulingProfiler) {
            markCommitStopped();
        }

        return null;
    } else {
        if (__DEV__) {
            if (lanes === NoLanes) {
                console.error('root.finishedLanes should not be empty during a commit. This is a ' + 'bug in React.',);
            }
        }
    }
    root.finishedWork = null;
    root.finishedLanes = NoLanes;

    if (finishedWork === root.current) {
        throw new Error('Cannot commit the same tree as before. This error is likely caused by ' + 'a bug in React. Please file an issue.',);
    }

    // commitRoot never returns a continuation; it always finishes synchronously.
    // So we can clear these now to allow a new callback to be scheduled.
    root.callbackNode = null;
    root.callbackPriority = NoLane;

    // Check which lanes no longer have any work scheduled on them, and mark
    // those as finished.
    let remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);

    // Make sure to account for lanes that were updated by a concurrent event
    // during the render phase; don't mark them as finished.
    const concurrentlyUpdatedLanes = getConcurrentlyUpdatedLanes();
    remainingLanes = mergeLanes(remainingLanes, concurrentlyUpdatedLanes);

    markRootFinished(root, remainingLanes);

    if (root === workInProgressRoot) {
        // We can reset these now that they are finished.
        workInProgressRoot = null;
        workInProgress = null;
        workInProgressRootRenderLanes = NoLanes;
    } else {
        // This indicates that the last root we worked on is not the same one that
        // we're committing now. This most commonly happens when a suspended root
        // times out.
    }

    // If there are pending passive effects, schedule a callback to process them.
    // Do this as early as possible, so it is queued before anything else that
    // might get scheduled in the commit phase. (See #16714.)
    // TODO: Delete all other places that schedule the passive effect callback
    // They're redundant.
    if ((finishedWork.subtreeFlags & PassiveMask) !== NoFlags || (finishedWork.flags & PassiveMask) !== NoFlags) {
        if (!rootDoesHavePassiveEffects) {
            rootDoesHavePassiveEffects = true;
            pendingPassiveEffectsRemainingLanes = remainingLanes;
            // workInProgressTransitions might be overwritten, so we want
            // to store it in pendingPassiveTransitions until they get processed
            // We need to pass this through as an argument to commitRoot
            // because workInProgressTransitions might have changed between
            // the previous render and commit if we throttle the commit
            // with setTimeout
            pendingPassiveTransitions = transitions;
            scheduleCallback(NormalSchedulerPriority, () => {
                flushPassiveEffects();
                // This render triggered passive effects: release the root cache pool
                // *after* passive effects fire to avoid freeing a cache pool that may
                // be referenced by a node in the tree (HostRoot, Cache boundary etc)
                return null;
            });
        }
    }

    // Check if there are any effects in the whole tree.
    // TODO: This is left over from the effect list implementation, where we had
    // to check for the existence of `firstEffect` to satisfy Flow. I think the
    // only other reason this optimization exists is because it affects profiling.
    // Reconsider whether this is necessary.
    const subtreeHasEffects = (finishedWork.subtreeFlags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;
    const rootHasEffect = (finishedWork.flags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !== NoFlags;

    if (subtreeHasEffects || rootHasEffect) {
        const prevTransition = ReactCurrentBatchConfig.transition;
        ReactCurrentBatchConfig.transition = null;
        const previousPriority = getCurrentUpdatePriority();
        setCurrentUpdatePriority(DiscreteEventPriority);

        const prevExecutionContext = executionContext;
        executionContext |= CommitContext;

        // Reset this to null before calling lifecycles
        ReactCurrentOwner.current = null;

        // The commit phase is broken into several sub-phases. We do a separate pass
        // of the effect list for each phase: all mutation effects come before all
        // layout effects, and so on.

        // The first phase a "before mutation" phase. We use this phase to read the
        // state of the host tree right before we mutate it. This is where
        // getSnapshotBeforeUpdate is called.
        const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(root, finishedWork,);

        if (enableProfilerTimer) {
            // Mark the current commit time to be shared by all Profilers in this
            // batch. This enables them to be grouped later.
            recordCommitTime();
        }

        if (enableProfilerTimer && enableProfilerNestedUpdateScheduledHook) {
            // Track the root here, rather than in commitLayoutEffects(), because of ref setters.
            // Updates scheduled during ref detachment should also be flagged.
            rootCommittingMutationOrLayoutEffects = root;
        }

        // The next phase is the mutation phase, where we mutate the host tree.
        commitMutationEffects(root, finishedWork, lanes);

        if (enableCreateEventHandleAPI) {
            if (shouldFireAfterActiveInstanceBlur) {
                afterActiveInstanceBlur();
            }
        }
        resetAfterCommit(root.containerInfo);

        // The work-in-progress tree is now the current tree. This must come after
        // the mutation phase, so that the previous tree is still current during
        // componentWillUnmount, but before the layout phase, so that the finished
        // work is current during componentDidMount/Update.
        root.current = finishedWork;

        // The next phase is the layout phase, where we call effects that read
        // the host tree after it's been mutated. The idiomatic use case for this is
        // layout, but class component lifecycles also fire here for legacy reasons.
        if (__DEV__) {
            if (enableDebugTracing) {
                logLayoutEffectsStarted(lanes);
            }
        }
        if (enableSchedulingProfiler) {
            markLayoutEffectsStarted(lanes);
        }
        commitLayoutEffects(finishedWork, root, lanes);
        if (__DEV__) {
            if (enableDebugTracing) {
                logLayoutEffectsStopped();
            }
        }

        if (enableSchedulingProfiler) {
            markLayoutEffectsStopped();
        }

        if (enableProfilerTimer && enableProfilerNestedUpdateScheduledHook) {
            rootCommittingMutationOrLayoutEffects = null;
        }

        // Tell Scheduler to yield at the end of the frame, so the browser has an
        // opportunity to paint.
        requestPaint();

        executionContext = prevExecutionContext;

        // Reset the priority to the previous non-sync value.
        setCurrentUpdatePriority(previousPriority);
        ReactCurrentBatchConfig.transition = prevTransition;
    } else {
        // No effects.
        root.current = finishedWork;
        // Measure these anyway so the flamegraph explicitly shows that there were
        // no effects.
        // TODO: Maybe there's a better way to report this.
        if (enableProfilerTimer) {
            recordCommitTime();
        }
    }

    const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

    if (rootDoesHavePassiveEffects) {
        // This commit has passive effects. Stash a reference to them. But don't
        // schedule a callback until after flushing layout work.
        rootDoesHavePassiveEffects = false;
        rootWithPendingPassiveEffects = root;
        pendingPassiveEffectsLanes = lanes;
    } else {
        // There were no passive effects, so we can immediately release the cache
        // pool for this render.
        releaseRootPooledCache(root, remainingLanes);
        if (__DEV__) {
            nestedPassiveUpdateCount = 0;
            rootWithPassiveNestedUpdates = null;
        }
    }

    // Read this again, since an effect might have updated it
    remainingLanes = root.pendingLanes;

    // Check if there's remaining work on this root
    // TODO: This is part of the `componentDidCatch` implementation. Its purpose
    // is to detect whether something might have called setState inside
    // `componentDidCatch`. The mechanism is known to be flawed because `setState`
    // inside `componentDidCatch` is itself flawed — that's why we recommend
    // `getDerivedStateFromError` instead. However, it could be improved by
    // checking if remainingLanes includes Sync work, instead of whether there's
    // any work remaining at all (which would also include stuff like Suspense
    // retries or transitions). It's been like this for a while, though, so fixing
    // it probably isn't that urgent.
    if (remainingLanes === NoLanes) {
        // If there's no remaining work, we can clear the set of already failed
        // error boundaries.
        legacyErrorBoundariesThatAlreadyFailed = null;
    }

    if (__DEV__ && enableStrictEffects) {
        if (!rootDidHavePassiveEffects) {
            commitDoubleInvokeEffectsInDEV(root.current, false);
        }
    }

    onCommitRootDevTools(finishedWork.stateNode, renderPriorityLevel);

    if (enableUpdaterTracking) {
        if (isDevToolsPresent) {
            root.memoizedUpdaters.clear();
        }
    }

    if (__DEV__) {
        onCommitRootTestSelector();
    }

    // Always call this before exiting `commitRoot`, to ensure that any
    // additional work on this root is scheduled.
    ensureRootIsScheduled(root, now());

    if (recoverableErrors !== null) {
        // There were errors during this render, but recovered from them without
        // needing to surface it to the UI. We log them here.
        const onRecoverableError = root.onRecoverableError;
        for (let i = 0; i < recoverableErrors.length; i++) {
            const recoverableError = recoverableErrors[i];
            const componentStack = recoverableError.stack;
            const digest = recoverableError.digest;
            onRecoverableError(recoverableError.value, {componentStack, digest});
        }
    }

    if (hasUncaughtError) {
        hasUncaughtError = false;
        const error = firstUncaughtError;
        firstUncaughtError = null;
        throw error;
    }

    // If the passive effects are the result of a discrete render, flush them
    // synchronously at the end of the current task so that the result is
    // immediately observable. Otherwise, we assume that they are not
    // order-dependent and do not need to be observed by external systems, so we
    // can wait until after paint.
    // TODO: We can optimize this by not scheduling the callback earlier. Since we
    // currently schedule the callback in multiple places, will wait until those
    // are consolidated.
    if (includesSomeLane(pendingPassiveEffectsLanes, SyncLane) && root.tag !== LegacyRoot) {
        flushPassiveEffects();
    }

    // Read this again, since a passive effect might have updated it
    remainingLanes = root.pendingLanes;
    if (includesSomeLane(remainingLanes, SyncLane)) {
        if (enableProfilerTimer && enableProfilerNestedUpdatePhase) {
            markNestedUpdateScheduled();
        }

        // Count the number of times the root synchronously re-renders without
        // finishing. If there are too many, it indicates an infinite update loop.
        if (root === rootWithNestedUpdates) {
            nestedUpdateCount++;
        } else {
            nestedUpdateCount = 0;
            rootWithNestedUpdates = root;
        }
    } else {
        nestedUpdateCount = 0;
    }

    // If layout work was scheduled, flush it now.
    flushSyncCallbacks();

    if (__DEV__) {
        if (enableDebugTracing) {
            logCommitStopped();
        }
    }

    if (enableSchedulingProfiler) {
        markCommitStopped();
    }

    return null;
}

function releaseRootPooledCache(root, remainingLanes) {
    if (enableCache) {
        const pooledCacheLanes = (root.pooledCacheLanes &= remainingLanes);
        if (pooledCacheLanes === NoLanes) {
            // None of the remaining work relies on the cache pool. Clear it so
            // subsequent requests get a new cache
            const pooledCache = root.pooledCache;
            if (pooledCache != null) {
                root.pooledCache = null;
                releaseCache(pooledCache);
            }
        }
    }
}

export function flushPassiveEffects() {
    // Returns whether passive effects were flushed.
    // TODO: Combine this check with the one in flushPassiveEFfectsImpl. We should
    // probably just combine the two functions. I believe they were only separate
    // in the first place because we used to wrap it with
    // `Scheduler.runWithPriority`, which accepts a function. But now we track the
    // priority within React itself, so we can mutate the variable directly.
    if (rootWithPendingPassiveEffects !== null) {
        // Cache the root since rootWithPendingPassiveEffects is cleared in
        // flushPassiveEffectsImpl
        const root = rootWithPendingPassiveEffects;
        // Cache and clear the remaining lanes flag; it must be reset since this
        // method can be called from various places, not always from commitRoot
        // where the remaining lanes are known
        const remainingLanes = pendingPassiveEffectsRemainingLanes;
        pendingPassiveEffectsRemainingLanes = NoLanes;

        const renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
        const priority = lowerEventPriority(DefaultEventPriority, renderPriority);
        const prevTransition = ReactCurrentBatchConfig.transition;
        const previousPriority = getCurrentUpdatePriority();

        try {
            ReactCurrentBatchConfig.transition = null;
            setCurrentUpdatePriority(priority);
            return flushPassiveEffectsImpl();
        } finally {
            setCurrentUpdatePriority(previousPriority);
            ReactCurrentBatchConfig.transition = prevTransition;

            // Once passive effects have run for the tree - giving components a
            // chance to retain cache instances they use - release the pooled
            // cache at the root (if there is one)
            releaseRootPooledCache(root, remainingLanes);
        }
    }
    return false;
}

export function enqueuePendingPassiveProfilerEffect(fiber) {
    if (enableProfilerTimer && enableProfilerCommitHooks) {
        pendingPassiveProfilerEffects.push(fiber);
        if (!rootDoesHavePassiveEffects) {
            rootDoesHavePassiveEffects = true;
            scheduleCallback(NormalSchedulerPriority, () => {
                flushPassiveEffects();
                return null;
            });
        }
    }
}

function flushPassiveEffectsImpl() {
    if (rootWithPendingPassiveEffects === null) {
        return false;
    }

    // Cache and clear the transitions flag
    const transitions = pendingPassiveTransitions;
    pendingPassiveTransitions = null;

    const root = rootWithPendingPassiveEffects;
    const lanes = pendingPassiveEffectsLanes;
    rootWithPendingPassiveEffects = null;
    // TODO: This is sometimes out of sync with rootWithPendingPassiveEffects.
    // Figure out why and fix it. It's not causing any known issues (probably
    // because it's only used for profiling), but it's a refactor hazard.
    pendingPassiveEffectsLanes = NoLanes;

    if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
        throw new Error('Cannot flush passive effects while already rendering.');
    }

    if (__DEV__) {
        isFlushingPassiveEffects = true;
        didScheduleUpdateDuringPassiveEffects = false;

        if (enableDebugTracing) {
            logPassiveEffectsStarted(lanes);
        }
    }

    if (enableSchedulingProfiler) {
        markPassiveEffectsStarted(lanes);
    }

    const prevExecutionContext = executionContext;
    executionContext |= CommitContext;

    commitPassiveUnmountEffects(root.current);
    commitPassiveMountEffects(root, root.current, lanes, transitions);

    // TODO: Move to commitPassiveMountEffects
    if (enableProfilerTimer && enableProfilerCommitHooks) {
        const profilerEffects = pendingPassiveProfilerEffects;
        pendingPassiveProfilerEffects = [];
        for (let i = 0; i < profilerEffects.length; i++) {
            const fiber = profilerEffects[i];
            commitPassiveEffectDurations(root, fiber);
        }
    }

    if (__DEV__) {
        if (enableDebugTracing) {
            logPassiveEffectsStopped();
        }
    }

    if (enableSchedulingProfiler) {
        markPassiveEffectsStopped();
    }

    if (__DEV__ && enableStrictEffects) {
        commitDoubleInvokeEffectsInDEV(root.current, true);
    }

    executionContext = prevExecutionContext;

    flushSyncCallbacks();

    if (enableTransitionTracing) {
        const prevPendingTransitionCallbacks = currentPendingTransitionCallbacks;
        const prevRootTransitionCallbacks = root.transitionCallbacks;
        if (prevPendingTransitionCallbacks !== null && prevRootTransitionCallbacks !== null) {
            // TODO(luna) Refactor this code into the Host Config
            // TODO(luna) The end time here is not necessarily accurate
            // because passive effects could be called before paint
            // (synchronously) or after paint (normally). We need
            // to come up with a way to get the correct end time for both cases.
            // One solution is in the host config, if the passive effects
            // have not yet been run, make a call to flush the passive effects
            // right after paint.
            const endTime = now();
            currentPendingTransitionCallbacks = null;

            scheduleCallback(IdleSchedulerPriority, () => processTransitionCallbacks(prevPendingTransitionCallbacks, endTime, prevRootTransitionCallbacks,),);
        }
    }

    if (__DEV__) {
        // If additional passive effects were scheduled, increment a counter. If this
        // exceeds the limit, we'll fire a warning.
        if (didScheduleUpdateDuringPassiveEffects) {
            if (root === rootWithPassiveNestedUpdates) {
                nestedPassiveUpdateCount++;
            } else {
                nestedPassiveUpdateCount = 0;
                rootWithPassiveNestedUpdates = root;
            }
        } else {
            nestedPassiveUpdateCount = 0;
        }
        isFlushingPassiveEffects = false;
        didScheduleUpdateDuringPassiveEffects = false;
    }

    // TODO: Move to commitPassiveMountEffects
    onPostCommitRootDevTools(root);
    if (enableProfilerTimer && enableProfilerCommitHooks) {
        const stateNode = root.current.stateNode;
        stateNode.effectDuration = 0;
        stateNode.passiveEffectDuration = 0;
    }

    return true;
}

export function isAlreadyFailedLegacyErrorBoundary(instance) {
    return (legacyErrorBoundariesThatAlreadyFailed !== null && legacyErrorBoundariesThatAlreadyFailed.has(instance));
}

export function markLegacyErrorBoundaryAsFailed(instance) {
    if (legacyErrorBoundariesThatAlreadyFailed === null) {
        legacyErrorBoundariesThatAlreadyFailed = new Set([instance]);
    } else {
        legacyErrorBoundariesThatAlreadyFailed.add(instance);
    }
}

function prepareToThrowUncaughtError(error) {
    if (!hasUncaughtError) {
        hasUncaughtError = true;
        firstUncaughtError = error;
    }
}

export const onUncaughtError = prepareToThrowUncaughtError;

function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    const errorInfo = createCapturedValueAtFiber(error, sourceFiber);
    const update = createRootErrorUpdate(rootFiber, errorInfo, SyncLane);
    const root = enqueueUpdate(rootFiber, update, SyncLane);
    const eventTime = requestEventTime();
    if (root !== null) {
        markRootUpdated(root, SyncLane, eventTime);
        ensureRootIsScheduled(root, eventTime);
    }
}

export function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error,) {
    if (__DEV__) {
        reportUncaughtErrorInDEV(error);
        setIsRunningInsertionEffect(false);
    }
    if (sourceFiber.tag === HostRoot) {
        // Error was thrown at the root. There is no parent, so the root
        // itself should capture it.
        captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
        return;
    }

    let fiber = null;
    if (skipUnmountedBoundaries) {
        fiber = nearestMountedAncestor;
    } else {
        fiber = sourceFiber.return;
    }

    while (fiber !== null) {
        if (fiber.tag === HostRoot) {
            captureCommitPhaseErrorOnRoot(fiber, sourceFiber, error);
            return;
        } else if (fiber.tag === ClassComponent) {
            const ctor = fiber.type;
            const instance = fiber.stateNode;
            if (typeof ctor.getDerivedStateFromError === 'function' || (typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance))) {
                const errorInfo = createCapturedValueAtFiber(error, sourceFiber);
                const update = createClassErrorUpdate(fiber, errorInfo, SyncLane);
                const root = enqueueUpdate(fiber, update, SyncLane);
                const eventTime = requestEventTime();
                if (root !== null) {
                    markRootUpdated(root, SyncLane, eventTime);
                    ensureRootIsScheduled(root, eventTime);
                }
                return;
            }
        }
        fiber = fiber.return;
    }

    if (__DEV__) {
        // TODO: Until we re-land skipUnmountedBoundaries (see #20147), this warning
        // will fire for errors that are thrown by destroy functions inside deleted
        // trees. What it should instead do is propagate the error to the parent of
        // the deleted tree. In the meantime, do not add this warning to the
        // allowlist; this is only for our internal use.
        console.error('Internal React error: Attempted to capture a commit phase error ' + 'inside a detached tree. This indicates a bug in React. Likely ' + 'causes include deleting the same fiber more than once, committing an ' + 'already-finished tree, or an inconsistent return pointer.\n\n' + 'Error message:\n\n%s', error,);
    }
}

export function pingSuspendedRoot(root, wakeable, pingedLanes) {
    const pingCache = root.pingCache;
    if (pingCache !== null) {
        // The wakeable resolved, so we no longer need to memoize, because it will
        // never be thrown again.
        pingCache.delete(wakeable);
    }

    const eventTime = requestEventTime();
    markRootPinged(root, pingedLanes, eventTime);

    warnIfSuspenseResolutionNotWrappedWithActDEV(root);

    if (workInProgressRoot === root && isSubsetOfLanes(workInProgressRootRenderLanes, pingedLanes)) {
        // Received a ping at the same priority level at which we're currently
        // rendering. We might want to restart this render. This should mirror
        // the logic of whether or not a root suspends once it completes.

        // TODO: If we're rendering sync either due to Sync, Batched or expired,
        // we should probably never restart.

        // If we're suspended with delay, or if it's a retry, we'll always suspend
        // so we can always restart.
        if (workInProgressRootExitStatus === RootSuspendedWithDelay || (workInProgressRootExitStatus === RootSuspended && includesOnlyRetries(workInProgressRootRenderLanes) && now() - globalMostRecentFallbackTime < FALLBACK_THROTTLE_MS)) {
            // Restart from the root.
            prepareFreshStack(root, NoLanes);
        } else {
            // Even though we can't restart right now, we might get an
            // opportunity later. So we mark this render as having a ping.
            workInProgressRootPingedLanes = mergeLanes(workInProgressRootPingedLanes, pingedLanes,);
        }
    }

    ensureRootIsScheduled(root, eventTime);
}

function retryTimedOutBoundary(boundaryFiber, retryLane) {
    // The boundary fiber (a Suspense component or SuspenseList component)
    // previously was rendered in its fallback state. One of the promises that
    // suspended it has resolved, which means at least part of the tree was
    // likely unblocked. Try rendering again, at a new lanes.
    if (retryLane === NoLane) {
        // TODO: Assign this to `suspenseState.retryLane`? to avoid
        // unnecessary entanglement?
        retryLane = requestRetryLane(boundaryFiber);
    }
    // TODO: Special case idle priority?
    const eventTime = requestEventTime();
    const root = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    if (root !== null) {
        markRootUpdated(root, retryLane, eventTime);
        ensureRootIsScheduled(root, eventTime);
    }
}

export function retryDehydratedSuspenseBoundary(boundaryFiber) {
    const suspenseState = boundaryFiber.memoizedState;
    let retryLane = NoLane;
    if (suspenseState !== null) {
        retryLane = suspenseState.retryLane;
    }
    retryTimedOutBoundary(boundaryFiber, retryLane);
}

export function resolveRetryWakeable(boundaryFiber, wakeable) {
    let retryLane = NoLane; // Default
    let retryCache;
    switch (boundaryFiber.tag) {
        case SuspenseComponent:
            retryCache = boundaryFiber.stateNode;
            const suspenseState = boundaryFiber.memoizedState;
            if (suspenseState !== null) {
                retryLane = suspenseState.retryLane;
            }
            break;
        case SuspenseListComponent:
            retryCache = boundaryFiber.stateNode;
            break;
        default:
            throw new Error('Pinged unknown suspense boundary type. ' + 'This is probably a bug in React.',);
    }

    if (retryCache !== null) {
        // The wakeable resolved, so we no longer need to memoize, because it will
        // never be thrown again.
        retryCache.delete(wakeable);
    }

    retryTimedOutBoundary(boundaryFiber, retryLane);
}

// Computes the next Just Noticeable Difference (JND) boundary.
// The theory is that a person can't tell the difference between small differences in time.
// Therefore, if we wait a bit longer than necessary that won't translate to a noticeable
// difference in the experience. However, waiting for longer might mean that we can avoid
// showing an intermediate loading state. The longer we have already waited, the harder it
// is to tell small differences in time. Therefore, the longer we've already waited,
// the longer we can wait additionally. At some point we have to give up though.
// We pick a train model where the next boundary commits at a consistent schedule.
// These particular numbers are vague estimates. We expect to adjust them based on research.
function jnd(timeElapsed) {
    return timeElapsed < 120 ? 120 : timeElapsed < 480 ? 480 : timeElapsed < 1080 ? 1080 : timeElapsed < 1920 ? 1920 : timeElapsed < 3000 ? 3000 : timeElapsed < 4320 ? 4320 : ceil(timeElapsed / 1960) * 1960;
}

export function throwIfInfiniteUpdateLoopDetected() {
    if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
        nestedUpdateCount = 0;
        nestedPassiveUpdateCount = 0;
        rootWithNestedUpdates = null;
        rootWithPassiveNestedUpdates = null;

        throw new Error('Maximum update depth exceeded. This can happen when a component ' + 'repeatedly calls setState inside componentWillUpdate or ' + 'componentDidUpdate. React limits the number of nested updates to ' + 'prevent infinite loops.',);
    }

    if (__DEV__) {
        if (nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT) {
            nestedPassiveUpdateCount = 0;
            rootWithPassiveNestedUpdates = null;

            console.error('Maximum update depth exceeded. This can happen when a component ' + "calls setState inside useEffect, but useEffect either doesn't " + 'have a dependency array, or one of the dependencies changes on ' + 'every render.',);
        }
    }
}

function flushRenderPhaseStrictModeWarningsInDEV() {
    if (__DEV__) {
        ReactStrictModeWarnings.flushLegacyContextWarning();

        if (warnAboutDeprecatedLifecycles) {
            ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings();
        }
    }
}

function commitDoubleInvokeEffectsInDEV(fiber, hasPassiveEffects) {
    if (__DEV__ && enableStrictEffects) {
        // TODO (StrictEffects) Should we set a marker on the root if it contains strict effects
        // so we don't traverse unnecessarily? similar to subtreeFlags but just at the root level.
        // Maybe not a big deal since this is DEV only behavior.

        setCurrentDebugFiberInDEV(fiber);
        invokeEffectsInDev(fiber, MountLayoutDev, invokeLayoutEffectUnmountInDEV);
        if (hasPassiveEffects) {
            invokeEffectsInDev(fiber, MountPassiveDev, invokePassiveEffectUnmountInDEV,);
        }

        invokeEffectsInDev(fiber, MountLayoutDev, invokeLayoutEffectMountInDEV);
        if (hasPassiveEffects) {
            invokeEffectsInDev(fiber, MountPassiveDev, invokePassiveEffectMountInDEV);
        }
        resetCurrentDebugFiberInDEV();
    }
}

function invokeEffectsInDev(firstChild, fiberFlags, invokeEffectFn) {
    if (__DEV__ && enableStrictEffects) {
        // We don't need to re-check StrictEffectsMode here.
        // This function is only called if that check has already passed.

        let current = firstChild;
        let subtreeRoot = null;
        while (current !== null) {
            const primarySubtreeFlag = current.subtreeFlags & fiberFlags;
            if (current !== subtreeRoot && current.child !== null && primarySubtreeFlag !== NoFlags) {
                current = current.child;
            } else {
                if ((current.flags & fiberFlags) !== NoFlags) {
                    invokeEffectFn(current);
                }

                if (current.sibling !== null) {
                    current = current.sibling;
                } else {
                    current = subtreeRoot = current.return;
                }
            }
        }
    }
}

let didWarnStateUpdateForNotYetMountedComponent = null;

export function warnAboutUpdateOnNotYetMountedFiberInDEV(fiber) {
    if (__DEV__) {
        if ((executionContext & RenderContext) !== NoContext) {
            // We let the other warning about render phase updates deal with this one.
            return;
        }

        if (!(fiber.mode & ConcurrentMode)) {
            return;
        }

        const tag = fiber.tag;
        if (tag !== IndeterminateComponent && tag !== HostRoot && tag !== ClassComponent && tag !== FunctionComponent && tag !== ForwardRef && tag !== MemoComponent && tag !== SimpleMemoComponent) {
            // Only warn for user-defined components, not internal ones like Suspense.
            return;
        }

        // We show the whole stack but dedupe on the top component's name because
        // the problematic code almost always lies inside that component.
        const componentName = getComponentNameFromFiber(fiber) || 'ReactComponent';
        if (didWarnStateUpdateForNotYetMountedComponent !== null) {
            if (didWarnStateUpdateForNotYetMountedComponent.has(componentName)) {
                return;
            }
            didWarnStateUpdateForNotYetMountedComponent.add(componentName);
        } else {
            didWarnStateUpdateForNotYetMountedComponent = new Set([componentName]);
        }

        const previousFiber = ReactCurrentFiberCurrent;
        try {
            setCurrentDebugFiberInDEV(fiber);
            console.error("Can't perform a React state update on a component that hasn't mounted yet. " + 'This indicates that you have a side-effect in your render function that ' + 'asynchronously later calls tries to update the component. Move this work to ' + 'useEffect instead.',);
        } finally {
            if (previousFiber) {
                setCurrentDebugFiberInDEV(fiber);
            } else {
                resetCurrentDebugFiberInDEV();
            }
        }
    }
}

let beginWork;
if (__DEV__ && replayFailedUnitOfWorkWithInvokeGuardedCallback) {
    const dummyFiber = null;
    beginWork = (current, unitOfWork, lanes) => {
        // If a component throws an error, we replay it again in a synchronously
        // dispatched event, so that the debugger will treat it as an uncaught
        // error See ReactErrorUtils for more information.

        // Before entering the begin phase, copy the work-in-progress onto a dummy
        // fiber. If beginWork throws, we'll use this to reset the state.
        const originalWorkInProgressCopy = assignFiberPropertiesInDEV(dummyFiber, unitOfWork,);
        try {
            return originalBeginWork(current, unitOfWork, lanes);
        } catch (originalError) {
            if (didSuspendOrErrorWhileHydratingDEV() || (originalError !== null && typeof originalError === 'object' && typeof originalError.then === 'function')) {
                // Don't replay promises.
                // Don't replay errors if we are hydrating and have already suspended or handled an error
                throw originalError;
            }

            // Keep this code in sync with handleError; any changes here must have
            // corresponding changes there.
            resetContextDependencies();
            resetHooksAfterThrow();
            // Don't reset current debug fiber, since we're about to work on the
            // same fiber again.

            // Unwind the failed stack frame
            unwindInterruptedWork(current, unitOfWork, workInProgressRootRenderLanes);

            // Restore the original properties of the fiber.
            assignFiberPropertiesInDEV(unitOfWork, originalWorkInProgressCopy);

            if (enableProfilerTimer && unitOfWork.mode & ProfileMode) {
                // Reset the profiler timer.
                startProfilerTimer(unitOfWork);
            }

            // Run beginWork again.
            invokeGuardedCallback(null, originalBeginWork, null, current, unitOfWork, lanes,);

            if (hasCaughtError()) {
                const replayError = clearCaughtError();
                if (typeof replayError === 'object' && replayError !== null && replayError._suppressLogging && typeof originalError === 'object' && originalError !== null && !originalError._suppressLogging) {
                    // If suppressed, let the flag carry over to the original error which is the one we'll rethrow.
                    originalError._suppressLogging = true;
                }
            }
            // We always throw the original error in case the second render pass is not idempotent.
            // This can happen if a memoized function or CommonJS module doesn't throw after first invocation.
            throw originalError;
        }
    };
} else {
    beginWork = originalBeginWork;
}

let didWarnAboutUpdateInRender = false;
let didWarnAboutUpdateInRenderForAnotherComponent;
if (__DEV__) {
    didWarnAboutUpdateInRenderForAnotherComponent = new Set();
}

function warnAboutRenderPhaseUpdatesInDEV(fiber) {
    if (__DEV__) {
        if (ReactCurrentDebugFiberIsRenderingInDEV && !getIsUpdatingOpaqueValueInRenderPhaseInDEV()) {
            switch (fiber.tag) {
                case FunctionComponent:
                case ForwardRef:
                case SimpleMemoComponent: {
                    const renderingComponentName = (workInProgress && getComponentNameFromFiber(workInProgress)) || 'Unknown';
                    // Dedupe by the rendering component because it's the one that needs to be fixed.
                    const dedupeKey = renderingComponentName;
                    if (!didWarnAboutUpdateInRenderForAnotherComponent.has(dedupeKey)) {
                        didWarnAboutUpdateInRenderForAnotherComponent.add(dedupeKey);
                        const setStateComponentName = getComponentNameFromFiber(fiber) || 'Unknown';
                        console.error('Cannot update a component (`%s`) while rendering a ' + 'different component (`%s`). To locate the bad setState() call inside `%s`, ' + 'follow the stack trace as described in https://reactjs.org/link/setstate-in-render', setStateComponentName, renderingComponentName, renderingComponentName,);
                    }
                    break;
                }
                case ClassComponent: {
                    if (!didWarnAboutUpdateInRender) {
                        console.error('Cannot update during an existing state transition (such as ' + 'within `render`). Render methods should be a pure ' + 'function of props and state.',);
                        didWarnAboutUpdateInRender = true;
                    }
                    break;
                }
            }
        }
    }
}

export function restorePendingUpdaters(root, lanes) {
    if (enableUpdaterTracking) {
        if (isDevToolsPresent) {
            const memoizedUpdaters = root.memoizedUpdaters;
            memoizedUpdaters.forEach((schedulingFiber) => {
                addFiberToLanesMap(root, schedulingFiber, lanes);
            });

            // This function intentionally does not clear memoized updaters.
            // Those may still be relevant to the current commit
            // and a future one (e.g. Suspense).
        }
    }
}

const fakeActCallbackNode = {};

/**
 * 调度回调更新
 */
function scheduleCallback(priorityLevel, callback) {
    // In production, always call Scheduler. This function will be stripped out.
    return Scheduler_scheduleCallback(priorityLevel, callback);
}

function cancelCallback(callbackNode) {
    if (__DEV__ && callbackNode === fakeActCallbackNode) {
        return;
    }
    // In production, always call Scheduler. This function will be stripped out.
    return Scheduler_cancelCallback(callbackNode);
}

function shouldForceFlushFallbacksInDEV() {
    // Never force flush in production. This function should get stripped out.
    return __DEV__ && ReactCurrentActQueue.current !== null;
}

function warnIfUpdatesNotWrappedWithActDEV(fiber) {
    if (__DEV__) {
        if (fiber.mode & ConcurrentMode) {
            if (!isConcurrentActEnvironment()) {
                // Not in an act environment. No need to warn.
                return;
            }
        } else {
            // Legacy mode has additional cases where we suppress a warning.
            if (!isLegacyActEnvironment(fiber)) {
                // Not in an act environment. No need to warn.
                return;
            }
            if (executionContext !== NoContext) {
                // Legacy mode doesn't warn if the update is batched, i.e.
                // batchedUpdates or flushSync.
                return;
            }
            if (fiber.tag !== FunctionComponent && fiber.tag !== ForwardRef && fiber.tag !== SimpleMemoComponent) {
                // For backwards compatibility with pre-hooks code, legacy mode only
                // warns for updates that originate from a hook.
                return;
            }
        }

        if (ReactCurrentActQueue.current === null) {
            const previousFiber = ReactCurrentFiberCurrent;
            try {
                setCurrentDebugFiberInDEV(fiber);
                console.error('An update to %s inside a test was not wrapped in act(...).\n\n' + 'When testing, code that causes React state updates should be ' + 'wrapped into act(...):\n\n' + 'act(() => {\n' + '  /* fire events that update state */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act', getComponentNameFromFiber(fiber),);
            } finally {
                if (previousFiber) {
                    setCurrentDebugFiberInDEV(fiber);
                } else {
                    resetCurrentDebugFiberInDEV();
                }
            }
        }
    }
}

function warnIfSuspenseResolutionNotWrappedWithActDEV(root) {
    if (__DEV__) {
        if (root.tag !== LegacyRoot && isConcurrentActEnvironment() && ReactCurrentActQueue.current === null) {
            console.error('A suspended resource finished loading inside a test, but the event ' + 'was not wrapped in act(...).\n\n' + 'When testing, code that resolves suspended data should be wrapped ' + 'into act(...):\n\n' + 'act(() => {\n' + '  /* finish loading suspended data */\n' + '});\n' + '/* assert on the output */\n\n' + "This ensures that you're testing the behavior the user would see " + 'in the browser.' + ' Learn more at https://reactjs.org/link/wrap-tests-with-act',);
        }
    }
}

export function setIsRunningInsertionEffect(isRunning) {
    if (__DEV__) {
        isRunningInsertionEffect = isRunning;
    }
}
