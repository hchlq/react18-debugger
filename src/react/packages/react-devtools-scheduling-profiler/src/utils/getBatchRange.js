/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import memoize from 'memoize-one';

function unmemoizedGetBatchRange(batchUID, data) {
  const {measures} = data;

  let startTime = 0;
  let stopTime = Infinity;

  let i = 0;

  for (i; i < measures.length; i++) {
    const measure = measures[i];
    if (measure.batchUID === batchUID) {
      startTime = measure.timestamp;
      break;
    }
  }

  for (i; i < measures.length; i++) {
    const measure = measures[i];
    stopTime = measure.timestamp;
    if (measure.batchUID !== batchUID) {
      break;
    }
  }

  return [startTime, stopTime];
}

export const getBatchRange = memoize(unmemoizedGetBatchRange);
