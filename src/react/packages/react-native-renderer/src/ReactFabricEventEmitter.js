/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {registrationNameModules} from './legacy-events/EventPluginRegistry';
import {batchedUpdates} from './legacy-events/ReactGenericBatching';
import accumulateInto from './legacy-events/accumulateInto';

import {plugins} from './legacy-events/EventPluginRegistry';
import getListener from './ReactNativeGetListener';
import {runEventsInBatch} from './legacy-events/EventBatching';

export {getListener, registrationNameModules as registrationNames};

/**
 * Allows registered plugins an opportunity to extract events from top-level
 * native browser events.
 *
 * @return {*} An accumulation of synthetic events.
 * @internal
 */
function extractPluginEvents(
  topLevelType,
  targetInst,
  nativeEvent,
  nativeEventTarget,
) {
  let events = null;
  const legacyPlugins = plugins;
  for (let i = 0; i < legacyPlugins.length; i++) {
    // Not every plugin in the ordering may be loaded at runtime.
    const possiblePlugin = legacyPlugins[i];
    if (possiblePlugin) {
      const extractedEvents = possiblePlugin.extractEvents(
        topLevelType,
        targetInst,
        nativeEvent,
        nativeEventTarget,
      );
      if (extractedEvents) {
        events = accumulateInto(events, extractedEvents);
      }
    }
  }
  return events;
}

function runExtractedPluginEventsInBatch(
  topLevelType,
  targetInst,
  nativeEvent,
  nativeEventTarget,
) {
  const events = extractPluginEvents(
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget,
  );
  runEventsInBatch(events);
}

export function dispatchEvent(target, topLevelType, nativeEvent) {
  const targetFiber = target;

  let eventTarget = null;
  if (targetFiber != null) {
    const stateNode = targetFiber.stateNode;
    // Guard against Fiber being unmounted
    if (stateNode != null) {
      eventTarget = stateNode.canonical;
    }
  }

  batchedUpdates(function () {
    // Heritage plugin event system
    runExtractedPluginEventsInBatch(
      topLevelType,
      targetFiber,
      nativeEvent,
      eventTarget,
    );
  });
  // React Native doesn't use ReactControlledComponent but if it did, here's
  // where it would do it.
}
