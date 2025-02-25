/**
 * Utility functions and data for writing prompts and character sets
 */

// Basic character sets
export const characterSets = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  basicPunctuation: ".,?!:;",
  extendedPunctuation: "@#$%&*()_+-=[]{}\\|/<>\"'`~"
}

// Group characters by frequency in English language
export const frequencyGroups = {
  highFrequency: "etaoinsrhldcu", // Most common letters
  mediumFrequency: "mfpgwybvk", // Medium frequency letters
  lowFrequency: "xjqz" // Least common letters
}

// Groups of similar characters (useful for practice)
export const similarCharacterGroups = {
  roundLetters: "oecapqd",
  tallLetters: "bdfhklt",
  descendingLetters: "gjpqy",
  straightLetters: "ilvmwnz",
  curvedLetters: "cefghosuz"
}

/**
 * Get a set of characters based on options
 */
export function getCharacterSet(options: {
  includeLowercase?: boolean
  includeUppercase?: boolean
  includeNumbers?: boolean
  includeBasicPunctuation?: boolean
  includeExtendedPunctuation?: boolean
}): string {
  const {
    includeLowercase = true,
    includeUppercase = false,
    includeNumbers = false,
    includeBasicPunctuation = false,
    includeExtendedPunctuation = false
  } = options

  let characters = ""

  if (includeLowercase) characters += characterSets.lowercase
  if (includeUppercase) characters += characterSets.uppercase
  if (includeNumbers) characters += characterSets.numbers
  if (includeBasicPunctuation) characters += characterSets.basicPunctuation
  if (includeExtendedPunctuation)
    characters += characterSets.extendedPunctuation

  return characters
}

/**
 * Writing prompts by category
 */
export const writingPrompts = {
  // Pangrams (sentences that use every letter of the alphabet)
  pangrams: [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "Amazingly few discotheques provide jukeboxes.",
    "How vexingly quick daft zebras jump!"
  ],

  // Prompts that focus on lowercase letters
  lowercase: [
    "minimum wine gives us warmth in winter",
    "seven zany elephants jumped quickly over the fence",
    "my favorite jazz music plays on the radio every evening"
  ],

  // Prompts that focus on uppercase letters
  uppercase: [
    "CAPITAL LETTERS ARE USED AT THE START OF SENTENCES",
    "NEW YORK AND LONDON ARE MAJOR CITIES",
    "JFK AIRPORT IS LOCATED IN QUEENS"
  ],

  // Prompts that focus on numbers
  numbers: [
    "The code to unlock the safe is 7294-1586.",
    "In 2023, there were 365 days just like in most years.",
    "My phone number changed to 555-0123 last month."
  ],

  // Prompts that focus on punctuation
  punctuation: [
    "Wait! Did you hear that? I'm not sure what it was.",
    "Here's a list: apples, oranges, bananas, and grapes.",
    "The email address is johndoe@example.com (not case-sensitive)."
  ],

  // Prompts that focus on difficult letter combinations
  challenging: [
    "She sells seashells by the seashore.",
    "Unique New York, unique New York, you know you need unique New York.",
    "Six sticky skeletons skipped through the streets."
  ]
}

/**
 * Get writing prompts based on which character types to include
 */
export function getWritingPrompts(options: {
  includeLowercase?: boolean
  includeUppercase?: boolean
  includeNumbers?: boolean
  includePunctuation?: boolean
  count?: number
}): string[] {
  const {
    includeLowercase = true,
    includeUppercase = false,
    includeNumbers = false,
    includePunctuation = false,
    count = 3
  } = options

  let availablePrompts: string[] = []

  // Always include pangrams as they're comprehensive
  availablePrompts = availablePrompts.concat(writingPrompts.pangrams)

  if (includeLowercase) {
    availablePrompts = availablePrompts.concat(writingPrompts.lowercase)
  }

  if (includeUppercase) {
    availablePrompts = availablePrompts.concat(writingPrompts.uppercase)
  }

  if (includeNumbers) {
    availablePrompts = availablePrompts.concat(writingPrompts.numbers)
  }

  if (includePunctuation) {
    availablePrompts = availablePrompts.concat(writingPrompts.punctuation)
  }

  // Add challenging prompts if we're including lowercase (they focus on lowercase)
  if (includeLowercase) {
    availablePrompts = availablePrompts.concat(writingPrompts.challenging)
  }

  // Shuffle the prompts
  const shuffled = [...availablePrompts].sort(() => 0.5 - Math.random())

  // Return the requested number (or all if count is greater than available)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Generate prompts that ensure coverage of all characters in a set
 */
export function generateComprehensivePrompts(characterSet: string): string[] {
  // This is a simplified implementation
  // In a real-world scenario, you might want to use a more sophisticated algorithm
  // to generate sentences that cover all characters evenly

  // For now, we'll just ensure we have prompts that collectively cover all characters
  const result: string[] = []

  // Add pangrams first as they're comprehensive for letters
  result.push(...writingPrompts.pangrams)

  // If we need numbers, add number-focused prompts
  if (/\d/.test(characterSet)) {
    result.push(...writingPrompts.numbers)
  }

  // If we need punctuation, add punctuation-focused prompts
  if (/[^\w\s]/.test(characterSet)) {
    result.push(...writingPrompts.punctuation)
  }

  return result
}

/**
 * Extract unique characters from a string
 */
export function getUniqueCharacters(text: string): string {
  return [...new Set(text.split(""))].join("")
}

/**
 * Check if a set of prompts covers all characters in a character set
 */
export function checkPromptCoverage(
  prompts: string[],
  characterSet: string
): {
  covered: string
  missing: string
} {
  const allText = prompts.join("")
  const uniqueChars = new Set(allText.split(""))

  const covered = [...characterSet]
    .filter(char => uniqueChars.has(char))
    .join("")
  const missing = [...characterSet]
    .filter(char => !uniqueChars.has(char))
    .join("")

  return { covered, missing }
}
