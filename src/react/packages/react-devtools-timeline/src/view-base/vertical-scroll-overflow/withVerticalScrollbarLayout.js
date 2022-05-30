/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

/**
 * Assumes {@param layout} will only contain 2 views.
 */
export const withVerticalScrollbarLayout = (layout, containerFrame) => {
  const [contentLayoutInfo, scrollbarLayoutInfo] = layout;

  const desiredContentSize = contentLayoutInfo.view.desiredSize();
  const shouldShowScrollbar =
    desiredContentSize.height > containerFrame.size.height;
  const scrollbarWidth = shouldShowScrollbar
    ? scrollbarLayoutInfo.view.desiredSize().width
    : 0;

  const laidOutContentLayoutInfo = {
    ...contentLayoutInfo,
    frame: {
      origin: contentLayoutInfo.view.frame.origin,
      size: {
        width: containerFrame.size.width - scrollbarWidth,
        height: containerFrame.size.height,
      },
    },
  };
  const laidOutScrollbarLayoutInfo = {
    ...scrollbarLayoutInfo,
    frame: {
      origin: {
        x:
          laidOutContentLayoutInfo.frame.origin.x +
          laidOutContentLayoutInfo.frame.size.width,
        y: containerFrame.origin.y,
      },
      size: {
        width: scrollbarWidth,
        height: containerFrame.size.height,
      },
    },
  };

  return [laidOutContentLayoutInfo, laidOutScrollbarLayoutInfo];
};
