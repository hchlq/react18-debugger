/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  createResponseState as createResponseStateImpl,
  pushTextInstance as pushTextInstanceImpl,
  pushSegmentFinale as pushSegmentFinaleImpl,
  writeStartCompletedSuspenseBoundary as writeStartCompletedSuspenseBoundaryImpl,
  writeStartClientRenderedSuspenseBoundary as writeStartClientRenderedSuspenseBoundaryImpl,
  writeEndCompletedSuspenseBoundary as writeEndCompletedSuspenseBoundaryImpl,
  writeEndClientRenderedSuspenseBoundary as writeEndClientRenderedSuspenseBoundaryImpl,
  HTML_MODE,
} from './ReactDOMServerFormatConfig';

export const isPrimaryRenderer = false;

export function createResponseState(generateStaticMarkup, identifierPrefix) {
  const responseState = createResponseStateImpl(identifierPrefix, undefined);
  return {
    // Keep this in sync with ReactDOMServerFormatConfig
    bootstrapChunks: responseState.bootstrapChunks,
    startInlineScript: responseState.startInlineScript,
    placeholderPrefix: responseState.placeholderPrefix,
    segmentPrefix: responseState.segmentPrefix,
    boundaryPrefix: responseState.boundaryPrefix,
    idPrefix: responseState.idPrefix,
    nextSuspenseID: responseState.nextSuspenseID,
    sentCompleteSegmentFunction: responseState.sentCompleteSegmentFunction,
    sentCompleteBoundaryFunction: responseState.sentCompleteBoundaryFunction,
    sentClientRenderFunction: responseState.sentClientRenderFunction,
    // This is an extra field for the legacy renderer
    generateStaticMarkup,
  };
}

export function createRootFormatContext() {
  return {
    insertionMode: HTML_MODE, // We skip the root mode because we don't want to emit the DOCTYPE in legacy mode.
    selectedValue: null,
  };
}

export {
  getChildFormatContext,
  UNINITIALIZED_SUSPENSE_BOUNDARY_ID,
  assignSuspenseBoundaryID,
  makeId,
  pushStartInstance,
  pushEndInstance,
  pushStartCompletedSuspenseBoundary,
  pushEndCompletedSuspenseBoundary,
  writeStartSegment,
  writeEndSegment,
  writeCompletedSegmentInstruction,
  writeCompletedBoundaryInstruction,
  writeClientRenderBoundaryInstruction,
  writeStartPendingSuspenseBoundary,
  writeEndPendingSuspenseBoundary,
  writePlaceholder,
  writeCompletedRoot,
} from './ReactDOMServerFormatConfig';

import {stringToChunk} from 'react-server/src/ReactServerStreamConfig';

import escapeTextForBrowser from './escapeTextForBrowser';

export function pushTextInstance(target, text, responseState, textEmbedded) {
  if (responseState.generateStaticMarkup) {
    target.push(stringToChunk(escapeTextForBrowser(text)));
    return false;
  } else {
    return pushTextInstanceImpl(target, text, responseState, textEmbedded);
  }
}

export function pushSegmentFinale(
  target,
  responseState,
  lastPushedText,
  textEmbedded,
) {
  if (responseState.generateStaticMarkup) {
    return;
  } else {
    return pushSegmentFinaleImpl(
      target,
      responseState,
      lastPushedText,
      textEmbedded,
    );
  }
}

export function writeStartCompletedSuspenseBoundary(
  destination,
  responseState,
) {
  if (responseState.generateStaticMarkup) {
    // A completed boundary is done and doesn't need a representation in the HTML
    // if we're not going to be hydrating it.
    return true;
  }
  return writeStartCompletedSuspenseBoundaryImpl(destination, responseState);
}
export function writeStartClientRenderedSuspenseBoundary(
  destination,
  responseState,
  // flushing these error arguments are not currently supported in this legacy streaming format.
  errorDigest,
  errorMessage,
  errorComponentStack,
) {
  if (responseState.generateStaticMarkup) {
    // A client rendered boundary is done and doesn't need a representation in the HTML
    // since we'll never hydrate it. This is arguably an error in static generation.
    return true;
  }
  return writeStartClientRenderedSuspenseBoundaryImpl(
    destination,
    responseState,
    errorDigest,
    errorMessage,
    errorComponentStack,
  );
}
export function writeEndCompletedSuspenseBoundary(destination, responseState) {
  if (responseState.generateStaticMarkup) {
    return true;
  }
  return writeEndCompletedSuspenseBoundaryImpl(destination, responseState);
}
export function writeEndClientRenderedSuspenseBoundary(
  destination,
  responseState,
) {
  if (responseState.generateStaticMarkup) {
    return true;
  }
  return writeEndClientRenderedSuspenseBoundaryImpl(destination, responseState);
}
