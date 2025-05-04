/**
 * Diff Utilities
 * 
 * Provides functions for comparing and generating differences between text content
 */

/**
 * Simple line-based diff
 * Returns an array of line differences
 */
export function lineDiff(oldText: string, newText: string): LineDiff[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diffs: LineDiff[] = [];
  
  let i = 0;
  let j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Remaining lines in new text are additions
      diffs.push({
        type: 'add',
        line: j + 1,
        content: newLines[j]
      });
      j++;
    } else if (j >= newLines.length) {
      // Remaining lines in old text are removals
      diffs.push({
        type: 'remove',
        line: i + 1,
        content: oldLines[i]
      });
      i++;
    } else if (oldLines[i] !== newLines[j]) {
      // Lines differ - attempt to find next matching line
      const oldNext = oldLines.slice(i + 1).findIndex(l => l === newLines[j]);
      const newNext = newLines.slice(j + 1).findIndex(l => l === oldLines[i]);
      
      if ((oldNext === -1 || newNext !== -1) && newNext < 3) {
        // Old line removed
        diffs.push({
          type: 'remove',
          line: i + 1,
          content: oldLines[i]
        });
        i++;
      } else {
        // New line added
        diffs.push({
          type: 'add',
          line: j + 1,
          content: newLines[j]
        });
        j++;
      }
    } else {
      // Lines match
      i++;
      j++;
    }
  }
  
  return diffs;
}

/**
 * Generate a unified diff format string
 */
export function unifiedDiff(oldText: string, newText: string, contextLines: number = 3): string {
  const diffs = lineDiff(oldText, newText);
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  let result = '';
  let currentHunk: string[] = [];
  let hunkStart = -1;
  let oldLineCount = 0;
  let newLineCount = 0;
  
  // Process each line
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const diffIndex = diffs.findIndex(d => 
      (d.type === 'remove' && d.line === i + 1) || 
      (d.type === 'add' && d.line === i + 1)
    );
    
    const isDiff = diffIndex !== -1;
    
    // Start a new hunk if we find a diff
    if (isDiff && hunkStart === -1) {
      hunkStart = Math.max(0, i - contextLines);
      // Add context lines
      for (let j = hunkStart; j < i; j++) {
        if (j < oldLines.length) {
          currentHunk.push(' ' + oldLines[j]);
          oldLineCount++;
          newLineCount++;
        }
      }
    }
    
    // Add the diff line
    if (isDiff) {
      const diff = diffs[diffIndex];
      if (diff.type === 'remove') {
        currentHunk.push('-' + oldLines[i]);
        oldLineCount++;
      } else {
        currentHunk.push('+' + newLines[i]);
        newLineCount++;
      }
    } 
    // Add context line if we're in a hunk
    else if (hunkStart !== -1) {
      if (i < oldLines.length) {
        currentHunk.push(' ' + oldLines[i]);
        oldLineCount++;
        newLineCount++;
      }
    }
    
    // Check if we need to close the hunk
    const isLastLine = i === Math.max(oldLines.length, newLines.length) - 1;
    const nextDiffIndex = diffs.findIndex(d => 
      (d.type === 'remove' && d.line > i + 1 && d.line <= i + 1 + contextLines) || 
      (d.type === 'add' && d.line > i + 1 && d.line <= i + 1 + contextLines)
    );
    
    if (hunkStart !== -1 && (isLastLine || nextDiffIndex === -1)) {
      // Add remaining context lines
      const contextEnd = Math.min(i + contextLines, oldLines.length);
      for (let j = i + 1; j < contextEnd; j++) {
        currentHunk.push(' ' + oldLines[j]);
        oldLineCount++;
        newLineCount++;
      }
      
      // Add hunk header and lines to result
      result += `@@ -${hunkStart + 1},${oldLineCount} +${hunkStart + 1},${newLineCount} @@\n`;
      result += currentHunk.join('\n') + '\n';
      
      // Reset hunk
      currentHunk = [];
      hunkStart = -1;
      oldLineCount = 0;
      newLineCount = 0;
    }
  }
  
  return result;
}

/**
 * Get character-level differences between two strings
 */
export function characterDiff(oldText: string, newText: string): { 
  diff: string, 
  changes: number 
} {
  let i = 0;
  const maxLen = Math.min(oldText.length, newText.length);
  
  // Find common prefix
  while (i < maxLen && oldText[i] === newText[i]) {
    i++;
  }
  
  const commonPrefix = oldText.substring(0, i);
  
  // Find common suffix
  let j = 0;
  while (
    j < maxLen - i &&
    oldText[oldText.length - 1 - j] === newText[newText.length - 1 - j]
  ) {
    j++;
  }
  
  const commonSuffix = oldText.substring(oldText.length - j);
  
  const oldDiff = oldText.substring(i, oldText.length - j);
  const newDiff = newText.substring(i, newText.length - j);
  
  // Format the diff
  const formattedDiff = `${commonPrefix}{-${oldDiff}-}{+${newDiff}+}${commonSuffix}`;
  
  return {
    diff: formattedDiff,
    changes: Math.max(oldDiff.length, newDiff.length)
  };
}

/**
 * Interface for line diff result
 */
export interface LineDiff {
  type: 'add' | 'remove';
  line: number;
  content: string;
}

export default {
  lineDiff,
  unifiedDiff,
  characterDiff
};