import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import wrapAnsi from 'wrap-ansi';

interface ScrollableBoxProps {
  content: string;
  height?: number; // Fixed height if provided
  maxHeight?: number; // Max height if height is not provided
  width: number;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  title?: string;
  titleColor?: string;
}

export const ScrollableBox: React.FC<ScrollableBoxProps> = ({
  content,
  height,
  maxHeight,
  width,
  borderColor = 'gray',
  borderStyle = 'round',
  title,
  titleColor = 'white',
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  // Improved wrapping using wrap-ansi to preserve indentation and spaces
  const lines = useMemo(() => {
    const wrapWidth = width - 6; // Padding + Borders + Scrollbar space
    // wrap-ansi preserves newlines and handles ANSI codes
    const wrapped = wrapAnsi(content, wrapWidth, { hard: true, trim: false });
    return wrapped.split('\n');
  }, [content, width]);

  const borderOverhead = 2;
  const titleOverhead = title ? 2 : 0;
  const totalRequiredHeight = lines.length + borderOverhead + titleOverhead;

  let finalHeight = height || totalRequiredHeight;
  if (maxHeight && !height) {
    finalHeight = Math.min(totalRequiredHeight, maxHeight);
  }

  const visibleHeight = finalHeight - borderOverhead - titleOverhead;
  const maxScroll = Math.max(0, lines.length - visibleHeight);

  useEffect(() => {
    setScrollTop(0);
  }, [content]);

  useInput((input, key) => {
    // Basic Navigation
    if (key.upArrow || input === 'k') {
      setScrollTop((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === 'j') {
      setScrollTop((prev) => Math.min(maxScroll, prev + 1));
    }

    // Page Navigation
    if (key.pageUp || (key.ctrl && input === 'u')) {
      setScrollTop((prev) => Math.max(0, prev - Math.floor(visibleHeight / 2)));
    }
    if (key.pageDown || (key.ctrl && input === 'd')) {
      setScrollTop((prev) => Math.min(maxScroll, prev + Math.floor(visibleHeight / 2)));
    }

    // Extremes
    if (input === 'g') {
      setScrollTop(0);
    }
    if (input === 'G') {
      setScrollTop(maxScroll);
    }
  });

  const visibleLines = lines.slice(scrollTop, scrollTop + visibleHeight);

  // Scrollbar calculation
  const scrollbarHeight = Math.max(0, visibleHeight);
  const thumbHeight = lines.length > 0 ? Math.max(1, Math.floor((visibleHeight / lines.length) * scrollbarHeight)) : 0;
  const thumbPos = maxScroll > 0 ? Math.floor((scrollTop / maxScroll) * (scrollbarHeight - thumbHeight)) : 0;

  return (
    <Box
      borderColor={borderColor}
      borderStyle={borderStyle}
      flexDirection='column'
      height={finalHeight}
      paddingX={1}
      width={width}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={titleColor}>
            {title}
          </Text>
        </Box>
      )}

      <Box flexDirection='row' flexGrow={1} width='100%'>
        {/* Content Area */}
        <Box flexDirection='column' flexGrow={1} overflow='hidden'>
          {visibleLines.map((line, i) => (
            <Text key={i} wrap='truncate-end'>
              {line || ' '}
            </Text>
          ))}
          {visibleLines.length === 0 && (
            <Text dimColor italic>
              No content.
            </Text>
          )}
        </Box>

        {/* Scrollbar Track */}
        {maxScroll > 0 && (
          <Box flexDirection='column' marginLeft={1} width={1}>
            {Array.from({ length: scrollbarHeight }).map((_, i) => {
              const isThumb = i >= thumbPos && i < thumbPos + thumbHeight;
              return (
                <Text color={isThumb ? titleColor : 'gray'} key={i}>
                  {isThumb ? '┃' : '│'}
                </Text>
              );
            })}
          </Box>
        )}
      </Box>

      {maxScroll > 0 && (
        <Box justifyContent='center' marginTop={0}>
          <Text color='gray' dimColor>
            {scrollTop + 1}-{Math.min(scrollTop + visibleHeight, lines.length)} of {lines.length} • [j/k/g/G]
          </Text>
        </Box>
      )}
    </Box>
  );
};
